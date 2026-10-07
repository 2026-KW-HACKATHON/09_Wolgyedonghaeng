// 디자인 토큰. 6자리 색 값은 이 파일에만 둔다 (design.md 2절, 14절).

export interface ColorTokens {
  paper: string;
  surface: string;
  raised: string;
  ink: string;
  inkSoft: string;
  inkMuted: string;
  green: string;
  onGreen: string;
  care: string;
  line: string;
}

export const light: ColorTokens = {
  paper: '#F6F4EE',
  surface: '#ECE8DF',
  raised: '#FFFFFF',
  ink: '#1D221E',
  inkSoft: '#454D47',
  inkMuted: '#5C645E',
  green: '#2E7544',
  onGreen: '#FFFFFF',
  care: '#A1432E',
  line: 'rgba(29,34,30,0.16)',
};

export const dark: ColorTokens = {
  paper: '#121613',
  surface: '#1C221D',
  raised: '#252C26',
  ink: '#EDF0EA',
  inkSoft: '#C2C9C1',
  inkMuted: '#9EA79F',
  green: '#79CF8F',
  onGreen: '#0F1A12',
  care: '#E8907A',
  line: 'rgba(237,240,234,0.18)',
};

export type TypeRole = 'voice' | 'title' | 'body' | 'label' | 'amount' | 'meta';
export type FontWeight = '400' | '500' | '700';

export interface TypeSpec {
  size: number;
  lineHeight: number;
  weight: FontWeight;
}

const spec = (size: number, ratio: number, weight: FontWeight): TypeSpec => ({
  size,
  lineHeight: Math.round(size * ratio),
  weight,
});

export const base = {
  type: {
    voice: spec(28, 1.45, '400'),
    title: spec(26, 1.35, '700'),
    body: spec(20, 1.6, '400'),
    label: spec(22, 1.3, '700'),
    amount: spec(24, 1.3, '700'),
    meta: spec(17, 1.5, '500'),
  } satisfies Record<TypeRole, TypeSpec>,
  space: { xs: 8, sm: 12, md: 16, screen: 20, lg: 24, xl: 32, xxl: 48 },
  radius: { sm: 10, md: 16, lg: 24, full: 999 },
  size: {
    buttonPrimary: 60,
    buttonSecondary: 56,
    touch: 48,
    personButton: 72,
    incomeButton: 64,
    thumb: 64,
    problemIcon: 64,
    webColumn: 480,
    borderWidth: 1.5,
  },
  motion: { fast: 150, normal: 250, slow: 500 },
} as const;

export type Tokens = typeof base;
