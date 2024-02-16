
import React, { useState } from 'react';

import {
  Center,
  Button,
  ButtonText,
  ButtonIcon,
  ButtonSpinner,
  AddIcon,
} from '@gluestack-ui/themed';

import { DataService } from "../services/DataService";

type FetchIdentityProps = {
  onRefresh(): void
}

export function FetchIdentityButton(props: FetchIdentityProps): JSX.Element {
  const [isInProgress, setIsInProgress] = useState(false);

  const onPress = async() => {
    setIsInProgress(true);
    await DataService.clearIdentityData();
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
        onPress={props.onRefresh}
      >
        <ButtonText>Fetch Identity</ButtonText>
        <ButtonSpinner animating={isInProgress} hidesWhenStopped={true}/>
      </Button>
    </Center>
  );
};
