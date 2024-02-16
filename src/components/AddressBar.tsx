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
  address: string | null
}

export function AddressBar(props: AddressBarProps): JSX.Element {
  const [copiedText, setCopiedText] = useState('');

  const copyToClipboard = () => {
    Clipboard.setString(props.address || '(Identity has not been created)');

  };

  return (
    <Center>
      <HStack space="md">
        <Text>{Utils.truncate(props.address, 28)}</Text>
        <Button
          size="xs"
          variant="outline"
          action="primary"
          isDisabled={false}
          isFocusVisible={false}
          onPress={copyToClipboard}>
          <ButtonIcon as={CopyIcon} />
        </Button>
      </HStack>
    </Center>
  );
};
