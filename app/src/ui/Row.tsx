import React from 'react';
import { Pressable, View } from 'react-native';
import { Body, Label, Meta, StatusText, type ApplyState } from './Text';
import { useTheme } from './theme';

interface Props {
  title: string;
  /** 사업명 바로 아래 Meta 한 줄 (예: "정보를 확인하고 있어요") */
  note?: string;
  reason?: string;
  amount?: string;
  /** 금액 줄 앞에 붙는 Meta (예: "대출이에요") */
  amountPrefix?: string;
  state?: ApplyState;
  nextMonth?: number | null;
  /** state 대신 쓰는 Meta 문구 (예: 저장일) */
  statusText?: string;
  onPress: () => void;
  accessibilityLabel?: string;
}

/** 누를 수 있는 행. 그림자·경계선·아이콘·배지 없음. */
export function Row({
  title,
  note,
  reason,
  amount,
  amountPrefix,
  state,
  nextMonth,
  statusText,
  onPress,
  accessibilityLabel,
}: Props) {
  const { colors, radius, space, font } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? [title, note, reason, amount].filter(Boolean).join(', ')}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        padding: space.screen,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.sm,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ flex: 1, gap: 8 }}>
        <Label>{title}</Label>
        {note ? <Meta>{note}</Meta> : null}
        {reason ? <Body tone="inkSoft">{reason}</Body> : null}
        {amountPrefix ? <Meta>{amountPrefix}</Meta> : null}
        {/* 사업명이 행에서 가장 강한 글씨. 금액은 본문 크기·보통 굵기·연한 색으로 한 단계 낮춰 이름과 구분한다 */}
        {amount ? (
          <Body tone="inkSoft" style={font('500')}>
            {amount.replace(/([0-9만억천]) (원|명|%|개월)/g, '$1\u00a0$2')}
          </Body>
        ) : null}
        {state ? <StatusText state={state} nextMonth={nextMonth} /> : null}
        {!state && statusText ? <Meta>{statusText}</Meta> : null}
      </View>
      <Body tone="inkMuted" accessibilityElementsHidden importantForAccessibility="no">
        ›
      </Body>
    </Pressable>
  );
}
