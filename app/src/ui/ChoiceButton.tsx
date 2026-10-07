import React from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { Amount, Label } from './Text';
import { useTheme } from './theme';

interface Props {
  title: string;
  selected: boolean;
  onPress: () => void;
  /** square72: 인원 버튼, wide64: 소득 버튼 */
  size: 'square72' | 'wide64';
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function ChoiceButton({ title, selected, onPress, size, accessibilityLabel, style }: Props) {
  const { colors, size: dim, radius, font } = useTheme();
  const square = size === 'square72';
  const Txt = square ? Label : Amount;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ selected, checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: square ? dim.personButton : dim.incomeButton,
          paddingVertical: 8,
          paddingHorizontal: square ? 0 : 16,
          width: square ? dim.personButton : undefined,
          alignSelf: square ? undefined : 'stretch',
          borderRadius: radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: selected ? colors.green : colors.surface,
          borderWidth: selected ? 0 : dim.borderWidth,
          borderColor: colors.line,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <Txt
        style={{
          color: selected ? colors.onGreen : colors.ink,
          ...font(selected ? '700' : '500'),
        }}
      >
        {title}
      </Txt>
    </Pressable>
  );
}
