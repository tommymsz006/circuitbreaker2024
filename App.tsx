import React, {useState} from 'react';

import {
  GluestackUIProvider,
  Text,
  VStack,
  Divider,
  Heading,
  Card
} from '@gluestack-ui/themed';
import { config } from '@gluestack-ui/config';

import { AddressBar } from "./src/components/AddressBar";
import { CreateIdentityButton } from "./src/components/CreateIdentityButton";
import { ClearIdentityButton } from "./src/components/ClearIdentityButton";
import { DeployContractButton } from './src/components/DeployContractButton';
import { BalanceSection } from "./src/components/BalanceSection";
import { DataService, Identity } from './src/services/DataService';
import { ExecuteButton } from './src/components/ExecuteButton';

function App(): JSX.Element {
  const [identity, setIdentity] = useState<Identity>({
    idAlias: null,
    encryptedIdMessage: null,
    walletAddress: null,
    idCommitment: null
  });

  (async () => {
    setIdentity(await DataService.getIdentity());
  })();

  const fetchIdentity = async () => {
    setIdentity(await DataService.getIdentity());
  }

  return (
    <GluestackUIProvider config={config}>
      <VStack space="md">
        <Text></Text>
        <Text></Text>
        <Text></Text>
        <Card size="md" variant="elevated" m="$3">
          <Heading mb="$1" size="lg">Welcome to Semaphore Wallet!</Heading>
          <Text size="sm">Create your own privacy-first wallet for transactions and anonymous signaling</Text>
        </Card>
        <Divider my="$0.5"/>
        <BalanceSection/>
        <Divider my="$0.5"/>
        { identity.walletAddress ? null : <CreateIdentityButton onRefresh={fetchIdentity}/> }
        { identity.walletAddress ? <ClearIdentityButton onRefresh={fetchIdentity}/> : null }
        { identity.walletAddress ? <DeployContractButton/> : null }
        { identity.walletAddress ? <ExecuteButton/> : null }
        <Divider my="$0.5"/>
        <AddressBar walletAddress={identity.walletAddress} idCommitment={identity.idCommitment}/>
      </VStack>
    </GluestackUIProvider>
  );
}

export default App;
