import React from 'react';
import { Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { useTheme } from './theme';
import type { TypeRole } from './tokens';
import { wordBreakStyle } from './wordBreak';

interface Props extends TextProps {
  /** 기본 색 대신 쓸 토큰 이름 */
  tone?: 'ink' | 'inkSoft' | 'inkMuted' | 'green' | 'care';
}

function make(role: TypeRole, defaultTone: NonNullable<Props['tone']>) {
  const Comp = ({ tone, style, ...rest }: Props) => {
    const t = useTheme();
    const s = t.type[role];
    const base: TextStyle = {
      ...t.font(role === 'voice' ? 'voice' : s.weight),
      fontSize: s.size,
      lineHeight: s.lineHeight,
      color: t.colors[tone ?? defaultTone],
      ...wordBreakStyle,
    };
    if (role === 'amount') base.fontVariant = ['tabular-nums'];
    // 금액 줄: "1,200만 원"에서 "원"만 다음 줄로 떨어지지 않게 단위 앞 공백을 붙여 쓴다
    if (role === 'amount' && typeof rest.children === 'string') {
      rest.children = rest.children.replace(/([0-9만억천]) (원|명|%|개월)/g, '$1\u00a0$2');
    }
    return <RNText {...rest} style={[base, style]} />;
  };
  Comp.displayName = role;
  return Comp;
}

export const Voice = make('voice', 'ink');
export const Title = make('title', 'ink');
export const Body = make('body', 'ink');
export const Label = make('label', 'ink');
export const Amount = make('amount', 'ink');
export const Meta = make('meta', 'inkSoft');

/** 집결의 말. 한 문장은 한 글꼴로 쓰고, 강조할 부분(문제 이름 등)만 글자 색을 더 진하게 한다. */
export function VoiceLine({
  before,
  strong,
  after,
  children,
  style,
}: {
  before?: string;
  strong?: string;
  after?: string;
  children?: React.ReactNode;
  style?: TextStyle;
}) {
  const t = useTheme();
  return (
    <Voice tone="inkSoft" style={style} accessibilityRole="text">
      {before}
      {strong ? <RNText style={{ color: t.colors.ink }}>{strong}</RNText> : null}
      {after}
      {children}
    </Voice>
  );
}

export type ApplyState = 'always' | 'open' | 'check' | 'closed_next';

const STATE_TEXT: Record<ApplyState, string> = {
  always: '언제든 신청할 수 있어요',
  open: '지금 신청할 수 있어요',
  check: '접수기간 확인이 필요해요',
  closed_next: '올해는 끝났어요',
};

/** 접수 상태. 글자와 색으로만 말한다 (배지 금지). */
/** 접수 상태를 한 줄 글로 */
export function statusSentence(state: ApplyState, nextMonth?: number | null): string {
  let text = STATE_TEXT[state];
  if (state === 'closed_next' && nextMonth) text += ` · 다음 모집 ${nextMonth}월`;
  return text;
}

export function StatusText({
  state,
  nextMonth,
  style,
}: {
  state: ApplyState;
  nextMonth?: number | null;
  style?: TextStyle;
}) {
  const { font } = useTheme();
  const text = statusSentence(state, nextMonth);
  const tone = state === 'always' || state === 'open' ? 'green' : state === 'check' ? 'ink' : 'inkMuted';
  return (
    <Body tone={tone} style={[font('700'), style]}>
      {text}
    </Body>
  );
}
