
import React, { useState } from 'react';

import {
  Center,
  Button,
  ButtonText,
  ButtonIcon,
  ButtonSpinner,
  TrashIcon,
} from '@gluestack-ui/themed';

import { DataService } from "../services/DataService";

type ClearIdentityProps = {
  onRefresh(): void
}

export function ClearIdentityButton(props: ClearIdentityProps): JSX.Element {
  const [isInProgress, setIsInProgress] = useState(false);

  const onPress = async() => {
    setIsInProgress(true);
    await DataService.clearIdentityData();
    props.onRefresh();
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
        <ButtonIcon as={TrashIcon}/>
        <ButtonText> Identity</ButtonText>
        <ButtonSpinner animating={isInProgress} hidesWhenStopped={true}/>
      </Button>
    </Center>
  );
};
