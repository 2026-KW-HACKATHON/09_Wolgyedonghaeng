import React from 'react';
import { Pressable, View } from 'react-native';
import { Body, Label } from './Text';
import { useTheme } from './theme';

/** 단계마다 사용자에게 보이는 이름 (1 사진, 2 가구 정보, 3 주소) */
const STEP_NAMES = ['사진', '우리 집 정보', '사는 곳', '결과', '카드'];

interface Props {
  /** 지금 단계 (1부터) */
  step: number;
  total?: number;
  /** 단계 이름. 없으면 단계 번호에 맞는 기본 이름 */
  name?: string;
  onBack?: () => void;
}

export function StepHeader({ step, total = 3, name, onBack }: Props) {
  const { size, colors, radius, space, font } = useTheme();
  const stepName = name ?? STEP_NAMES[step - 1] ?? '';
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
            paddingHorizontal: space.md,
            justifyContent: 'center',
            borderRadius: radius.md,
            backgroundColor: colors.raised,
            borderWidth: size.borderWidth,
            borderColor: colors.line,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Body style={font('700')}>‹ 뒤로</Body>
        </Pressable>
      ) : (
        <View style={{ minWidth: size.touch }} />
      )}
      <Label accessibilityLabel={`${total}단계 중 ${step}단계, ${stepName}`}>
        {step}/{total} {stepName}
      </Label>
    </View>
  );
}

/** 단계 표시가 없는 화면(S5, S6)의 맨 위 [뒤로] */
export function BackLink({
  onBack,
  label = '‹ 뒤로',
  accessibilityLabel = '뒤로 가기',
}: {
  onBack: () => void;
  label?: string;
  accessibilityLabel?: string;
}) {
  const { size, colors, radius, space, font } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onBack}
      style={({ pressed }) => ({
        minHeight: size.touch,
        minWidth: size.touch,
        paddingHorizontal: space.md,
        alignSelf: 'flex-start',
        justifyContent: 'center',
        borderRadius: radius.md,
        backgroundColor: colors.raised,
        borderWidth: size.borderWidth,
        borderColor: colors.line,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Body style={font('700')}>{label}</Body>
    </Pressable>
  );
}
