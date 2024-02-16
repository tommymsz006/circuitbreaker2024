//
//  RCTSemaphoreEnclaveModule.swift
//  circuitbreaker2024
//
//  Created by Tommy Lee on 13/2/2024.
//

import Foundation
import LocalAuthentication

extension Data {
  func toHexString() -> String {
    return "0x" + self.map { String(format: "%02hhx", $0) }.joined()
  }
}

@objc(RCTSemaphoreEnclaveModule)
class RCTSemaphoreEnclaveModule: NSObject {
  
  static let ENCRYPTION_ALGORITHM: SecKeyAlgorithm = .eciesEncryptionStandardX963SHA256AESGCM
  static let TAG_PREFIX: String = "com.circuitbreaker2024."
  
  /// prepare a secured, randomized identity string
  @objc(createSecuredIdMessage:resolver:rejecter:)
  func createSecuredIdMessage(
    _ idAlias: NSString,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) -> Void {
    var bytes = [Int8](repeating: 0, count: 32)
    let status = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes) // create random bytes
    
    if status == errSecSuccess {
      let byteData = Data(bytes: bytes, count: bytes.count)
      do {
        let encryptedData = try createKeyPairAndEncryptData(idAlias, byteData)
        resolve(["idMessageHex": byteData.toHexString(), "encryptedIdMessageHex": encryptedData.toHexString()])
      } catch let error {
        reject(nil, error.localizedDescription, error)
      }
    } else {
      if #available(iOS 11.3, *) {
        reject(nil, SecCopyErrorMessageString(status, nil) as String?, nil)
      } else {
        reject(nil, String(status), nil)
      }
    }
  }
  
  /// internal function to create key pair
  private func createKeyPairAndEncryptData(
    _ idAlias: NSString,
    _ plainText: Data) throws -> Data {
    let access = SecAccessControlCreateWithFlags(
      kCFAllocatorDefault,
      kSecAttrAccessibleWhenUnlockedThisDeviceOnly, // kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
      [.privateKeyUsage, .biometryAny],
      nil
    )!
    
    let tag = (RCTSemaphoreEnclaveModule.TAG_PREFIX + (idAlias as String)).data(using: .utf8)!
    var attributes: [String: Any] = [
      kSecClass as String             : kSecClassKey,
      kSecAttrKeyType as String       : kSecAttrKeyTypeEC,  // kSecAttrKeyTypeECSECPrimeRandom
      kSecAttrKeySizeInBits as String : 256,
      kSecPrivateKeyAttrs as String   : [
        kSecAttrIsPermanent as String         : true,
        kSecUseAuthenticationUI as String     : kSecUseAuthenticationUIAllow,
        kSecAttrApplicationTag as String      : tag,
        kSecAttrAccessControl as String       : access
      ]
    ]

    #if !targetEnvironment(simulator)
      // actual device
      attributes[kSecAttrTokenID as String] = kSecAttrTokenIDSecureEnclave
    #endif

    /// create a randomized private key
    var error: Unmanaged<CFError>?
    guard let privateKey = SecKeyCreateRandomKey(attributes as CFDictionary, &error) else {
      throw error!.takeRetainedValue() as Error
    }
    
    /// extract public key
    guard let publicKey = SecKeyCopyPublicKey(privateKey) else {
      throw RCTSemaphoreEnclaveError.customError("Public key cannot be extracted")
    }
    
    /// check if algorithm is supported
    guard SecKeyIsAlgorithmSupported(publicKey, .encrypt, RCTSemaphoreEnclaveModule.ENCRYPTION_ALGORITHM) else {
      throw RCTSemaphoreEnclaveError.customError("The given algorithm is not supported")
    }

    /// encrypt the given piece of data
    let cipherText = SecKeyCreateEncryptedData(publicKey, RCTSemaphoreEnclaveModule.ENCRYPTION_ALGORITHM, plainText as CFData, &error)
    guard cipherText != nil else {
      throw error!.takeRetainedValue() as Error
    }
    
      return cipherText! as Data
  }
  
  /// authenticate with biometric method
  @objc(authenticate:resolver:rejecter:)
  func authenticate(
    _ idAlias: NSString,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) -> Void {
    let context = LAContext()
    var error: NSError?

    if context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) {
      let reason = "Authenticate to proceed"

      context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason) {
        [weak self] (success, authenticationError) in

        if success {
          resolve(true)
        } else {
          reject(nil, "It's failed to authenticate", nil)
        }
      }
    } else {
      // no biometry
      reject(nil, "No biometrics authentication method is available", nil)
    }
  }
  
  /// private function to get key reference from incoming alias
  private func getKeyRefFromIdAlias(_ idAlias: NSString) throws -> SecKey! {
    print("[RCTSemaphoreEnclaveModule.getKeyRefFromIdAlias()] Begin")
    let laContext = LAContext()
    laContext.localizedReason = "Unlock keys"
    
    let tag = (RCTSemaphoreEnclaveModule.TAG_PREFIX + (idAlias as String)).data(using: .utf8)!
    let query: [String: Any] = [
      kSecClass as String                     : kSecClassKey,
      kSecAttrKeyClass as String              : kSecAttrKeyClassPrivate,
      kSecAttrApplicationTag as String        : tag,
      kSecAttrKeyType as String               : kSecAttrKeyTypeEC,  // kSecAttrKeyTypeECSECPrimeRandom
      kSecReturnRef as String                 : true,
      kSecUseAuthenticationContext as String  : laContext
    ]
    
    print("[RCTSemaphoreEnclaveModule.getKeyRefFromIdAlias()] Created query attributes")
    var item: CFTypeRef?
    let status = SecItemCopyMatching(query as CFDictionary, &item)
    guard status == errSecSuccess else {
      if #available(iOS 11.3, *) {
        throw RCTSemaphoreEnclaveError.customError(SecCopyErrorMessageString(status, nil)! as String)
      } else {
        throw RCTSemaphoreEnclaveError.customError("Error when retrieving key handle with error code: " + String(status))
      }
    }
    
    return (item as! SecKey)
  }
  
  /// private function to get public key for encryption
  private func getPublicKeyFromIdAlias(_ idAlias: NSString) throws -> SecKey {
    print("[RCTSemaphoreEnclaveModule.getPublicKeyFromIdAlias()] Begin")
    let keyRef = try getKeyRefFromIdAlias(idAlias)
    guard let publicKey = SecKeyCopyPublicKey(keyRef!) else {
      throw RCTSemaphoreEnclaveError.customError("Unable to retrieve public key from private key")
    }
    
    return publicKey
  }
  /*
  /// private function to encrypt data
  private func encryptData(
    idAlias: NSString,
    plainText: CFData
  ) throws -> String {
    print("[RCTSemaphoreEnclaveModule.encryptData()] Begin")
    let publicKey: SecKey = try getPublicKeyFromIdAlias(idAlias)
    
    guard SecKeyIsAlgorithmSupported(publicKey, .encrypt, RCTSemaphoreEnclaveModule.ENCRYPTION_ALGORITHM) else {
      throw RCTSemaphoreEnclaveError.customError("The given algorithm is not supported")
    }

    print("[RCTSemaphoreEnclaveModule.encryptData()] Algorithm supported")
    var error: Unmanaged<CFError>?
    let cipherText = SecKeyCreateEncryptedData(publicKey, RCTSemaphoreEnclaveModule.ENCRYPTION_ALGORITHM, plainText, &error)
    guard cipherText != nil else {
      throw error!.takeRetainedValue() as Error
    }
    
    return (cipherText! as Data).base64EncodedString()
  }
  */
}
