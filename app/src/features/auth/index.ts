import { useSyncExternalStore } from 'react';
import { AUTH_KIND, type AuthKind } from '../../config/flags';
import type { AuthProvider, AuthUser } from './AuthProvider';
import { KakaoAuth } from './KakaoAuth';
import { NoopAuth } from './NoopAuth';

export type { AuthProvider, AuthUser };

export function createAuth(kind: AuthKind): AuthProvider {
  return kind === 'noop' ? new NoopAuth() : new KakaoAuth();
}

/** 앱 전체가 쓰는 로그인 구현 (EXPO_PUBLIC_AUTH 로 고른다). */
export const auth: AuthProvider = createAuth(AUTH_KIND);

export function useAuthUser(): AuthUser | null {
  return useSyncExternalStore(
    (l) => auth.subscribe(l),
    () => auth.getUser(),
    () => null,
  );
}
