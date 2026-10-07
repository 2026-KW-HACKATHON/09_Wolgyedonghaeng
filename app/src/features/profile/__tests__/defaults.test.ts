import type { Household } from '../../../services/api.models';
import { canSaveHousehold, draftToHousehold, profileToFlowPatch, shouldOfferProfile } from '../defaults';

const H: Household = { size: 2, income: 'le48', housingBenefit: 'no', tenure: 'own', traits: ['elderly65'] };
const A = {
  road: '서울특별시 노원구 월계로 45길 12',
  jibun: null,
  sidoCd: '11',
  sigunguCd: '11350',
  bjdongCd: '10100',
  platGbCd: '0' as const,
  bun: '0012',
  ji: '0003',
};

describe('저장된 정보로 시작', () => {
  it('저장된 값이 있고 흐름이 비어 있을 때만 묻는다', () => {
    const p = { household: H, address: A };
    expect(shouldOfferProfile(p, { household: {} }, 'household')).toBe(true);
    expect(shouldOfferProfile(p, { household: { size: 1 } }, 'household')).toBe(false);
    expect(shouldOfferProfile(p, { household: {} }, 'address')).toBe(true);
    expect(shouldOfferProfile(p, { household: {}, address: A }, 'address')).toBe(false);
    expect(shouldOfferProfile(null, { household: {} }, 'household')).toBe(false);
    expect(shouldOfferProfile({ household: null, address: null }, { household: {} }, 'household')).toBe(false);
  });

  it('흐름에 채울 값은 비어 있는 것만이다', () => {
    const p = { household: H, address: A };
    expect(profileToFlowPatch(p, { household: {} })).toEqual({ household: H, address: A });
    expect(profileToFlowPatch(p, { household: { size: 3 }, address: A })).toEqual({});
  });
});

describe('내 정보 가구 값', () => {
  it('필요한 질문에 모두 답해야 저장할 수 있다', () => {
    expect(canSaveHousehold({})).toBe(true);
    expect(canSaveHousehold({ size: 2 })).toBe(false);
    expect(canSaveHousehold({ size: 2, income: 'le48', tenure: 'own' })).toBe(false);
    expect(canSaveHousehold({ size: 2, income: 'le48', tenure: 'own', housingBenefit: 'no' })).toBe(true);
    expect(canSaveHousehold({ size: 2, income: '60_100', tenure: 'rent' })).toBe(true);
  });

  it('소득이 le48 이 아니면 주거급여는 null, 특성은 답이 없으면 null', () => {
    expect(draftToHousehold({})).toBeNull();
    expect(draftToHousehold({ size: 3, income: '60_100', tenure: 'rent', housingBenefit: 'yes' })).toEqual({
      size: 3,
      income: '60_100',
      housingBenefit: null,
      tenure: 'rent',
      traits: null,
    });
    expect(draftToHousehold(H)).toEqual(H);
  });
});
