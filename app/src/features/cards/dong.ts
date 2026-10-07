import type { Address } from '../../services/api.models';

/**
 * 주소에서 동 단위까지만 남긴다 (번지·건물·호수는 카드에 싣지 않는다).
 * 지번 주소를 먼저 보고, 동을 못 찾으면 도로명 주소를 본다. 그래도 없으면 구까지, 그것도 없으면 null.
 */
export function dongOf(address: Pick<Address, 'road' | 'jibun'> | null | undefined): string | null {
  if (!address) return null;
  const texts = [address.jibun, address.road].filter((t): t is string => !!t);
  for (const text of texts) {
    const tokens = text.split(/\s+/).map((t) => t.replace(/[(),]/g, '')).filter(Boolean);
    const i = tokens.findIndex((t) => t.length >= 2 && /(?:동|\d가)$/.test(t) && !/^\d+동$/.test(t));
    if (i >= 0) {
      // 도로명 주소의 "(월계동)" 처럼 길 이름이 사이에 끼면 구 다음에 동을 붙인다
      const gu = tokens.findIndex((t) => /구$/.test(t));
      return (gu >= 0 && gu < i ? [...tokens.slice(0, gu + 1), tokens[i]] : tokens.slice(0, i + 1)).join(' ');
    }
  }
  for (const text of texts) {
    const tokens = text.split(/\s+/).filter(Boolean);
    const i = tokens.findIndex((t) => /구$/.test(t));
    if (i >= 0) return tokens.slice(0, i + 1).join(' ');
  }
  return null;
}
