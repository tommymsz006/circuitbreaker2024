
import React, { useState } from 'react';

import { ethers } from "ethers";

import {
  Center,
  Button,
  ButtonIcon,
  ButtonText,
  ButtonSpinner,
  EditIcon,
} from '@gluestack-ui/themed';

import { DataService } from "../services/DataService";
import IPrivacyAccountFactory from "../../contracts/artifacts/contracts/IPrivacyAccountFactory.sol/IPrivacyAccountFactory.json"

export function DeployContractButton(): JSX.Element {
  const [isInProgress, setIsInProgress] = useState(false);

  const onPress = async() => {
    setIsInProgress(true);

    if (process.env.ERC4337_ACCOUNT_SIGNING_KEY && process.env.NODE_RPC_URL && process.env.PRIVACY_ACCOUNT_FACTORY_ADDRESS) {
      const provider: ethers.providers.Provider = new ethers.providers.JsonRpcProvider(process.env.NODE_RPC_URL);
      const signer: ethers.Wallet = new ethers.Wallet(process.env.ERC4337_ACCOUNT_SIGNING_KEY, provider);
      const contract = new ethers.Contract(process.env.PRIVACY_ACCOUNT_FACTORY_ADDRESS, IPrivacyAccountFactory.abi, signer);
      const identity = await DataService.getIdentity();
      if (identity.idCommitment) {
        try {
          console.log(`It's about to add the given identity commitment by ${await signer.getAddress()} with balance ${ethers.utils.formatEther(await signer.getBalance())} ETH`);
          const estimatedGasLimit = await contract.estimateGas.addIdCommitment(identity.idCommitment);
          const transaction = await contract.addIdCommitment(identity.idCommitment, { gasLimit: estimatedGasLimit });
          await transaction.wait();
          console.log('Successful to add the given identity commitment')
        } catch (error: any) {
          console.error(error);
        }
      } else {
        console.error("Identity commitment does not exist");
      }
    } else {
      console.error("No signing key, node RPC address and/or privacy account factory defined");
    }

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
        <ButtonIcon as={EditIcon}></ButtonIcon>
        <ButtonText>Deploy Contract</ButtonText>
        <ButtonSpinner animating={isInProgress} hidesWhenStopped={true}/>
      </Button>
    </Center>
  );
};
