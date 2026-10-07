import { getFlag, setFlag } from '../../services/storage';

export const LOGIN_PROMPT_SEEN = 'loginPromptSeen';
export const LOGIN_PROMPT_HIDE = 'loginPromptHide';

/** 로그인 안내는 로그인을 쓸 수 있고, 비로그인이고, 처음이며, "다시 보지 않기"를 누르지 않았을 때만 보인다. */
export function shouldPromptLogin(s: { enabled: boolean; signedIn: boolean; seen: boolean; hide: boolean }): boolean {
  return s.enabled && !s.signedIn && !s.seen && !s.hide;
}

export async function readPromptFlags(): Promise<{ seen: boolean; hide: boolean }> {
  const [seen, hide] = await Promise.all([getFlag(LOGIN_PROMPT_SEEN), getFlag(LOGIN_PROMPT_HIDE)]);
  return { seen, hide };
}

export const markPromptSeen = () => setFlag(LOGIN_PROMPT_SEEN, true);
export const markPromptHidden = () => setFlag(LOGIN_PROMPT_HIDE, true);
