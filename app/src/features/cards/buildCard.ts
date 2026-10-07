// 상담 카드 만들기. 사업 데이터와 지금까지 답한 내용(flow)을 한 장으로 모은다.
import { SaveFormat, manipulateAsync } from 'expo-image-manipulator';
import type {
  AnalyzeResponse,
  Building,
  Household,
  LocalImage,
  Program,
  ProgramsFile,
  Address,
} from '../../services/api.models';
import type { ConsultCard } from '../../services/storage';
import { mergeToConfirm, resolvePhone, findRecommendation } from '../programs/detail';
import { statusFields } from '../programs/resultRows';
import { dongOf } from './dong';

export const THUMB_WIDTH = 200;

export interface FlowSnapshot {
  household: Partial<Household>;
  address?: Address;
  building?: Building | null;
  result?: AnalyzeResponse;
  images: LocalImage[];
}

/** S1 에서 크기와 소득을 답했을 때만 가구 정보를 완성해 돌려준다. */
export function completeHousehold(h: Partial<Household>): Household | null {
  if (!h.size || !h.income) return null;
  return {
    size: h.size,
    income: h.income,
    housingBenefit: h.housingBenefit ?? null,
    tenure: h.tenure ?? 'unknown',
    traits: h.traits ?? null,
  };
}

/** "19850312" 같은 사용승인일에서 연도. 읽을 수 없으면 null. */
export function buildYearOf(building: Building | null | undefined): number | null {
  const y = parseInt((building?.useAprDay ?? '').slice(0, 4), 10);
  return Number.isFinite(y) && y > 1800 ? y : null;
}

/** 사진 한 장을 가로 200px 안팎의 JPEG data URI 로 줄인다. 실패하면 undefined (카드는 사진 없이 만든다). */
export async function makeThumb(image: LocalImage | undefined): Promise<string | undefined> {
  if (!image) return undefined;
  try {
    const out = await manipulateAsync(image.uri, [{ resize: { width: THUMB_WIDTH } }], {
      compress: 0.6,
      format: SaveFormat.JPEG,
      base64: true,
    });
    return out.base64 ? `data:image/jpeg;base64,${out.base64}` : undefined;
  } catch {
    return undefined;
  }
}

export function newCardId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** 사진 처리를 뺀 나머지. 순수 함수라 따로 시험한다. */
export function buildCardData(
  program: Program,
  file: ProgramsFile | null,
  flow: FlowSnapshot,
  now: Date = new Date(),
): ConsultCard {
  const rec = findRecommendation(flow.result, program.id);
  const phone = resolvePhone(program, file);
  const { state, nextMonth } = statusFields(rec?.applyState ?? program.apply.state, program.apply.nextText);
  const dong = dongOf(flow.address);
  return {
    id: newCardId(),
    programId: program.id,
    createdAt: now.toISOString(),
    household: completeHousehold(flow.household),
    address: dong ? { dong } : null,
    buildYear: buildYearOf(flow.building),
    problemType: flow.result?.classification.type ?? '',
    programName: program.name,
    placeName: phone.name || null,
    phone: phone.phone,
    applyState: state ?? null,
    nextMonth: nextMonth ?? null,
    toConfirm: mergeToConfirm(program, rec),
  };
}

export async function createCard(
  program: Program,
  file: ProgramsFile | null,
  flow: FlowSnapshot,
): Promise<ConsultCard> {
  const card = buildCardData(program, file, flow);
  const photoThumb = await makeThumb(flow.images[0]);
  return photoThumb ? { ...card, photoThumb } : card;
}
