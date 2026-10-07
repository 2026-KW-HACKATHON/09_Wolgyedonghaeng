import type { AuthBrowserResult } from './authBrowser';

const RETURN_KEY = 'jipgyeol:v1:authReturn';

export function getRedirectUri(): string {
  return `${globalThis.location.origin}/auth-callback`;
}

export async function openAuth(url: string, _redirectUri: string, returnTo?: string): Promise<AuthBrowserResult> {
  try {
    if (returnTo) globalThis.sessionStorage?.setItem(RETURN_KEY, returnTo);
  } catch {
    // 돌아갈 화면을 적지 못하면 홈으로 돌아온다
  }
  globalThis.location.assign(url);
  return { status: 'redirecting' };
}

export function takeReturnTo(): string | null {
  try {
    const v = globalThis.sessionStorage?.getItem(RETURN_KEY) ?? null;
    globalThis.sessionStorage?.removeItem(RETURN_KEY);
    return v;
  } catch {
    return null;
  }
}
