/** 돌아온 주소에서 code 를 꺼낸다 (없으면 null). 주소 전체는 로그에 남기지 않는다. */
export function codeFromUrl(url: string): string | null {
  const q = url.split('#')[0].split('?')[1];
  if (!q) return null;
  for (const part of q.split('&')) {
    const [k, v] = part.split('=');
    if (k === 'code' && v) return decodeURIComponent(v);
  }
  return null;
}

/** 인가 URL 이 이미 앱 자신으로 돌아오는 주소(서버 가짜 모드·목 API)이면 브라우저를 열 필요가 없다. */
export function directCode(url: string, redirectUri: string): string | null {
  return url.startsWith(redirectUri) ? codeFromUrl(url) : null;
}

const APP_SCHEMES = ['jipgyeol://', 'exp://', 'exps://'];

/** 인가 URL 에 앱 복귀 주소를 state 로 실어 보낸다. */
export function withReturnState(url: string, appReturnUrl: string): string {
  return `${url}${url.includes('?') ? '&' : '?'}state=${encodeURIComponent(appReturnUrl)}`;
}

/**
 * 웹 /auth-callback 이 받은 code 를 앱으로 넘길 주소. state 가 우리 앱 주소(jipgyeol://, exp://)일 때만 만든다.
 * 그 밖의 주소로는 code 를 보내지 않는다.
 */
export function bridgeTarget(state: string | undefined, code: string | undefined): string | null {
  if (!state || !code) return null;
  if (!APP_SCHEMES.some((s) => state.startsWith(s))) return null;
  return `${state}${state.includes('?') ? '&' : '?'}code=${encodeURIComponent(code)}`;
}
