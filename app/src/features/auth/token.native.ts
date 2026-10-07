import * as SecureStore from 'expo-secure-store';
import type { Session } from './token';

const KEY = 'jipgyeol.session.v1';

export async function loadSession(): Promise<Session | null> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export async function saveSession(s: Session): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(s));
  } catch {
    // 저장하지 못해도 이번 실행 동안은 로그인 상태로 둔다
  }
}

export async function clearSession(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {
    // 이미 없으면 그대로 둔다
  }
}
