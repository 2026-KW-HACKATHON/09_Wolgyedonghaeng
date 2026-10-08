import React from 'react';
import { Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from './theme';

/**
 * 전화 아이콘 버튼. 앱에서 글자 없이 아이콘만 쓰는 유일한 버튼이다 (design.md 예외, 2026-10-08 사용자 결정).
 * 주 행동이라 초록 면에 어두운 선으로 그린다. 선 2px, 둥근 끝, 색칠 없음.
 */
export function PhoneButton({ onPress, accessibilityLabel }: { onPress: () => void; accessibilityLabel: string }) {
  const { colors, size, radius } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => ({
        width: size.buttonPrimary,
        minHeight: size.buttonPrimary,
        borderRadius: radius.md,
        backgroundColor: colors.green,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Svg width={28} height={28} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Path
          d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
          stroke={colors.onGreen}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </Pressable>
  );
}
