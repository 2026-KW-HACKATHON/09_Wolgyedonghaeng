import { useRouter } from 'expo-router';
import React from 'react';
import { copy } from '../src/config/copy';
import { BigButton, Screen, Title } from '../src/ui';

// S3 찾는 중 + S4 결과 자리. 화면은 T24에서 만든다.
export default function ResultsScreen() {
  const router = useRouter();
  return (
    <Screen>
      <Title>{copy.results.pickTitle}</Title>
      <BigButton variant="secondary" title={copy.common.retry} onPress={() => router.replace('/')} />
    </Screen>
  );
}
