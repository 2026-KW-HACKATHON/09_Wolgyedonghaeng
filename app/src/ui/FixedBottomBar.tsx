import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './theme';

/** 하단 고정 바. raised 면, 위쪽 경계선 없음, 안전 영역 포함. */
export function FixedBottomBar({ children }: { children: React.ReactNode }) {
  const { colors, space, size } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        backgroundColor: colors.raised,
        paddingTop: space.sm,
        paddingHorizontal: space.screen,
        paddingBottom: space.sm + insets.bottom,
        gap: space.sm,
        width: '100%',
        maxWidth: size.webColumn,
        alignSelf: 'center',
      }}
    >
      {children}
    </View>
  );
}
