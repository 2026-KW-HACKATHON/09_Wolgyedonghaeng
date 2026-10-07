import { useRouter } from 'expo-router';
import React from 'react';
import { copy } from '../src/config/copy';
import { BigButton, Screen, StepHeader, Title } from '../src/ui';

// S2 주소 확인 자리. 화면은 T23에서 만든다.
export default function AddressScreen() {
  const router = useRouter();
  return (
    <Screen>
      <StepHeader step={3} onBack={() => router.back()} />
      <Title>{copy.address.searchTitle}</Title>
      <BigButton title={copy.common.next} onPress={() => router.push('/results')} />
    </Screen>
  );
}
