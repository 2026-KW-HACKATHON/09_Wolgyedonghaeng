import type { Address } from '../../services/api.models';

/** 서울특별시 시도코드 */
export const SEOUL_SIDO_CD = '11';
export const OUT_OF_REGION_URL = 'https://www.bokjiro.go.kr';

export function isOutOfRegion(a: Pick<Address, 'sidoCd'>): boolean {
  return a.sidoCd !== SEOUL_SIDO_CD;
}
