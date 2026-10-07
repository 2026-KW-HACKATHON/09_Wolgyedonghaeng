import React from 'react';
import { View } from 'react-native';
import { Body, Meta, useTheme } from '../../ui';

/** 항목 제목(Meta)과 내용. 면·구분선 없이 여백으로만 나눈다. */
export function Item({ title, children }: { title: string; children: React.ReactNode }) {
  const { space } = useTheme();
  return (
    <View style={{ gap: space.xs }}>
      <Meta accessibilityRole="header">{title}</Meta>
      {children}
    </View>
  );
}

/** 묶음. 항목 사이 24, 묶음 사이는 바깥에서 32. */
export function Group({ children }: { children: React.ReactNode }) {
  const { space } = useTheme();
  return <View style={{ gap: space.lg }}>{children}</View>;
}

/** 줄바꿈이 들어 있는 사업 데이터 글을 그대로 보여 준다. */
export function Lines({ text }: { text: string | null | undefined }) {
  if (!text) return null;
  return <Body>{text}</Body>;
}
