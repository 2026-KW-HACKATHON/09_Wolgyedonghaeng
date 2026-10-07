import { getKakaoAuthUrl, loginKakao } from '../../services/api';
import { createLocalStorage, createRemoteStorage, migrateLocalToRemote } from '../../services/storage';
import type { AuthProvider, AuthUser } from './AuthProvider';
import { getAppReturnUrl, getRedirectUri, openAuth } from './authBrowser';
import { directCode, withReturnState } from './redirect';
import { clearSession, loadSession, saveSession } from './token';

/** 카카오 OAuth: 서버에서 인가 URL 을 받고, 돌아온 code 를 서버가 토큰으로 바꾼다. */
export class KakaoAuth implements AuthProvider {
  readonly enabled = true;
  private user: AuthUser | null = null;
  private token: string | null = null;
  private listeners = new Set<() => void>();

  private emit() {
    this.listeners.forEach((l) => l());
  }

  async init() {
    const s = await loadSession();
    if (s) {
      this.user = s.user;
      this.token = s.token;
      this.emit();
    }
  }

  async signIn(returnTo?: string) {
    const redirectUri = getRedirectUri();
    const authUrl = await getKakaoAuthUrl(redirectUri);
    const code = directCode(authUrl, redirectUri);
    if (code) return this.completeSignIn(code);
    // 앱: 카카오는 웹 주소로 돌려보내고, 그 페이지가 state 의 앱 주소로 code 를 다시 넘긴다
    const back = getAppReturnUrl();
    const url = back ? withReturnState(authUrl, back) : authUrl;
    const res = await openAuth(url, back ?? redirectUri, returnTo);
    if (res.status === 'code') return this.completeSignIn(res.code);
    return null;
  }

  async completeSignIn(code: string) {
    const res = await loginKakao(code, getRedirectUri());
    this.user = res.user;
    this.token = res.token;
    await saveSession({ token: res.token, user: res.user });
    this.emit();
    // 기기에 있는 저장 값을 원격 저장소로 올린다 (원격 구현은 아직 스텁)
    migrateLocalToRemote(createLocalStorage(), createRemoteStorage()).catch(() => {});
    return res.user;
  }

  async signOut() {
    this.user = null;
    this.token = null;
    await clearSession();
    this.emit();
  }

  getUser() {
    return this.user;
  }

  getToken() {
    return this.token;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
