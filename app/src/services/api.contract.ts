import type {
  Address,
  AnalyzeInput,
  AnalyzeResponse,
  Building,
  HealthResponse,
  ProgramsFile,
} from './api.models';

/** 실제 API와 목 API가 같이 지키는 모양. */
export interface Api {
  getHealth(): Promise<HealthResponse>;
  fetchPrograms(): Promise<ProgramsFile>;
  analyze(input: AnalyzeInput): Promise<AnalyzeResponse>;
  reverseAddress(lat: number, lng: number): Promise<Address>;
  searchAddress(q: string): Promise<Address[]>;
  getBuilding(a: Pick<Address, 'sigunguCd' | 'bjdongCd' | 'platGbCd' | 'bun' | 'ji'>): Promise<Building>;
}
