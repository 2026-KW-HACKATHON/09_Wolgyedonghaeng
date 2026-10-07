import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Body, Label, Meta } from './Text';
import { useTheme } from './theme';

export type BigButtonVariant = 'primary' | 'secondary' | 'text';

interface Props {
  title: string;
  onPress?: () => void;
  variant?: BigButtonVariant;
  disabled?: boolean;
  /** 비활성일 때 버튼 아래에 보이는 이유 */
  disabledReason?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function BigButton({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  disabledReason,
  accessibilityLabel,
  style,
}: Props) {
  const { colors, size, radius } = useTheme();
  const label = accessibilityLabel ?? title;

  const surface: ViewStyle =
    variant === 'primary'
      ? { backgroundColor: colors.green }
      : variant === 'secondary'
        ? { backgroundColor: colors.surface, borderWidth: size.borderWidth, borderColor: colors.line }
        : {};
  const height = variant === 'primary' ? size.buttonPrimary : variant === 'secondary' ? size.buttonSecondary : size.touch;

  return (
    <View style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.base,
          { minHeight: height, borderRadius: radius.md },
          surface,
          { opacity: disabled ? 0.4 : pressed ? 0.85 : 1 },
        ]}
      >
        {variant === 'text' ? (
          <Body tone="inkSoft" style={styles.underline}>
            {title}
          </Body>
        ) : (
          <Label style={{ color: variant === 'primary' ? colors.onGreen : colors.ink }}>{title}</Label>
        )}
      </Pressable>
      {disabled && disabledReason ? (
        <Meta style={styles.reason} accessibilityRole="text">
          {disabledReason}
        </Meta>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 8 },
  underline: { textDecorationLine: 'underline' },
  reason: { marginTop: 8, textAlign: 'center' },
});
