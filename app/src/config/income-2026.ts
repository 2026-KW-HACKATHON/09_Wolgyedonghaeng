// 기준 중위소득과 소득 버튼 계산 (spec 7절). 매년 바뀌므로 이 파일에만 둔다.
// 1~6인: 보건복지부 고시. 7인: 국토교통부 고시 제2025-506호 7인 주거급여 선정기준(48%) 4,567,272원에서 역산.
export const MEDIAN_2026: Record<number, number> = {
  1: 2564238,
  2: 4199292,
  3: 5359036,
  4: 6494738,
  5: 7556719,
  6: 8555952,
  7: 9515150,
};

export type IncomeBandCode = 'le48' | '48_60' | '60_100' | 'gt100';

export interface IncomeBandItem {
  code: IncomeBandCode;
  label: string;
}

/** 8인 이상은 고시 계산 방식을 확인할 때까지 7인 값을 쓴다. 이때 화면에 "상담에서 확인"을 붙인다. */
export function needsCounselConfirm(n: number): boolean {
  return n > 7;
}

/** 중위소득 비율에 해당하는 월 금액 (만 원, 반올림). */
export function toManWon(n: number, ratio: number): number {
  const m = MEDIAN_2026[Math.min(Math.max(Math.trunc(n), 1), 7)];
  return Math.round((m * ratio) / 10000);
}

/** 가구원 수에 따른 소득 버튼 4개. */
export function bands(n: number): IncomeBandItem[] {
  const w = (r: number) => toManWon(n, r);
  return [
    { code: 'le48', label: `${w(0.48)}만 원 이하` },
    { code: '48_60', label: `${w(0.48)}만~${w(0.6)}만 원` },
    { code: '60_100', label: `${w(0.6)}만~${w(1)}만 원` },
    { code: 'gt100', label: `${w(1)}만 원보다 많아요` },
  ];
}
