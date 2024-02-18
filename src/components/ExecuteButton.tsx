
import React, { useState } from 'react';

import {
  Center,
  Button,
  ButtonText,
  ButtonIcon,
  ButtonSpinner,
  ArrowRightIcon
} from '@gluestack-ui/themed';


// Import others
import { ethers } from "ethers";
import { Client } from "userop";
import { PrivacyAccount } from '../builder/privacyAccount';
import { DataService } from "../services/DataService";

import PrivacyAccountFactory from "../../contracts/artifacts/contracts/PrivacyAccountFactory.sol/PrivacyAccountFactory.json";

type FetchIdentityProps = {
  onRefresh(): void
}

export function ExecuteButton(): JSX.Element {
  const [isInProgress, setIsInProgress] = useState(false);

  const onPress = async() => {
    setIsInProgress(true);

    const identity = await DataService.getIdentity();

    // initialize a smart contract wallet on chain and obtain the address
    if (identity && identity.walletAddress &&
        process.env.ERC4337_ACCOUNT_SIGNING_KEY && process.env.NODE_RPC_URL && process.env.PRIVACY_ACCOUNT_FACTORY_ADDRESS) {
      console.log(`Obtaining the existing wallet at address '${identity.walletAddress}'...`);
      const signer = new ethers.Wallet(process.env.ERC4337_ACCOUNT_SIGNING_KEY);
      const opts = {};
      const account = await PrivacyAccount.init(
        signer,
        process.env.NODE_RPC_URL,
        process.env.PRIVACY_ACCOUNT_FACTORY_ADDRESS,
        identity.idAlias || 'account.001',
        identity.encryptedIdMessage || undefined,
        identity.idCommitment || undefined,
        opts
      );
      const client = await Client.init(process.env.NODE_RPC_URL);

      // prepare a transfer transaction
      const target = await signer.getAddress();
      const value = ethers.utils.parseEther('0');
      console.log(`Preparing a transfer transaction to target address '${target}' with amount '${value}'...`);
      const res = await client.sendUserOperation(
        await account.execute(target, value, '0x'),
        {
          onBuild: (op: any) => console.log("Signed UserOperation:", op),
        }
      );
      console.log(`UserOpHash: ${res.userOpHash}`);

      console.log("Waiting for transaction...");
      const ev = await res.wait();
      console.log(`Transaction hash: ${ev?.transactionHash ?? null}`);
    } else {
      console.error("No default signing key, node RPC address and/or factory address defined, or identity has not yet been created");
    }

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
        <ButtonIcon as={ArrowRightIcon} />
        <ButtonText>Execute</ButtonText>
        <ButtonSpinner animating={isInProgress} hidesWhenStopped={true}/>
      </Button>
    </Center>
  );
};
