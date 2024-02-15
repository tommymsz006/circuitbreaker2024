import React, { useState, useRef } from 'react';
import { NativeModules } from 'react-native';

import {  GluestackUIProvider,
          Text,
          Button,
          ButtonText,
          ButtonIcon,
          ButtonSpinner,
          AddIcon,
          VStack,
          Divider,
          Heading,
          Card
} from '@gluestack-ui/themed';
import { config } from '@gluestack-ui/config';

// Import the crypto getRandomValues shim (**BEFORE** the shims)
import "react-native-get-random-values";
// Import the the ethers shims (**BEFORE** ethers)
import "@ethersproject/shims";

// Import Semaphore components
import { Identity } from "@semaphore-protocol/identity";

// Import others
import { ethers } from "ethers";
//import { Presets } from "userop";
import { PrivacyAccount } from './src/builder/privacyAccount';

async function onIdentityButtonPress() {
}

function IdentityButton(): JSX.Element {
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

    // create key pair first
    let keyPair = await SemaphoreEnclaveModule.createKeyPair(idAlias);
    console.log(`A key pair for alias ${idAlias} has been generated with public key: ${keyPair.publicKey}`);

    // deterministically create identity from a secret message
    let identityString = await SemaphoreEnclaveModule.createSecuredIdentityString(idAlias);
    console.log(`An identity string for alias: ${idAlias} has been generated: ${identityString.base}`);
    const identity = new Identity(identityString.base);
    console.log(`Trapdoor: ${identity.trapdoor}`);
    console.log(`Nullifier: ${identity.nullifier}`);
    console.log(`Commitment: ${identity.commitment}`);

    setIsInProgress(false);
  };

  return (
    <Button
      size="md"
      variant="solid"
      action="primary"
      isDisabled={false}
      isFocusVisible={false}
      onPress={onPress}
    >
      <ButtonText>Identity </ButtonText>
      <ButtonIcon as={AddIcon} />
      <ButtonSpinner animating={isInProgress} />
    </Button>
  );
};

function SmartContractAccountButton(): JSX.Element {
  const [isInProgress, setIsInProgress] = useState(false);

  const onPress = async() => {
    setIsInProgress(true);
    if (process.env.ERC4337_ACCOUNT_SIGNING_KEY && process.env.NODE_RPC_URL) {
      console.log(`We're about to create a new smart contract wallet via node RPC ${process.env.NODE_RPC_URL}`);
      const account = await PrivacyAccount.init(
        new ethers.Wallet(process.env.ERC4337_ACCOUNT_SIGNING_KEY),
        process.env.NODE_RPC_URL
      );
      console.log(`Wallet address is ${account.getSender()}`);
    } else {
      console.error("No default signing key and/or node RPC address defined")
    }
    setIsInProgress(false);
  };

  return (
    <Button
      size="md"
      variant="solid"
      action="primary"
      isDisabled={isInProgress}
      isFocusVisible={false}
      onPress={onPress}
    >
      <ButtonText>Smart Contract Account </ButtonText>
      <ButtonIcon as={AddIcon} />
      <ButtonSpinner animating={isInProgress} />
    </Button>
  );
};

function App(): JSX.Element {
  return (
    <GluestackUIProvider config={config}>
      <VStack space="md">
        <Text></Text>
        <Text></Text>
        <Text></Text>
        <Card size="md" variant="elevated"  m="$3">
          <Heading mb="$1" size="lg">Welcome to circuitbreaker2024!</Heading>
          <Text size="sm">Create your own privacy-first wallet</Text>
        </Card>
        <Divider my="$0.5"/>
        <IdentityButton/>
        <SmartContractAccountButton/>
      </VStack>
    </GluestackUIProvider>
  );
}

export default App;
