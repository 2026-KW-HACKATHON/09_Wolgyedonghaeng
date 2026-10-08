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
  /** 한 줄에 버튼을 여러 개 놓을 때: 글자를 본문 크기로, 좌우 여백을 줄인다 */
  compact?: boolean;
}

export function BigButton({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  disabledReason,
  accessibilityLabel,
  style,
  compact = false,
}: Props) {
  const { colors, size, radius, type, font } = useTheme();
  const label = accessibilityLabel ?? title;

  const surface: ViewStyle =
    variant === 'primary'
      ? { backgroundColor: colors.green }
      : variant === 'secondary'
        ? { backgroundColor: colors.surface, borderWidth: size.borderWidth, borderColor: colors.line }
        : { backgroundColor: colors.raised, borderWidth: size.borderWidth, borderColor: colors.line };
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
          compact ? { paddingHorizontal: 8 } : null,
          { opacity: disabled ? 0.4 : pressed ? 0.85 : 1 },
        ]}
      >
        {variant === 'text' ? (
          <Body style={[font('700'), compact ? { textAlign: 'center' } : null]}>{title}</Body>
        ) : (
          <Label
            style={[
              { color: variant === 'primary' ? colors.onGreen : colors.ink },
              compact ? { fontSize: type.body.size, lineHeight: type.body.lineHeight, textAlign: 'center' } : null,
            ]}
          >
            {title}
          </Label>
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
  reason: { marginTop: 8, textAlign: 'center' },
});
