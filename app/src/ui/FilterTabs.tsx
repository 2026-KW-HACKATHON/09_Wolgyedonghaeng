import React from 'react';
import { Pressable, View } from 'react-native';
import { Body } from './Text';
import { useTheme } from './theme';

export interface FilterOption {
  key: string;
  label: string;
  count: number;
}

/** 목록을 한 가지 기준으로 걸러 보는 선택 버튼. 고른 것은 초록 면, 나머지는 바탕 면과 테두리. */
export function FilterTabs({
  options,
  value,
  onChange,
}: {
  options: FilterOption[];
  value: string;
  onChange: (key: string) => void;
}) {
  const { colors, size, radius, space, font } = useTheme();
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
      {options.map((o) => {
        const selected = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="radio"
            accessibilityLabel={`${o.label} ${o.count}개`}
            accessibilityState={{ selected, checked: selected }}
            onPress={() => onChange(o.key)}
            style={({ pressed }) => ({
              minHeight: size.touch,
              paddingHorizontal: space.md,
              borderRadius: radius.md,
              justifyContent: 'center',
              backgroundColor: selected ? colors.green : colors.surface,
              borderWidth: selected ? 0 : size.borderWidth,
              borderColor: colors.line,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Body style={{ color: selected ? colors.onGreen : colors.ink, ...font(selected ? '700' : '500') }}>
              {o.label} {o.count}
            </Body>
          </Pressable>
        );
      })}
    </View>
  );
}
