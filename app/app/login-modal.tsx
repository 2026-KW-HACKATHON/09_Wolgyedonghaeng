import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { copy } from '../src/config/copy';
import { auth } from '../src/features/auth';
import { KakaoButton } from '../src/features/auth/KakaoButton';
import { markPromptHidden } from '../src/features/auth/loginPrompt';
import { BigButton, Meta, Voice, useTheme } from '../src/ui';

/** 카드를 처음 만든 비로그인 사용자에게 한 번 보이는 하단 시트 (design 7-10). */
export default function LoginModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, radius, space, size } = useTheme();
  const { next, from } = useLocalSearchParams<{ next?: string; from?: string }>();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const cardPath = (next ? `/card/${next}` : '/') as Href;
  // 카드 화면에서 열렸으면 닫기만 한다 (카드 화면이 뒤에 그대로 있다)
  const goCard = () => (from === 'card' && router.canGoBack() ? router.back() : router.replace(cardPath));

  const onKakao = async () => {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const user = await auth.signIn(String(cardPath));
      if (user) goCard();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      {/* 뒤쪽 화면을 눌러도 닫히지 않게 막고, 어둡게만 깐다 */}
      <Pressable
        accessible={false}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.ink, opacity: 0.4 }}
      />
      <View
        style={{
          backgroundColor: colors.raised,
          borderTopLeftRadius: radius.lg,
          borderTopRightRadius: radius.lg,
          width: '100%',
          maxWidth: size.webColumn,
          alignSelf: 'center',
          paddingHorizontal: space.screen,
          paddingTop: space.xl,
          paddingBottom: space.lg + insets.bottom,
          gap: space.sm,
        }}
      >
        <View style={{ paddingBottom: space.md }}>
          <Voice accessibilityRole="header">{copy.card.loginVoice}</Voice>
        </View>
        <KakaoButton
          title={copy.card.loginKakao}
          accessibilityLabel={copy.auth.kakaoLabel}
          disabled={busy}
          onPress={onKakao}
        />
        {failed ? <Meta accessibilityLiveRegion="polite">{copy.auth.failed}</Meta> : null}
        <BigButton variant="secondary" title={copy.card.loginLater} accessibilityLabel={copy.auth.laterLabel} onPress={goCard} />
        <BigButton
          variant="text"
          title={copy.card.loginNever}
          accessibilityLabel={copy.auth.neverLabel}
          onPress={() => {
            void markPromptHidden();
            goCard();
          }}
        />
      </View>
    </View>
  );
}
