import { ApiError } from '../api.error';
import { mockApi, setMockScenario } from '../api.mock';

describe('mock api', () => {
  afterEach(() => setMockScenario(null));

  const input = {
    images: [],
    household: { size: 2, income: 'le48' as const, housingBenefit: 'no' as const, tenure: 'own' as const, traits: 'none' as const },
  };

  it('5가지 시나리오를 돌려준다', async () => {
    setMockScenario('normal');
    expect((await mockApi.analyze(input)).recommendations.length).toBeGreaterThan(0);
    setMockScenario('confirm');
    expect((await mockApi.analyze(input)).needsConfirm).toBe(true);
    setMockScenario('other');
    expect((await mockApi.analyze(input)).classification.type).toBe('other');
    setMockScenario('empty');
    expect((await mockApi.analyze(input)).recommendations).toEqual([]);
    setMockScenario('error');
    await expect(mockApi.analyze(input)).rejects.toBeInstanceOf(ApiError);
  }, 20000);

  it('유형을 고치면 확인 없이 목록을 준다', async () => {
    setMockScenario('confirm');
    const res = await mockApi.analyze({ ...input, overrideType: 'mold' });
    expect(res.classification.overridden).toBe(true);
    expect(res.classification.type).toBe('mold');
    expect(res.needsConfirm).toBe(false);
  });

  it('사업 14개와 월계1동 주소를 준다', async () => {
    expect((await mockApi.fetchPrograms()).programs).toHaveLength(14);
    expect((await mockApi.reverseAddress(37.6, 127.06)).road).toContain('월계');
    expect((await mockApi.getBuilding({ sigunguCd: '', bjdongCd: '', platGbCd: '0', bun: '', ji: '' })).useAprDay).toBe('1985-06-20');
  });
});
