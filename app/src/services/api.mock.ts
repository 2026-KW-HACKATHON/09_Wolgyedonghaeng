// 서버 없이 앱이 동작하게 하는 목 API. EXPO_PUBLIC_USE_MOCK_API=1 일 때 api.ts 가 이 구현을 쓴다.
// 응답은 contracts/examples/*.json 의 복사본(mock/examples)이다. 복사: npm run sync-contracts
import examplesConfirm from './mock/examples/analyze-confirm.json';
import examplesEmpty from './mock/examples/analyze-empty.json';
import examplesError from './mock/examples/analyze-error.json';
import examplesNormal from './mock/examples/analyze-normal.json';
import examplesOther from './mock/examples/analyze-other.json';
import programs from './mock/programs.json';
import { ApiError } from './api.error';
import type { Api } from './api.contract';
import type {
  Address,
  AnalyzeResponse,
  AuthResponse,
  Building,
  HealthResponse,
  ProgramsFile,
  RemoteProfile,
} from './api.models';

export type MockScenario = 'normal' | 'confirm' | 'other' | 'empty' | 'error';

const SCENARIOS: MockScenario[] = ['normal', 'confirm', 'other', 'empty', 'error'];

let forced: MockScenario | null = null;

/** 테스트나 시연에서 다음 analyze 응답 종류를 고정한다. null 이면 힌트를 따른다. */
export function setMockScenario(s: MockScenario | null): void {
  forced = s;
}

function isScenario(v: unknown): v is MockScenario {
  return typeof v === 'string' && (SCENARIOS as string[]).includes(v);
}

/** 우선순위: setMockScenario > 웹 주소의 ?mock=종류 > EXPO_PUBLIC_MOCK_SCENARIO > normal */
function currentScenario(): MockScenario {
  if (forced) return forced;
  try {
    const search = (globalThis as { location?: { search?: string } }).location?.search;
    if (search) {
      const v = new URLSearchParams(search).get('mock');
      if (isScenario(v)) return v;
    }
  } catch {
    // 웹이 아니면 무시
  }
  const env = process.env.EXPO_PUBLIC_MOCK_SCENARIO;
  return isScenario(env) ? env : 'normal';
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const WOLGYE = { sidoCd: '11', sigunguCd: '11350', bjdongCd: '10100', platGbCd: '0' as const };

export const MOCK_ADDRESSES: Address[] = [
  { road: '서울특별시 노원구 월계로 45길 12', jibun: '서울특별시 노원구 월계동 12-3', ...WOLGYE, bun: '0012', ji: '0003' },
  { road: '서울특별시 노원구 월계로 45길 20', jibun: '서울특별시 노원구 월계동 25-7', ...WOLGYE, bun: '0025', ji: '0007' },
  { road: '서울특별시 노원구 광운로 21길 8', jibun: '서울특별시 노원구 월계동 410-2', ...WOLGYE, bun: '0410', ji: '0002' },
  {
    road: '부산광역시 해운대구 해운대해변로 264',
    jibun: '부산광역시 해운대구 우동 1411',
    sidoCd: '26',
    sigunguCd: '26350',
    bjdongCd: '10500',
    platGbCd: '0',
    bun: '1411',
    ji: '0000',
  },
];

export const MOCK_BUILDING: Building = {
  useAprDay: '1985-06-20',
  mainPurpose: '단독주택',
  grndFlrCnt: 2,
  ugrndFlrCnt: 0,
  fetchedOk: true,
};

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export const mockApi: Api = {
  async getHealth() {
    await sleep(100);
    const base = examplesNormal.version;
    return { ok: true, version: clone(base), mock: ['openrouter', 'address', 'building', 'kakao'] } as HealthResponse;
  },

  async fetchPrograms() {
    await sleep(100);
    return clone(programs) as unknown as ProgramsFile;
  },

  async analyze(input) {
    await sleep(1200);
    const scenario = currentScenario();

    // 유형을 직접 고친 경우: 분류 없이 목록만 새로 받는다 (정상 응답에 고친 유형을 얹는다)
    if (input.overrideType && scenario !== 'error' && scenario !== 'empty') {
      const res = clone(examplesNormal) as unknown as AnalyzeResponse;
      res.classification = {
        ...res.classification,
        type: input.overrideType,
        confidence: 1,
        source: 'user',
        overridden: true,
      } as AnalyzeResponse['classification'];
      return res;
    }

    switch (scenario) {
      case 'confirm':
        return clone(examplesConfirm) as unknown as AnalyzeResponse;
      case 'other':
        return clone(examplesOther) as unknown as AnalyzeResponse;
      case 'empty':
        return clone(examplesEmpty) as unknown as AnalyzeResponse;
      case 'error': {
        const e = examplesError.error;
        throw new ApiError(e.code, e.message, 502);
      }
      default:
        return clone(examplesNormal) as unknown as AnalyzeResponse;
    }
  },

  async reverseAddress() {
    await sleep(700);
    return clone(MOCK_ADDRESSES[0]);
  },

  async searchAddress(q) {
    await sleep(300);
    const t = q.trim();
    if (!t) return [];
    const hits = MOCK_ADDRESSES.filter((a) => a.road.includes(t) || (a.jibun ?? '').includes(t));
    return clone(hits.length > 0 ? hits : t.length >= 2 ? MOCK_ADDRESSES.slice(0, 3) : []);
  },

  // 서버 가짜 모드와 같은 결과: 인가 URL 은 앱 자신으로 돌아오고, 어떤 code 든 가짜 사용자가 된다
  async getKakaoAuthUrl(redirectUri) {
    await sleep(100);
    return `${redirectUri}${redirectUri.includes('?') ? '&' : '?'}code=fake`;
  },

  async loginKakao() {
    await sleep(100);
    return { token: 'mock-token', user: { id: 'fake-1', nickname: '테스트' } } as AuthResponse;
  },

  async putMyProfile(_token, profile) {
    await sleep(100);
    return clone(profile) as RemoteProfile;
  },

  async getBuilding() {
    await sleep(400);
    return clone(MOCK_BUILDING);
  },
};
