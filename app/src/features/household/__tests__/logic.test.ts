import { incomePatch, isHouseholdComplete, parseSize, toggleTrait } from '../logic';

describe('household logic', () => {
  it('없어요를 고르면 나머지가 풀리고, 나머지를 고르면 없어요가 풀린다', () => {
    expect(toggleTrait(['elderly65', 'welfare'], 'none')).toBe('none');
    expect(toggleTrait('none', 'disabled')).toEqual(['disabled']);
    expect(toggleTrait(['disabled'], 'elderly65')).toEqual(['disabled', 'elderly65']);
    expect(toggleTrait(['disabled'], 'disabled')).toBeNull();
    expect(toggleTrait('none', 'none')).toBeNull();
    expect(toggleTrait(null, 'welfare')).toEqual(['welfare']);
  });

  it('인원 입력은 1~20으로 맞춘다', () => {
    expect(parseSize('7')).toEqual({ size: 7, clamped: false });
    expect(parseSize('25')).toEqual({ size: 20, clamped: true });
    expect(parseSize('0')).toEqual({ size: null, clamped: false });
    expect(parseSize('')).toEqual({ size: null, clamped: false });
    expect(parseSize('a8')).toEqual({ size: 8, clamped: false });
  });

  it('주거급여 질문은 le48 일 때만 필수다', () => {
    const base = { size: 2, tenure: 'own' as const, traits: 'none' as const };
    expect(isHouseholdComplete({ ...base, income: '48_60', housingBenefit: null })).toBe(true);
    expect(isHouseholdComplete({ ...base, income: 'le48' })).toBe(false);
    expect(isHouseholdComplete({ ...base, income: 'le48', housingBenefit: 'unknown' })).toBe(true);
    expect(isHouseholdComplete({ ...base, income: 'unknown', housingBenefit: null })).toBe(true);
    expect(isHouseholdComplete({ ...base, income: 'gt100', housingBenefit: null, traits: null })).toBe(false);
    expect(isHouseholdComplete({ income: 'gt100', housingBenefit: null, tenure: 'rent', traits: 'none' })).toBe(false);
  });

  it('소득 구간이 le48 이 아니면 주거급여는 null', () => {
    expect(incomePatch({ housingBenefit: 'yes' }, '48_60')).toEqual({ income: '48_60', housingBenefit: null });
    expect(incomePatch({ housingBenefit: 'yes' }, 'le48')).toEqual({ income: 'le48', housingBenefit: 'yes' });
  });
});
