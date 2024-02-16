import AsyncStorage from '@react-native-async-storage/async-storage';

enum StorageTag {
  IdAlias,
  EncryptedIdMessage,
  WalletAddress,
  IdCommitment
}

export type Identity = {
  idAlias: string | null,
  encryptedIdMessage: string | null,
  walletAddress: string | null,
  idCommitment: bigint | null
}

export class DataService {
  static async persistIdentityData(
    idAlias: string,
    encryptedIdMessageHex: string,
    idCommitment: bigint,
    address: string
  ) {
    AsyncStorage.setItem(StorageTag[StorageTag.IdAlias], idAlias);
    AsyncStorage.setItem(StorageTag[StorageTag.EncryptedIdMessage], encryptedIdMessageHex);
    AsyncStorage.setItem(StorageTag[StorageTag.IdCommitment], idCommitment.toString());
    AsyncStorage.setItem(StorageTag[StorageTag.WalletAddress], address);
  }
  
  static async clearIdentityData() {
    AsyncStorage.removeItem(StorageTag[StorageTag.IdAlias]);
    AsyncStorage.removeItem(StorageTag[StorageTag.EncryptedIdMessage]);
    AsyncStorage.removeItem(StorageTag[StorageTag.IdCommitment]);
    AsyncStorage.removeItem(StorageTag[StorageTag.WalletAddress]);
  } 

  static async getIdentity(): Promise<Identity> {
    const idCommitmentString: string | null = await AsyncStorage.getItem(StorageTag[StorageTag.IdCommitment]);
    return {
      idAlias: await AsyncStorage.getItem(StorageTag[StorageTag.IdAlias]),
      encryptedIdMessage: await AsyncStorage.getItem(StorageTag[StorageTag.EncryptedIdMessage]),
      idCommitment: idCommitmentString ? BigInt(idCommitmentString) : null,
      walletAddress: await AsyncStorage.getItem(StorageTag[StorageTag.WalletAddress])
    }
  }
}