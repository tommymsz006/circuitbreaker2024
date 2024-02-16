import React, { useState } from 'react';
import { NativeModules } from 'react-native';

import {
  Center,
  Button,
  ButtonText,
  ButtonIcon,
  ButtonSpinner,
  AddIcon,
} from '@gluestack-ui/themed';

// Import the crypto getRandomValues shim (**BEFORE** the shims)
import "react-native-get-random-values";
// Import the the ethers shims (**BEFORE** ethers)
import "@ethersproject/shims";

// Import Semaphore components
import { Identity } from "@semaphore-protocol/identity";

// Import others
import { ethers } from "ethers";
import { PrivacyAccount } from '../builder/privacyAccount';

import { DataService } from "../services/DataService";

type CreateIdentityProps = {
  onRefresh(): void
}

export function CreateIdentityButton(props: CreateIdentityProps): JSX.Element {
  const [isInProgress, setIsInProgress] = useState(false);

  const onPress = async() => {
    setIsInProgress(true);
    console.log('We will invoke identity creation here..!');
    
    const {SemaphoreEnclaveModule} = NativeModules;
    console.log(SemaphoreEnclaveModule);

    const idAlias = 'account.001';
    
    console.log('Try to authenticate');
    await SemaphoreEnclaveModule.authenticate(idAlias); 
    console.log('Authentication invoked');

    // deterministically create identity from a secret message
    let idMessage = await SemaphoreEnclaveModule.createSecuredIdMessage(idAlias);
    console.log(`An identity string for alias: ${idAlias} has been generated:`);
    console.log(`Raw: '${idMessage.idMessageHex}', Encrypted: '${idMessage.encryptedIdMessageHex}'`);
    const identity = new Identity(btoa(String.fromCharCode(...ethers.utils.arrayify(idMessage.idMessageHex)))); // base64-encoded string
    console.log(`Trapdoor: ${identity.trapdoor}`);
    console.log(`Nullifier: ${identity.nullifier}`);
    console.log(`Commitment: ${identity.commitment}`);

    // initialize a smart contract wallet on chain and obtain the address
    if (process.env.ERC4337_ACCOUNT_SIGNING_KEY && process.env.NODE_RPC_URL) {
      console.log(`We're about to create a new smart contract wallet via node RPC '${process.env.NODE_RPC_URL}' with factory address '${process.env.PRIVACY_ACCOUNT_FACTORY_ADDRESS}'`);
      const opts = process.env.PRIVACY_ACCOUNT_FACTORY_ADDRESS ? { factory: process.env.PRIVACY_ACCOUNT_FACTORY_ADDRESS } : {};
      const account = await PrivacyAccount.init(
        new ethers.Wallet(process.env.ERC4337_ACCOUNT_SIGNING_KEY),
        process.env.NODE_RPC_URL,
        idMessage.encryptedIdMessageHex,
        identity.commitment,
        opts
      );
      const address = account.getSender();
      console.log(`Wallet address is ${address}`);

      // persist the data
      await DataService.persistIdentityData(idAlias, idMessage.encryptedIdMessageHex, identity.commitment, address)
    } else {
      console.error("No default signing key and/or node RPC address defined")
    }

    props.onRefresh();

    setIsInProgress(false);
  };

  return (
    <Center>
      <Button
        size="md"
        variant="solid"
        action="primary"
        isDisabled={isInProgress}
        isFocusVisible={false}
        onPress={onPress}
      >
        <ButtonIcon as={AddIcon} />
        <ButtonText> Identity</ButtonText>
        <ButtonSpinner animating={isInProgress} hidesWhenStopped={true}/>
      </Button>
    </Center>
  );
};
