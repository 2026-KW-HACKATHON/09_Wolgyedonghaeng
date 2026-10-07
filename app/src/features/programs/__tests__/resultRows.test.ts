import normal from '../../../services/mock/examples/analyze-normal.json';
import confirm from '../../../services/mock/examples/analyze-confirm.json';
import other from '../../../services/mock/examples/analyze-other.json';
import empty from '../../../services/mock/examples/analyze-empty.json';
import programsJson from '../../../services/mock/programs.json';
import type { AnalyzeResponse, ProgramsFile } from '../../../services/api.models';
import { amountLine, buildRows, parseNextMonth, resultKind, statusFields } from '../resultRows';

const programs = programsJson as unknown as ProgramsFile;
const res = (x: unknown) => x as AnalyzeResponse;

describe('parseNextMonth', () => {
  it('글에서 처음 나오는 달을 읽는다', () => {
    expect(parseNextMonth('내년 3월 전후 모집 예정 — 공고 확인 필요')).toBe(3);
    expect(parseNextMonth('매년 2~3월 모집')).toBe(2);
    expect(parseNextMonth('내년 상반기(예년 2월) 모집 예정')).toBe(2);
    expect(parseNextMonth('냉방(에어컨)은 올해 마감')).toBeNull();
    expect(parseNextMonth(null)).toBeNull();
  });
});

describe('statusFields', () => {
  it('마감이 아니면 상태만 넘긴다', () => {
    expect(statusFields('always', '아무 글')).toEqual({ state: 'always' });
  });
  it('마감이고 달을 알면 nextMonth 를 넘긴다', () => {
    expect(statusFields('closed_next', '내년 3월 전후')).toEqual({ state: 'closed_next', nextMonth: 3 });
  });
  it('마감이고 달을 모르면 안내 글을 그대로 쓴다', () => {
    expect(statusFields('closed_next', '공고 확인 필요')).toEqual({ statusText: '공고 확인 필요' });
    expect(statusFields('closed_next', null)).toEqual({ state: 'closed_next' });
  });
});

describe('amountLine', () => {
  const s02 = programs.programs.find((p) => p.id === 'S02')!;
  it('variant 가 있으면 variant 금액', () => {
    expect(amountLine(s02, 'B')).toBe(s02.eligibility.variants!.find((v) => v.id === 'B')!.amountShort);
  });
  it('variant 가 없거나 모르는 값이면 사업 금액', () => {
    expect(amountLine(s02, null)).toBe(s02.amount.short);
    expect(amountLine(s02, 'Z')).toBe(s02.amount.short);
  });
});

describe('buildRows', () => {
  it('추천 순서대로 사업명·이유·금액을 채운다', () => {
    const rows = buildRows(res(normal), programs);
    expect(rows.main.length).toBe(normal.recommendations.length);
    expect(rows.main[0].programId).toBe(normal.recommendations[0].programId);
    expect(rows.main[0].title).toBe(
      programs.programs.find((p) => p.id === normal.recommendations[0].programId)!.name,
    );
    expect(rows.main[0].reason).toBe(normal.recommendations[0].reason);
    expect(rows.main.every((r) => !!r.amount)).toBe(true);
  });

  it('대출 사업에는 대출 문구를, 정보가 불확실한 사업에는 확인 중 문구를 붙인다', () => {
    const base = res(normal);
    const loanRec = {
      programId: 'C03', rank: 1, reason: '이자를 도와줘요', status: 'maybe' as const, toConfirm: [], applyState: 'check' as const, variant: null,
    };
    const lowRec = { ...loanRec, programId: 'N05', rank: 2 };
    const rows = buildRows({ ...base, recommendations: [lowRec, loanRec] }, programs);
    expect(rows.main.map((r) => r.programId)).toEqual(['C03', 'N05']);
    expect(rows.main[0].amountPrefix).toBe('보조금이 아니라 대출이에요');
    expect(rows.main[0].note).toBeUndefined();
    expect(rows.main[1].note).toBe('정보를 확인하고 있어요');
  });

  it('점검 사업은 별도 목록에, 제외 사업은 이름과 이유로', () => {
    const rows = buildRows(res(confirm), programs);
    expect(rows.checkup.map((r) => r.programId)).toEqual(['N02']);
    expect(rows.checkup[0].amount).toBeUndefined();
    expect(rows.excluded[0]).toMatchObject({ programId: 'S01', why: expect.any(String) });
  });

  it('데이터에 없는 사업은 건너뛴다', () => {
    const r = buildRows(
      { ...res(normal), recommendations: [{ ...normal.recommendations[0], programId: 'ZZZ' }] } as AnalyzeResponse,
      programs,
    );
    expect(r.main).toEqual([]);
  });
});

describe('resultKind', () => {
  it('확인 필요 -> 확인 단계, 맞아요 후 목록', () => {
    const rows = buildRows(res(confirm), programs);
    expect(resultKind(res(confirm), false, rows)).toBe('confirm');
    expect(resultKind(res(confirm), true, rows)).toBe('list');
  });
  it('기타는 항상 other', () => {
    expect(resultKind(res(other), true, buildRows(res(other), programs))).toBe('other');
  });
  it('추천이 없으면 empty', () => {
    expect(resultKind(res(empty), false, buildRows(res(empty), programs))).toBe('empty');
  });
  it('보통은 list', () => {
    expect(resultKind(res(normal), false, buildRows(res(normal), programs))).toBe('list');
  });
});
