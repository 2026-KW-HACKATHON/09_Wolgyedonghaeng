import { ApiError } from './api.error';
import { appendImage } from './api.formdata';
import type { Api } from './api.contract';
import type { Address, AnalyzeResponse, Building, HealthResponse, ProgramsFile } from './api.models';

const BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000').replace(/\/+$/, '');

const TIMEOUT_MS = { default: 8000, address: 6000, analyze: 30000 } as const;

async function request<T>(path: string, init: RequestInit = {}, timeoutMs: number = TIMEOUT_MS.default): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...init, signal: controller.signal });
  } catch (e) {
    throw (e as { name?: string })?.name === 'AbortError' ? ApiError.timeout() : ApiError.network();
  } finally {
    clearTimeout(timer);
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const err = (body as { error?: { code?: string; message?: string } } | null)?.error;
    if (err?.code && err.message) throw new ApiError(err.code, err.message, res.status);
    throw ApiError.unknown(res.status);
  }
  if (body === null) throw ApiError.unknown(res.status);
  return body as T;
}

function qs(params: Record<string, string | number>): string {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
}

export const realApi: Api = {
  getHealth: () => request<HealthResponse>('/health'),

  fetchPrograms: () => request<ProgramsFile>('/programs'),

  async analyze(input) {
    const form = new FormData();
    form.append('household', JSON.stringify(input.household));
    form.append('address', input.address ? JSON.stringify(input.address) : 'null');
    form.append('building', input.building ? JSON.stringify(input.building) : 'null');
    if (input.overrideType) form.append('overrideType', input.overrideType);
    try {
      for (const image of input.images) await appendImage(form, 'images[]', image);
    } catch {
      throw ApiError.unknown();
    }
    return request<AnalyzeResponse>('/analyze', { method: 'POST', body: form }, TIMEOUT_MS.analyze);
  },

  reverseAddress: (lat, lng) =>
    request<Address>(`/address/reverse?${qs({ lat, lng })}`, {}, TIMEOUT_MS.address),

  searchAddress: (q) => request<Address[]>(`/address/search?${qs({ q })}`, {}, TIMEOUT_MS.address),

  getBuilding: (a) =>
    request<Building>(
      `/building?${qs({ sigunguCd: a.sigunguCd, bjdongCd: a.bjdongCd, platGbCd: a.platGbCd, bun: a.bun, ji: a.ji })}`,
      {},
      TIMEOUT_MS.address,
    ),
};
