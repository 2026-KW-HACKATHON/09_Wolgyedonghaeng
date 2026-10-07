export type AuthBrowserResult = { status: 'code'; code: string } | { status: 'redirecting' } | { status: 'cancel' };

/** 카카오 로그인이 돌아올 주소 (앱 스킴 또는 웹 주소의 /auth-callback). */
export function getRedirectUri(): string;
/** 인가 URL 을 연다. 앱은 브라우저 창, 웹은 이 창을 옮긴다. */
export function openAuth(url: string, redirectUri: string, returnTo?: string): Promise<AuthBrowserResult>;
/** 웹 리다이렉트 전에 적어 둔 돌아갈 화면 (없으면 null) */
export function takeReturnTo(): string | null;
