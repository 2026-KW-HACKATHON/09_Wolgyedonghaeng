// 사업 상세·상담 카드가 같이 쓰는 순수 함수. 번호·금액·기간은 사업 데이터 값만 쓴다.
import type { AnalyzeResponse, Program, ProgramsFile, Recommendation } from '../../services/api.models';

export interface PhoneInfo {
  name: string;
  /** 숫자를 확인하지 못했으면 null. 이때 화면은 "번호를 확인하고 있어요"를 보여 준다 */
  phone: string | null;
  /** 사업 담당 번호가 없어 행정복지센터 안내로 대신한 경우 */
  isFallback: boolean;
}

/** 담당 부서 번호가 있으면 그것, 없으면 행정복지센터 안내. 어느 쪽도 번호가 없으면 phone 은 null. */
export function resolvePhone(program: Program | undefined, file: ProgramsFile | null): PhoneInfo {
  const call = program?.callPhone;
  if (call?.phone) return { name: call.name, phone: call.phone, isFallback: false };
  const fb = file?.fallbackPhone;
  if (fb) return { name: fb.name, phone: fb.phone ?? null, isFallback: true };
  return { name: call?.name ?? '', phone: null, isFallback: true };
}

export interface SourceLink {
  host: string;
  url: string;
}

const LINK_RE =
  /\b((?:[a-z0-9-]+\.)+(?:go\.kr|or\.kr|co\.kr|re\.kr|kr|com|net|org))(\/[A-Za-z0-9_\-./?=&%#]*)?/gi;

/** 출처 글에서 누리집 주소를 뽑는다 (최대 3개, 중복 없이). 주소가 없으면 빈 목록. */
export function extractLinks(sourcesText: string | null | undefined, max = 3): SourceLink[] {
  const out: SourceLink[] = [];
  if (!sourcesText) return out;
  for (const m of sourcesText.matchAll(LINK_RE)) {
    const host = m[1].toLowerCase();
    const path = (m[2] ?? '').replace(/[.,]+$/, '');
    const url = `https://${host}${path}`;
    if (!out.some((l) => l.url === url)) out.push({ host, url });
    if (out.length >= max) break;
  }
  return out;
}

export function findRecommendation(
  result: AnalyzeResponse | undefined,
  programId: string,
): Recommendation | undefined {
  return result?.recommendations.find((r) => r.programId === programId);
}

/** 사업의 확인 항목에 이번 추천에서 덧붙은 항목을 합친다 (같은 글은 한 번만). */
export function mergeToConfirm(program: Program, rec?: Recommendation): string[] {
  const out: string[] = [];
  for (const t of [...program.toConfirm, ...(rec?.toConfirm ?? [])]) {
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

export function findProgram(file: ProgramsFile | null, id: string): Program | undefined {
  return file?.programs.find((p) => p.id === id);
}
