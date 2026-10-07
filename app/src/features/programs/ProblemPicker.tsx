import React from 'react';
import { Pressable, View } from 'react-native';
import { copy } from '../../config/copy';
import { PROBLEM_TYPES, type ProblemTypeId } from '../../config/problemTypes';
import { Label, ProblemIcon, useTheme } from '../../ui';

/** 8개 문제 유형을 그림과 이름으로 보여 주고 하나 고르게 한다. */
export function ProblemPicker({ onPick, current }: { onPick: (id: ProblemTypeId) => void; current?: string }) {
  const { colors, radius, space, size } = useTheme();
  return (
    <View style={{ gap: space.sm }}>
      {PROBLEM_TYPES.map((t) => (
        <Pressable
          key={t.id}
          accessibilityRole="button"
          accessibilityLabel={copy.results.pickLabel(t.label)}
          accessibilityState={{ selected: current === t.id }}
          onPress={() => onPick(t.id)}
          style={({ pressed }) => ({
            backgroundColor: colors.surface,
            borderRadius: radius.md,
            paddingVertical: space.sm,
            paddingHorizontal: space.screen,
            minHeight: size.problemIcon + space.md,
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.md,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <ProblemIcon name={t.icon} size={size.problemIcon} />
          <Label style={{ flex: 1 }}>{t.label}</Label>
        </Pressable>
      ))}
    </View>
  );
}
