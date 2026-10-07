// 앱이 쓰는 API 모델 타입. 서버 계약(api.types.ts, 생성물)에서 가져오고, 계약에 없는 요청 모델만 여기서 정한다 (spec 3.1, 3.3).
import type { components } from './api.types';

type S = components['schemas'];

export type Address = S['Address'];
export type Building = S['Building'];
export type AnalyzeResponse = S['AnalyzeResponse'];
export type Recommendation = S['Recommendation'];
export type Program = S['Program'];
export type ProgramsFile = S['ProgramsFile'];
export type HealthResponse = S['HealthResponse'];
export type ErrorBody = S['ErrorBody'];

export type IncomeBand = 'le48' | '48_60' | '60_100' | 'gt100' | 'unknown';
export type YesNoUnknown = 'yes' | 'no' | 'unknown';
export type Tenure = 'own' | 'rent' | 'public_rent' | 'unknown';
export type Trait = 'elderly65' | 'disabled' | 'welfare';
export type ProblemType = Program['problemTypes'][number];

export interface Household {
  size: number;
  income: IncomeBand;
  /** income 이 le48 이 아니면 null */
  housingBenefit: YesNoUnknown | null;
  tenure: Tenure;
  /** 'none' = 해당 없음, null = 답 안 함 */
  traits: Trait[] | 'none' | null;
}

/** 축소·EXIF 제거를 마친 사진 */
export interface LocalImage {
  uri: string;
  width: number;
  height: number;
  name: string;
  type: 'image/jpeg';
}

export interface AnalyzeInput {
  images: LocalImage[];
  household: Household;
  address?: Address | null;
  building?: Building | null;
  overrideType?: ProblemType | null;
}
