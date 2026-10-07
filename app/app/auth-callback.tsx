import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { copy } from '../src/config/copy';
import { auth } from '../src/features/auth';
import { takeReturnTo } from '../src/features/auth/authBrowser';
import { Screen, Voice, useTheme } from '../src/ui';

/** 웹에서 카카오 로그인이 돌아오는 자리. code 로 로그인을 끝내고 원래 화면(없으면 홈)으로 보낸다. */
export default function AuthCallback() {
  const router = useRouter();
  const { space } = useTheme();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const back = (takeReturnTo() ?? '/') as Href;
    if (!code) {
      router.replace(back);
      return;
    }
    auth
      .completeSignIn(String(code))
      .catch(() => {})
      .finally(() => router.replace(back));
  }, [code, router]);

  return (
    <Screen>
      <View style={{ paddingTop: space.xxl }}>
        <Voice accessibilityRole="header" accessibilityLiveRegion="polite">
          {copy.auth.working}
        </Voice>
      </View>
    </Screen>
  );
}
