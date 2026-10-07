import type { AuthUser } from '../../services/api.models';

export type { AuthUser };

/** 로그인 구현이 지켜야 하는 모양 (spec 6.4). 구현은 index.ts 에서 설정으로 고른다. */
export interface AuthProvider {
  /** false 이면 로그인 버튼과 안내 모달을 보이지 않는다 */
  readonly enabled: boolean;
  /** 기기에 저장된 로그인 상태를 읽는다. 앱을 켤 때 한 번 */
  init(): Promise<void>;
  /** 로그인을 시작한다. 이 자리에서 끝나면 사용자, 취소하면 null. 웹 리다이렉트는 돌아온 뒤 completeSignIn 이 끝낸다 */
  signIn(returnTo?: string): Promise<AuthUser | null>;
  /** 돌아온 주소의 code 로 로그인을 끝낸다 */
  completeSignIn(code: string): Promise<AuthUser>;
  signOut(): Promise<void>;
  getUser(): AuthUser | null;
  /** 서버에 보낼 앱 토큰 (비로그인이면 null) */
  getToken(): string | null;
  subscribe(listener: () => void): () => void;
}
