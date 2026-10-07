import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { codeFromUrl } from './redirect';
import type { AuthBrowserResult } from './authBrowser';

WebBrowser.maybeCompleteAuthSession();

export function getRedirectUri(): string {
  return makeRedirectUri({ scheme: 'jipgyeol', path: 'auth-callback' });
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
