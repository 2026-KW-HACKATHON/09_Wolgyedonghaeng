import type { Program } from '../../../services/api.models';
import { buildCardData, buildYearOf, completeHousehold } from '../buildCard';
import { dongOf } from '../dong';
import { formatKoDate, formatShortDate } from '../format';

describe('dongOf', () => {
  it('지번 주소에서 동까지만', () => {
    expect(dongOf({ road: '서울특별시 노원구 월계로 45길 12', jibun: '서울특별시 노원구 월계동 12-3' })).toBe(
      '서울특별시 노원구 월계동',
    );
  });
  it('번지·동호수는 싣지 않는다', () => {
    expect(dongOf({ road: '', jibun: '서울특별시 노원구 상계1동 99-1 101동 203호' })).toBe('서울특별시 노원구 상계1동');
  });
  it('도로명에 괄호 동이 있으면 거기서', () => {
    expect(dongOf({ road: '서울특별시 노원구 월계로 45길 12 (월계동)', jibun: '' })).toBe('서울특별시 노원구 월계동');
  });
  it('동이 없으면 구까지, 주소가 없으면 null', () => {
    expect(dongOf({ road: '서울특별시 노원구 월계로 45길 12', jibun: '' })).toBe('서울특별시 노원구');
    expect(dongOf(null)).toBeNull();
  });
});

describe('카드 만들기', () => {
  const program = {
    id: 'C01',
    name: '주거급여 수선유지급여',
    apply: { state: 'always', text: '', nextText: null },
    toConfirm: ['재산을 포함한 소득인정액'],
    callPhone: { name: '노원구청', phone: '02-1' },
  } as unknown as Program;

  it('가구 정보와 주소는 동까지만 담는다', () => {
    const c = buildCardData(
      program,
      null,
      {
        household: { size: 2, income: 'le48', housingBenefit: 'no', tenure: 'own', traits: 'none' },
        address: { road: '서울특별시 노원구 월계로 45길 12', jibun: '서울특별시 노원구 월계동 12-3' } as never,
        building: { useAprDay: '19850312', fetchedOk: true },
        images: [],
      },
      new Date('2026-10-07T03:00:00Z'),
    );
    expect(c.address).toEqual({ dong: '서울특별시 노원구 월계동' });
    expect(c.buildYear).toBe(1985);
    expect(c.household?.size).toBe(2);
    expect(c.phone).toBe('02-1');
    expect(JSON.stringify(c)).not.toContain('12-3');
  });

  it('답이 없으면 가구 정보는 null', () => {
    expect(completeHousehold({})).toBeNull();
    expect(buildYearOf(null)).toBeNull();
  });
});

describe('날짜', () => {
  it('한국어로', () => {
    expect(formatKoDate('2026-10-07T03:00:00Z')).toMatch(/^2026년 10월 7일$/);
    expect(formatShortDate('2026-10-07T03:00:00Z')).toBe('10월 7일');
    expect(formatKoDate('')).toBe('');
  });
});
