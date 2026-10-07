import React from 'react';
import { Pressable } from 'react-native';
import { Label, useTheme } from '../../ui';

// 카카오 브랜드 규정 색. design.md 7-10 에 따라 이 버튼 하나에만 쓰는 토큰 예외다.
const KAKAO_YELLOW = '#FEE500';
const KAKAO_LABEL = '#191919';

interface Props {
  title: string;
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
}

/** [카카오로 로그인] 카카오 브랜드 버튼. 라이트·다크 모두 같은 색이다. */
export function KakaoButton({ title, accessibilityLabel, onPress, disabled = false }: Props) {
  const { size, radius } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: size.buttonPrimary,
        borderRadius: radius.md,
        backgroundColor: KAKAO_YELLOW,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingVertical: 8,
        opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
      })}
    >
      <Label style={{ color: KAKAO_LABEL }}>{title}</Label>
    </Pressable>
  );
}
