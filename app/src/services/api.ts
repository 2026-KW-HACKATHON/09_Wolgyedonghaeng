// 앱이 서버와 이야기하는 유일한 곳. EXPO_PUBLIC_USE_MOCK_API=1 이면 서버 없이 목 구현으로 동작한다.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockApi } from './api.mock';
import { realApi } from './api.real';
import type { Api } from './api.contract';
import type { ProgramsFile } from './api.models';

export { ApiError, isApiError } from './api.error';
export * from './api.models';

export const USE_MOCK_API = process.env.EXPO_PUBLIC_USE_MOCK_API === '1';

const impl: Api = USE_MOCK_API ? mockApi : realApi;

const PROGRAMS_KEY = 'jipgyeol:v1:programs';

let memoryPrograms: ProgramsFile | null = null;

export const getHealth: Api['getHealth'] = () => impl.getHealth();
export const analyze: Api['analyze'] = (input) => impl.analyze(input);
export const reverseAddress: Api['reverseAddress'] = (lat, lng) => impl.reverseAddress(lat, lng);
export const searchAddress: Api['searchAddress'] = (q) => impl.searchAddress(q);
export const getBuilding: Api['getBuilding'] = (a) => impl.getBuilding(a);

/** 이미 받은 사업 목록 (없으면 null). 화면이 바로 그릴 때 쓴다. */
export function getCachedPrograms(): ProgramsFile | null {
  return memoryPrograms;
}

/**
 * 사업 목록. 서버에서 받아 메모리와 AsyncStorage에 두고, 실패하면 저장해 둔 것을 쓴다.
 * 둘 다 없으면 ApiError 를 던진다.
 */
export async function getPrograms(): Promise<ProgramsFile> {
  try {
    const fresh = await impl.fetchPrograms();
    memoryPrograms = fresh;
    AsyncStorage.setItem(PROGRAMS_KEY, JSON.stringify(fresh)).catch(() => {});
    return fresh;
  } catch (e) {
    if (memoryPrograms) return memoryPrograms;
    try {
      const raw = await AsyncStorage.getItem(PROGRAMS_KEY);
      if (raw) {
        memoryPrograms = JSON.parse(raw) as ProgramsFile;
        return memoryPrograms;
      }
    } catch {
      // 저장된 것도 못 읽으면 원래 오류를 던진다
    }
    throw e;
  }
}

/** 앱을 켤 때 미리 불러 둔다. 실패해도 조용히 넘어간다. */
export function preloadPrograms(): void {
  getPrograms().catch(() => {});
}
