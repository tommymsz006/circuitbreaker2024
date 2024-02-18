
import React, { useState } from 'react';

import {
  Center,
  Button,
  ButtonText,
  ButtonSpinner,
} from '@gluestack-ui/themed';

import { DataService } from "../services/DataService";

type FetchIdentityProps = {
  onRefresh(): void
}

export function FetchIdentityButton(props: FetchIdentityProps): JSX.Element {
  return (
    <Center>
      <Button
        size="md"
        variant="solid"
        action="primary"
        isDisabled={false}
        isFocusVisible={false}
        onPress={props.onRefresh}
      >
        <ButtonText>Fetch Identity</ButtonText>
      </Button>
    </Center>
  );
};
