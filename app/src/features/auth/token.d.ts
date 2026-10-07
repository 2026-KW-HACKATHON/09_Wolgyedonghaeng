import type { AuthUser } from './AuthProvider';

export interface Session {
  token: string;
  user: AuthUser;
}

/** 앱 토큰과 사용자 표시 정보를 기기에 둔다 (앱: 보안 저장소, 웹: localStorage). */
export function loadSession(): Promise<Session | null>;
export function saveSession(s: Session): Promise<void>;
export function clearSession(): Promise<void>;
