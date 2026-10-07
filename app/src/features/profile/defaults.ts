import type { Address, Household } from '../../services/api.models';
import type { Profile } from '../../services/storage';
import { isHouseholdComplete, showsHousingBenefit } from '../household/logic';

/** 저장된 정보로 시작하자고 물을 만한 값이 있는지 */
export function hasStartableProfile(p: Profile | null | undefined): p is Profile {
  return !!p && (!!p.household || !!p.address);
}

export interface FlowSlice {
  household: Partial<Household>;
  address?: Address;
}

/** 시작 화면에서 묻는 조건: 저장된 정보가 있고, 이번 검색의 해당 값이 비어 있다 */
export function shouldOfferProfile(p: Profile | null | undefined, flow: FlowSlice, scope: 'household' | 'address'): boolean {
  if (!hasStartableProfile(p)) return false;
  if (scope === 'household') return !!p.household && Object.keys(flow.household).length === 0;
  return !!p.address && !flow.address;
}

/** 저장된 정보를 흐름 상태에 채울 값. 이미 채워진 것은 건드리지 않는다. */
export function profileToFlowPatch(p: Profile, flow: FlowSlice): { household?: Partial<Household>; address?: Address } {
  const out: { household?: Partial<Household>; address?: Address } = {};
  if (p.household && Object.keys(flow.household).length === 0) out.household = { ...p.household };
  if (p.address && !flow.address) out.address = p.address;
  return out;
}

export type HouseholdDraft = Partial<Household>;

/** 내 정보 화면에서 저장할 수 있는 가구 값인지: 아무것도 안 적었거나, 필요한 질문에 모두 답했다. */
export function canSaveHousehold(d: HouseholdDraft): boolean {
  if (Object.keys(d).length === 0) return true;
  if (!d.size || !d.income || !d.tenure) return false;
  return !showsHousingBenefit(d.income) || !!d.housingBenefit;
}

/** 저장할 가구 값 (적은 것이 없으면 null). 가구 특성은 답이 없으면 null 로 둔다. */
export function draftToHousehold(d: HouseholdDraft): Household | null {
  if (Object.keys(d).length === 0 || !canSaveHousehold(d)) return null;
  return {
    size: d.size!,
    income: d.income!,
    housingBenefit: showsHousingBenefit(d.income) ? (d.housingBenefit ?? null) : null,
    tenure: d.tenure!,
    traits: d.traits ?? null,
  };
}

export { isHouseholdComplete };
