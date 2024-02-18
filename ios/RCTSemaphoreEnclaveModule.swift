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

extension String {
  func fromHexStringToData() -> Data? {
    var data = Data(capacity: count / 2)
    
    let regex = try! NSRegularExpression(pattern: "[0-9a-f]{1,2}", options: .caseInsensitive)
    // ignore first 2 characters ("0x")
    regex.enumerateMatches(in: self, range: NSRange(self.index(startIndex, offsetBy: 2)..., in: self)) { match, _, _ in
      let byteString = (self as NSString).substring(with: match!.range)
      let num = UInt8(byteString, radix: 16)!
      data.append(num)
    }
    
    guard data.count > 0 else { return nil }
    
    return data
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
        print("[RCTSemaphoreEnclaveModule.createKeyPairAndEncryptData()] Begin")
        
        try deleteKeyFromIdAliasIfExists(idAlias)
        
        let access = SecAccessControlCreateWithFlags(
          kCFAllocatorDefault,
          kSecAttrAccessibleWhenUnlockedThisDeviceOnly, // kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
          [.privateKeyUsage, .biometryAny],
          nil
        )!
        
        let tag = (RCTSemaphoreEnclaveModule.TAG_PREFIX + (idAlias as String)).data(using: .utf8)!
        var attributes: [String: Any] = [
          kSecClass as String             : kSecClassKey,
          kSecAttrKeyType as String       : kSecAttrKeyTypeECSECPrimeRandom,   // kSecAttrKeyTypeECSECPrimeRandom kSecAttrKeyTypeEC
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
        print("[RCTSemaphoreEnclaveModule.createKeyPairAndEncryptData()] Attempt to create a key pair")
        var error: Unmanaged<CFError>?
        guard let privateKey = SecKeyCreateRandomKey(attributes as CFDictionary, &error) else {
          throw error!.takeRetainedValue() as Error
        }
        
        /// extract public key
        guard let publicKey = SecKeyCopyPublicKey(privateKey) else {
          throw RCTSemaphoreEnclaveError.customError("Public key cannot be extracted")
        }
        print("[RCTSemaphoreEnclaveModule.createKeyPairAndEncryptData()] Successful to create a key pair")
        
        /// check if algorithm is supported
        guard SecKeyIsAlgorithmSupported(publicKey, .encrypt, RCTSemaphoreEnclaveModule.ENCRYPTION_ALGORITHM) else {
          throw RCTSemaphoreEnclaveError.customError("The given algorithm is not supported")
        }
        
        /// encrypt the given piece of data
        let cipherText = SecKeyCreateEncryptedData(publicKey, RCTSemaphoreEnclaveModule.ENCRYPTION_ALGORITHM, plainText as CFData, &error)
        guard cipherText != nil else {
          throw error!.takeRetainedValue() as Error
        }
        
        /*
        /// 1) try to decrypt right away
        guard SecKeyIsAlgorithmSupported(privateKey, .decrypt, RCTSemaphoreEnclaveModule.ENCRYPTION_ALGORITHM) else {
          throw RCTSemaphoreEnclaveError.customError("The given algorithm is not supported")
        }
        print("[RCTSemaphoreEnclaveModule.createKeyPairAndEncryptData()] Decryption algorithm supported")
        
        let plainText1 = SecKeyCreateDecryptedData(privateKey, RCTSemaphoreEnclaveModule.ENCRYPTION_ALGORITHM, cipherText!, &error)
        guard plainText1 != nil else {
          throw error!.takeRetainedValue() as Error
        }
        print((plainText1! as Data).toHexString() == plainText.toHexString())
        */
        
        /// 2) try to decrypt right away using key reference
        /*
        let privateKey2: SecKey = try getKeyRefFromIdAlias(idAlias)
        let privateKey3: SecKey = try getKeyRefFromIdAlias(idAlias)
        
        let privateKeyER = (SecKeyCopyExternalRepresentation(privateKey, &error)! as Data).toHexString()
        let privateKeyER2 = (SecKeyCopyExternalRepresentation(privateKey2, &error)! as Data).toHexString()
        let privateKeyER3 = (SecKeyCopyExternalRepresentation(privateKey3, &error)! as Data).toHexString()
        
        try deleteKeyFromIdAliasIfExists(idAlias)
        try deleteKeyFromIdAliasIfExists(idAlias)
        let privateKey4 = SecKeyCreateRandomKey(attributes as CFDictionary, &error)
        let privateKeyER4 = (SecKeyCopyExternalRepresentation(privateKey4!, &error)! as Data).toHexString()
        
        let privateKey5: SecKey = try getKeyRefFromIdAlias(idAlias)
        let privateKeyER5 = (SecKeyCopyExternalRepresentation(privateKey5, &error)! as Data).toHexString()
        */
        
        /*
        let plainText2 = try decryptData(idAlias, cipherText! as Data)
        guard cipherText != nil else {
          throw error!.takeRetainedValue() as Error
        }
        print(plainText2.toHexString() == plainText.toHexString())
         */
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
    
    /// retrieve secured identity message from encrypted data with incoming alias
    @objc(retrieveSecuredIdMessage:encryptedDataHex:resolver:rejecter:)
    func retrieveSecuredIdMessage(
      _ idAlias: NSString,
      encryptedDataHex: NSString,
      resolver resolve: RCTPromiseResolveBlock,
      rejecter reject: RCTPromiseRejectBlock
    ) -> Void {
      do {
        let decryptedData = try decryptData(idAlias, (encryptedDataHex as String).fromHexStringToData()!)
        resolve(decryptedData.toHexString())
      } catch let error {
        reject(nil, error.localizedDescription, error)
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
        kSecAttrKeyType as String               : kSecAttrKeyTypeECSECPrimeRandom,   // kSecAttrKeyTypeECSECPrimeRandom kSecAttrKeyTypeEC
        kSecReturnRef as String                 : true,
        kSecUseAuthenticationContext as String  : laContext
      ]
      
      print("[RCTSemaphoreEnclaveModule.getKeyRefFromIdAlias()] Created query attributes")
      var item: CFTypeRef?
      let status = SecItemCopyMatching(query as CFDictionary, &item)
      guard status == errSecSuccess else {
        if #available(iOS 11.3, *) {
          throw RCTSemaphoreEnclaveError.customError(SecCopyErrorMessageString(status, nil)! as String + " (" + String(status) + ")")
        } else {
          throw RCTSemaphoreEnclaveError.customError("Error when retrieving key ref with error code: " + String(status))
        }
      }
      
      return (item as! SecKey)
    }
    
    /// private function to delete key from incoming alias
    private func deleteKeyFromIdAliasIfExists(_ idAlias: NSString) throws -> Void {
      print("[RCTSemaphoreEnclaveModule.deleteKeyFromIdAliasIfExists()] Begin")
      let tag = (RCTSemaphoreEnclaveModule.TAG_PREFIX + (idAlias as String)).data(using: .utf8)!
      let query: [String: Any] = [
        kSecClass as String                     : kSecClassKey,
        kSecAttrKeyClass as String              : kSecAttrKeyClassPrivate,
        kSecAttrApplicationTag as String        : tag,
        kSecAttrKeyType as String               : kSecAttrKeyTypeECSECPrimeRandom,   // kSecAttrKeyTypeECSECPrimeRandom kSecAttrKeyTypeEC
      ]
      
      print("[RCTSemaphoreEnclaveModule.deleteKeyFromIdAliasIfExists()] Created query attributes")
      let status = SecItemDelete(query as CFDictionary)
      guard status == errSecSuccess || status == errSecItemNotFound else {
        if #available(iOS 11.3, *) {
          throw RCTSemaphoreEnclaveError.customError(SecCopyErrorMessageString(status, nil)! as String + " (" + String(status) + ")")
        } else {
          throw RCTSemaphoreEnclaveError.customError("Error when deleting key ref with error code: " + String(status))
        }
      }
    }
    
    
    /// private function to decrypt secured identity message from encrypted data
    private func decryptData(
      _ idAlias: NSString,
      _ cipherText: Data
    ) throws -> Data {
      print("[RCTSemaphoreEnclaveModule.decryptData()] Begin")
      let keyRef = try getKeyRefFromIdAlias(idAlias)
      
      guard SecKeyIsAlgorithmSupported(keyRef!, .decrypt, RCTSemaphoreEnclaveModule.ENCRYPTION_ALGORITHM) else {
        throw RCTSemaphoreEnclaveError.customError("The given algorithm is not supported")
      }
      print("[RCTSemaphoreEnclaveModule.decryptData()] Algorithm supported")
      
      var error: Unmanaged<CFError>?
      let plainText = SecKeyCreateDecryptedData(keyRef!, RCTSemaphoreEnclaveModule.ENCRYPTION_ALGORITHM, cipherText as CFData, &error)
      guard plainText != nil else {
        throw error!.takeRetainedValue() as Error
      }
      
      return (plainText! as Data)
    }
  }
}
