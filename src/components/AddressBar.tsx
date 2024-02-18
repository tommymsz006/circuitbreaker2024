import React, { useState } from 'react';
import {
  Center,
  HStack,
  Text,
  Button,
  ButtonIcon,
  CopyIcon
} from '@gluestack-ui/themed';
import Clipboard from '@react-native-clipboard/clipboard';

import { Utils } from '../utils/Utils';

type AddressBarProps = {
  walletAddress: string | null,
  idCommitment: bigint | null
}

export function AddressBar(props: AddressBarProps): JSX.Element {
  const [walletAddress, setWalletAddress] = useState('');
  const [idCommitment, setIdCommitment] = useState('');

  const copyAddressToClipboard = () => {
    Clipboard.setString(props.walletAddress || '(Identity has not been created)');
  };

  const copyIdCommitmentToClipboard = () => {
    Clipboard.setString(props.idCommitment?.toString() || '(Identity has not been created)');
  };

  return (
    <Center>
      <HStack space="md">
        <Text>Address: {Utils.truncate(props.walletAddress, 14)}</Text>
        <Button
          size="xs"
          variant="outline"
          action="primary"
          isDisabled={false}
          isFocusVisible={false}
          onPress={copyAddressToClipboard}>
          <ButtonIcon as={CopyIcon} />
        </Button>
      </HStack>
      <HStack space="md">
        <Text>ID Commitment: {Utils.truncate(props.idCommitment ? props.idCommitment.toString() : null, 14)}</Text>
        <Button
          size="xs"
          variant="outline"
          action="primary"
          isDisabled={false}
          isFocusVisible={false}
          onPress={copyIdCommitmentToClipboard}>
          <ButtonIcon as={CopyIcon} />
        </Button>
      </HStack>
    </Center>
  );
};
