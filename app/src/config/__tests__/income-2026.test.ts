import { MEDIAN_2026, bands, needsCounselConfirm } from '../income-2026';

const labels = (n: number) => bands(n).map((b) => b.label);

describe('income-2026', () => {
  it('1인 123 / 154 / 256', () => {
    expect(labels(1)).toEqual(['123만 원 이하', '123만~154만 원', '154만~256만 원', '256만 원보다 많아요']);
  });

  it('7인 457 / 571 / 952', () => {
    expect(labels(7)).toEqual(['457만 원 이하', '457만~571만 원', '571만~952만 원', '952만 원보다 많아요']);
  });

  it('PRD 표 4-1의 2~6인 값과 같다', () => {
    const expected: Record<number, [number, number, number]> = {
      2: [202, 252, 420],
      3: [257, 322, 536],
      4: [312, 390, 649],
      5: [363, 453, 756],
      6: [411, 513, 856],
    };
    for (const [n, [a, b, c]] of Object.entries(expected)) {
      expect(labels(Number(n))).toEqual([`${a}만 원 이하`, `${a}만~${b}만 원`, `${b}만~${c}만 원`, `${c}만 원보다 많아요`]);
    }
  });

  it('7인 48%는 고시의 4,567,272원이다', () => {
    expect(Math.round(MEDIAN_2026[7] * 0.48)).toBe(4567272);
  });

  it('8인 이상은 7인 값을 쓰고 상담 확인 표시가 켜진다', () => {
    expect(labels(8)).toEqual(labels(7));
    expect(labels(20)).toEqual(labels(7));
    expect(needsCounselConfirm(7)).toBe(false);
    expect(needsCounselConfirm(8)).toBe(true);
  });

  it('구간 코드는 4개다', () => {
    expect(bands(3).map((b) => b.code)).toEqual(['le48', '48_60', '60_100', 'gt100']);
  });
});
