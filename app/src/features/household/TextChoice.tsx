import React from 'react';
import { Pressable } from 'react-native';
import { Body, useTheme } from '../../ui';

interface Props {
  title: string;
  selected?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}

/** 글자 버튼 ([5명 이상 직접 입력], [잘 모르겠어요]). 고른 상태는 굵은 ink 글자로 보여 준다. */
export function TextChoice({ title, selected = false, onPress, accessibilityLabel }: Props) {
  const { size, font } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: size.touch,
        alignSelf: 'flex-start',
        justifyContent: 'center',
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Body
        tone={selected ? 'ink' : 'inkSoft'}
        style={{ textDecorationLine: 'underline', ...(selected ? font('700') : null) }}
      >
        {title}
      </Body>
    </Pressable>
  );
}
