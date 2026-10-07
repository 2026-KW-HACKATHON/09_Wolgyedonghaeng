import type { AuthProvider } from './AuthProvider';

/** 항상 비로그인. 로그인 버튼이 아무것도 하지 않는다. */
export class NoopAuth implements AuthProvider {
  readonly enabled = false;
  async init() {}
  async signIn() {
    return null;
  }
  async completeSignIn(): Promise<never> {
    throw new Error('로그인을 쓰지 않는 설정이에요');
  }
  async signOut() {}
  getUser() {
    return null;
  }
  getToken() {
    return null;
  }
  subscribe() {
    return () => {};
  }
}
