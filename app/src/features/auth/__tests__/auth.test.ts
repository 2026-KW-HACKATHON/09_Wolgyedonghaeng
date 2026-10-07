import { parseAuthKind } from '../../../config/flags';
import { bridgeTarget, codeFromUrl, directCode, withReturnState } from '../redirect';
import { shouldPromptLogin } from '../loginPrompt';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../authBrowser', () => ({
  getRedirectUri: () => 'http://localhost/auth-callback',
  getAppReturnUrl: () => null,
  openAuth: jest.fn(),
  takeReturnTo: () => null,
}));
// 목 API(EXPO_PUBLIC_USE_MOCK_API=1)와 같은 응답을 쓴다
jest.mock('../../../services/api', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { mockApi } = require('../../../services/api.mock');
  return { getKakaoAuthUrl: mockApi.getKakaoAuthUrl, loginKakao: mockApi.loginKakao };
});
jest.mock('../token', () => ({
  loadSession: jest.fn(async () => null),
  saveSession: jest.fn(async () => {}),
  clearSession: jest.fn(async () => {}),
}));

// eslint-disable-next-line import/first
import { createAuth } from '../index';

describe('로그인 구현 선택', () => {
  it('기본은 kakao, noop 으로 바꿀 수 있다', () => {
    expect(parseAuthKind(undefined)).toBe('kakao');
    expect(parseAuthKind('kakao')).toBe('kakao');
    expect(parseAuthKind('noop')).toBe('noop');
    expect(parseAuthKind('x')).toBe('kakao');
    expect(createAuth('noop').enabled).toBe(false);
    expect(createAuth('kakao').enabled).toBe(true);
  });

  it('NoopAuth 는 항상 비로그인이다', async () => {
    const a = createAuth('noop');
    expect(await a.signIn()).toBeNull();
    expect(a.getUser()).toBeNull();
  });

  it('목 API 모드의 KakaoAuth 는 곧바로 가짜 사용자가 된다', async () => {
    const a = createAuth('kakao');
    const seen: number[] = [];
    a.subscribe(() => seen.push(1));
    const user = await a.signIn();
    expect(user).toEqual({ id: 'fake-1', nickname: '테스트' });
    expect(a.getUser()?.nickname).toBe('테스트');
    expect(a.getToken()).toBeTruthy();
    expect(seen.length).toBe(1);
    await a.signOut();
    expect(a.getUser()).toBeNull();
  });
});

describe('돌아온 주소', () => {
  it('code 를 꺼낸다', () => {
    expect(codeFromUrl('jipgyeol://auth-callback?code=abc%20d&state=1')).toBe('abc d');
    expect(codeFromUrl('http://x/auth-callback')).toBeNull();
    expect(directCode('http://x/auth-callback?code=fake', 'http://x/auth-callback')).toBe('fake');
    expect(directCode('https://kauth.kakao.com/oauth/authorize?code=1', 'http://x/auth-callback')).toBeNull();
  });
});

describe('로그인 안내 모달', () => {
  const base = { enabled: true, signedIn: false, seen: false, hide: false };
  it('처음 한 번만 보인다', () => {
    expect(shouldPromptLogin(base)).toBe(true);
    expect(shouldPromptLogin({ ...base, seen: true })).toBe(false);
    expect(shouldPromptLogin({ ...base, hide: true })).toBe(false);
    expect(shouldPromptLogin({ ...base, signedIn: true })).toBe(false);
    expect(shouldPromptLogin({ ...base, enabled: false })).toBe(false);
  });
});

describe('앱으로 넘기는 중계', () => {
  it('state 에 앱 주소를 실어 보낸다', () => {
    expect(withReturnState('https://kauth/x?a=1', 'jipgyeol://auth-callback')).toBe(
      'https://kauth/x?a=1&state=jipgyeol%3A%2F%2Fauth-callback',
    );
  });

  it('우리 앱 주소일 때만 code 를 붙여 돌려준다', () => {
    expect(bridgeTarget('jipgyeol://auth-callback', 'c1')).toBe('jipgyeol://auth-callback?code=c1');
    expect(bridgeTarget('exp://192.168.0.2:8081/--/auth-callback', 'c1')).toBe(
      'exp://192.168.0.2:8081/--/auth-callback?code=c1',
    );
  });

  it('다른 주소나 빈 값에는 code 를 넘기지 않는다', () => {
    expect(bridgeTarget('https://evil.example/x', 'c1')).toBeNull();
    expect(bridgeTarget('javascript:alert(1)', 'c1')).toBeNull();
    expect(bridgeTarget(undefined, 'c1')).toBeNull();
    expect(bridgeTarget('jipgyeol://auth-callback', undefined)).toBeNull();
  });
});
