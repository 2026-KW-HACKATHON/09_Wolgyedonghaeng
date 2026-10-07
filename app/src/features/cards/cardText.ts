import { copy } from '../../config/copy';
import { bands, needsCounselConfirm } from '../../config/income-2026';
import { getProblemType } from '../../config/problemTypes';
import type { ConsultCard } from '../../services/storage';

/** 카드의 "우리 집" 줄들. 빈 줄은 넣지 않는다. */
export function homeLines(card: ConsultCard): string[] {
  const h = card.household;
  const lines: string[] = [];
  if (h) {
    const band =
      h.income !== 'unknown' && !needsCounselConfirm(h.size) ? bands(h.size).find((b) => b.code === h.income) : undefined;
    lines.push(
      [copy.card.persons(h.size), band ? copy.card.income(band.label) : copy.card.incomeUnknown].join(' · '),
    );
    const parts: string[] = [];
    if (h.housingBenefit) parts.push(copy.card.benefit[h.housingBenefit]);
    parts.push(copy.card.tenure[h.tenure]);
    lines.push(parts.join(' · '));
  }
  lines.push(
    [card.address?.dong, card.buildYear ? copy.card.builtYear(card.buildYear) : copy.card.builtUnknown]
      .filter(Boolean)
      .join(' · '),
  );
  return lines;
}

export function problemLine(card: ConsultCard): string | null {
  return card.problemType ? copy.card.problem(getProblemType(card.problemType).label) : null;
}

/** "확인이 필요한 것" 목록. 재산 이야기가 없으면 항상 재산을 포함한 소득 기준을 앞에 둔다. */
export function confirmLines(card: ConsultCard): string[] {
  const hasAsset = card.toConfirm.some((t) => t.includes('재산'));
  return hasAsset ? card.toConfirm : [copy.card.assetConfirm, ...card.toConfirm];
}
