import React from 'react';
import { Pressable, View } from 'react-native';
import { Body, Label } from './Text';
import { useTheme } from './theme';

const CIRCLED = ['①', '②', '③', '④', '⑤'];

interface Props {
  /** 지금 단계 (1부터) */
  step: number;
  total?: number;
  onBack?: () => void;
}

export function StepHeader({ step, total = 3, onBack }: Props) {
  const { colors, size, font } = useTheme();
  return (
    <View
      style={{ minHeight: size.touch, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
    >
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
          onPress={onBack}
          style={({ pressed }) => ({
            minHeight: size.touch,
            minWidth: size.touch,
            justifyContent: 'center',
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Body tone="inkSoft">‹ 뒤로</Body>
        </Pressable>
      ) : (
        <View style={{ minWidth: size.touch }} />
      )}
      <View
        style={{ flexDirection: 'row', gap: 8 }}
        accessible
        accessibilityLabel={`${total}단계 중 ${step}단계`}
      >
        {Array.from({ length: total }, (_, i) => (
          <Label
            key={i}
            style={{
              color: i + 1 === step ? colors.ink : colors.inkMuted,
              ...font(i + 1 === step ? '700' : '400'),
            }}
          >
            {CIRCLED[i] ?? String(i + 1)}
          </Label>
        ))}
      </View>
    </View>
  );
}

/** 단계 표시가 없는 화면(S5, S6)의 맨 위 [뒤로] */
export function BackLink({ onBack }: { onBack: () => void }) {
  const { size } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="뒤로 가기"
      onPress={onBack}
      style={({ pressed }) => ({
        minHeight: size.touch,
        minWidth: size.touch,
        alignSelf: 'flex-start',
        justifyContent: 'center',
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Body tone="inkSoft">‹ 뒤로</Body>
    </Pressable>
  );
}
