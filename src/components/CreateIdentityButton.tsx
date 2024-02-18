import React, { useState } from 'react';

import {
  Center,
  Button,
  ButtonText,
  ButtonIcon,
  ButtonSpinner,
  AddIcon,
} from '@gluestack-ui/themed';

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
   
    const idAlias: string = 'account.001';
    
    // initialize a smart contract wallet on chain and obtain the address
    if (process.env.ERC4337_ACCOUNT_SIGNING_KEY && process.env.NODE_RPC_URL && process.env.PRIVACY_ACCOUNT_FACTORY_ADDRESS) {
      console.log(`We're about to create a new smart contract wallet via node RPC '${process.env.NODE_RPC_URL}' with factory address '${process.env.PRIVACY_ACCOUNT_FACTORY_ADDRESS}'`);
      const account = await PrivacyAccount.init(
        new ethers.Wallet(process.env.ERC4337_ACCOUNT_SIGNING_KEY),
        process.env.NODE_RPC_URL,
        process.env.PRIVACY_ACCOUNT_FACTORY_ADDRESS,
        idAlias
      );
      const address = account.getSender();
      console.log(`Wallet address is ${address}`);

      // persist the data
      await DataService.persistIdentityData(idAlias, account.getEncryptedIdMessageHex(), account.getIdCommitment(), address);

    } else {
      console.error("No default signing key, node RPC address and/or factory address defined");
    }

    props.onRefresh();

    setIsInProgress(false);
  };

  return (
    <Center>
      <Button
        size="md"
        variant="solid"
        action="positive"
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
