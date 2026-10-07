import type { Session } from './token';

const KEY = 'jipgyeol:v1:session';

export async function loadSession(): Promise<Session | null> {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export async function saveSession(s: Session): Promise<void> {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(s));
  } catch {
    // 저장하지 못해도 이번 실행 동안은 로그인 상태로 둔다
  }
}

export async function clearSession(): Promise<void> {
  try {
    globalThis.localStorage?.removeItem(KEY);
  } catch {
    // 이미 없으면 그대로 둔다
  }
}
