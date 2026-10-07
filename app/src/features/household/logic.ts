import type { Household, IncomeBand, Tenure, Trait } from '../../services/api.models';

export const MIN_SIZE = 1;
export const MAX_SIZE = 20;

/** 질문 3(주거급여)은 가장 낮은 소득 구간을 골랐을 때만 묻는다. */
export function showsHousingBenefit(income: IncomeBand | undefined): boolean {
  return income === 'le48';
}

/** 인원을 글자로 받아 1~20 범위 숫자로 바꾼다. 숫자가 아니면 null. */
export function parseSize(text: string): { size: number | null; clamped: boolean } {
  const digits = text.replace(/\D/g, '');
  if (!digits) return { size: null, clamped: false };
  const n = parseInt(digits, 10);
  if (n > MAX_SIZE) return { size: MAX_SIZE, clamped: true };
  if (n < MIN_SIZE) return { size: null, clamped: false };
  return { size: n, clamped: false };
}

/** 가구 특성 여러 개 선택. [없어요]와 나머지는 서로 해제한다. */
export function toggleTrait(cur: Household['traits'] | undefined, pick: Trait | 'none'): Household['traits'] {
  if (pick === 'none') return cur === 'none' ? null : 'none';
  const list = Array.isArray(cur) ? cur : [];
  const next = list.includes(pick) ? list.filter((t) => t !== pick) : [...list, pick];
  return next.length > 0 ? next : null;
}

/** 필요한 질문에 모두 답했는지 (1·2·4·5, 그리고 보이는 3). */
export function isHouseholdComplete(h: Partial<Household>): boolean {
  if (!h.size || !h.income || !h.tenure || !h.traits) return false;
  if (showsHousingBenefit(h.income) && !h.housingBenefit) return false;
  return true;
}

/** 소득 구간을 바꿀 때 함께 바뀌는 값. le48 이 아니면 주거급여는 null. */
export function incomePatch(cur: Partial<Household>, income: IncomeBand): Partial<Household> {
  return {
    income,
    housingBenefit: showsHousingBenefit(income) ? cur.housingBenefit : null,
  };
}

export type { Tenure };
