import { useState } from 'react';
import type { TextStyle } from 'react-native';
import { useTheme } from './theme';

// 웹 기본 파란 포커스 외곽선 대신, 고른 상태와 같은 초록 테두리로 포커스를 보여 준다.
const noOutline = { outlineStyle: 'none' } as unknown as TextStyle;

export function useFocusBorder() {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return {
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: { borderColor: focused ? colors.green : colors.line, ...noOutline } as TextStyle,
  };
}
