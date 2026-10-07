export type AuthBrowserResult = { status: 'code'; code: string } | { status: 'redirecting' } | { status: 'cancel' };

/** 카카오에 등록한 리다이렉트 주소. 카카오는 http(s) 주소만 받으므로 웹 주소의 /auth-callback 이다. */
export function getRedirectUri(): string;
/** 웹 주소가 로그인 결과를 앱으로 다시 넘길 주소 (jipgyeol:// 또는 exp://). 웹이거나 중계 주소가 없으면 null. */
export function getAppReturnUrl(): string | null;
/** 인가 URL 을 연다. 앱은 브라우저 창, 웹은 이 창을 옮긴다. */
export function openAuth(url: string, redirectUri: string, returnTo?: string): Promise<AuthBrowserResult>;
/** 웹 리다이렉트 전에 적어 둔 돌아갈 화면 (없으면 null) */
export function takeReturnTo(): string | null;
