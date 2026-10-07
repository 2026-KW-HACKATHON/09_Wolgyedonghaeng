// 실행 설정 값. 구현 교체는 환경변수로 한다.
export type AuthKind = 'kakao' | 'noop';

/** EXPO_PUBLIC_AUTH=kakao|noop (기본 kakao) */
export function parseAuthKind(v: string | undefined): AuthKind {
  return v === 'noop' ? 'noop' : 'kakao';
}

export const AUTH_KIND: AuthKind = parseAuthKind(process.env.EXPO_PUBLIC_AUTH);
