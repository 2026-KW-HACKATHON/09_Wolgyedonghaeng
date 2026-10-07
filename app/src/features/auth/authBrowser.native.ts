import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { codeFromUrl } from './redirect';
import type { AuthBrowserResult } from './authBrowser';

WebBrowser.maybeCompleteAuthSession();

const APP_RETURN = () => makeRedirectUri({ scheme: 'jipgyeol', path: 'auth-callback' });

/** 중계용 웹 주소(EXPO_PUBLIC_AUTH_WEB_BASE)가 있으면 그 /auth-callback, 없으면 앱 주소. */
function webBase(): string | null {
  const b = process.env.EXPO_PUBLIC_AUTH_WEB_BASE?.trim().replace(/\/+$/, '');
  return b || null;
}

export function getRedirectUri(): string {
  const base = webBase();
  return base ? `${base}/auth-callback` : APP_RETURN();
}

export function getAppReturnUrl(): string | null {
  return webBase() ? APP_RETURN() : null;
}

export async function openAuth(url: string, redirectUri: string): Promise<AuthBrowserResult> {
  const res = await WebBrowser.openAuthSessionAsync(url, redirectUri);
  if (res.type !== 'success') return { status: 'cancel' };
  const code = codeFromUrl(res.url);
  return code ? { status: 'code', code } : { status: 'cancel' };
}

export function takeReturnTo(): string | null {
  return null;
}
