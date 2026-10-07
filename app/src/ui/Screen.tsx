import React from 'react';
import { ScrollView, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './theme';

interface Props {
  children: React.ReactNode;
  scroll?: boolean;
  /** 화면 아래에 붙는 영역 (FixedBottomBar 등). 스크롤 밖에 놓인다. */
  footer?: React.ReactNode;
  contentStyle?: ViewStyle;
}

/** paper 배경, 좌우 20, 웹에서는 가운데 480px 열. */
export function Screen({ children, scroll = false, footer, contentStyle }: Props) {
  const { colors, space, size } = useTheme();
  const insets = useSafeAreaInsets();
  const column: ViewStyle = {
    width: '100%',
    maxWidth: size.webColumn,
    alignSelf: 'center',
    paddingHorizontal: space.screen,
    ...contentStyle,
  };
  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top }}>
      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: space.xl }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={column}>{children}</View>
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, column]}>{children}</View>
      )}
      {footer}
      {footer ? null : <View style={{ height: insets.bottom }} />}
    </View>
  );
}
