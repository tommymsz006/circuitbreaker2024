
import React, { useState, useEffect } from 'react';

import { ethers } from "ethers";

import {
  Center,
  Box,
  Image,
  Text,
} from '@gluestack-ui/themed';

import BackgroundTimer from 'react-native-background-timer';

import { DataService } from "../services/DataService";

export function BalanceSection(): JSX.Element {
  const [balance, setBalance] = useState('0');

  useEffect(() => {
    BackgroundTimer.runBackgroundTimer(async () => {
      if (process.env.NODE_RPC_URL) {
        const provider: ethers.providers.Provider = new ethers.providers.JsonRpcProvider(process.env.NODE_RPC_URL);
        const identity = await DataService.getIdentity();
        if (identity.walletAddress) {
          console.log(`Getting the balance of the wallet at '${identity.walletAddress}'...`);
          const balance = await provider.getBalance(identity.walletAddress);
          setBalance(ethers.utils.formatEther(balance));
        } else {
          setBalance('0');
        }
      } else {
        console.error("No node RPC address defined");
      }
    }, 20000);
  }, []);

  return (
    <Center>
      <Box>
      <Image
        size="lg"
        resizeMode={"contain"}
        source={{
          uri: "https://ethereum.org/_next/static/media/eth-glyph-colored.434446fa.png"
        }}  
        alt=""
      />
      </Box>
      <Text size="xl">{balance} ETH</Text>
    </Center>
  );
};
