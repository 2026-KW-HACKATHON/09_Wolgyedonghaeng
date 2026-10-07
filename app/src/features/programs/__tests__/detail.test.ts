import type { Program, ProgramsFile } from '../../../services/api.models';
import { extractLinks, mergeToConfirm, resolvePhone } from '../detail';

const file = { fallbackPhone: { name: '월계1동 행정복지센터', phone: null }, programs: [] } as unknown as ProgramsFile;
const prog = (callPhone: Program['callPhone'], toConfirm: string[] = []) => ({ callPhone, toConfirm }) as Program;

describe('resolvePhone', () => {
  it('담당 번호가 있으면 그대로 쓴다', () => {
    const r = resolvePhone(prog({ name: '구청', phone: '02-1' }), file);
    expect(r).toEqual({ name: '구청', phone: '02-1', isFallback: false });
  });
  it('없으면 행정복지센터 안내로, 번호도 없으면 null', () => {
    const r = resolvePhone(prog(null), file);
    expect(r.isFallback).toBe(true);
    expect(r.phone).toBeNull();
    expect(r.name).toBe('월계1동 행정복지센터');
  });
  it('이름만 있고 번호가 없는 담당처도 번호를 지어내지 않는다', () => {
    expect(resolvePhone(prog({ name: '구청', phone: null }), null).phone).toBeNull();
  });
});

describe('extractLinks', () => {
  it('누리집 주소를 뽑고 날짜·전화번호는 거른다', () => {
    const text =
      '• 국토교통부 고시 molit.go.kr/USR/I0204/m_45/dtl.jsp?idx=18653\n• 아시아경제(2026.3.16)\n• 문의 02-2133-7992 lh.or.kr';
    expect(extractLinks(text)).toEqual([
      { host: 'molit.go.kr', url: 'https://molit.go.kr/USR/I0204/m_45/dtl.jsp?idx=18653' },
      { host: 'lh.or.kr', url: 'https://lh.or.kr' },
    ]);
  });
  it('주소가 없으면 빈 목록', () => {
    expect(extractLinks('노원구의회 2026 주요업무계획')).toEqual([]);
    expect(extractLinks(null)).toEqual([]);
  });
});

describe('mergeToConfirm', () => {
  it('같은 글은 한 번만', () => {
    expect(mergeToConfirm(prog(null, ['a', 'b']), { toConfirm: ['b', 'c'] } as never)).toEqual(['a', 'b', 'c']);
  });
});
