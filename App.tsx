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
import { FetchIdentityButton } from './src/components/FetchIdentityButton';
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
        { identity.walletAddress ? null : <CreateIdentityButton onRefresh={fetchIdentity}/> }
        { identity.walletAddress ? <ClearIdentityButton onRefresh={fetchIdentity}/> : null }
        <FetchIdentityButton onRefresh={fetchIdentity}/>
        { identity.walletAddress ? <ExecuteButton/> : null }
        <AddressBar address={identity.walletAddress}/>
      </VStack>
    </GluestackUIProvider>
  );
}

export default App;
