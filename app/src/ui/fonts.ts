import { useFonts } from 'expo-font';

/** 글꼴 이름. 로딩 전에는 쓰지 않고 시스템 글꼴로 먼저 그린다. */
export const FONT = {
  // 집결의 말(Voice)도 Pretendard Medium. 얇은 획의 글꼴이라 읽기 어렵다는 의견이 있어 바꿨다 (2026-10-08)
  voice: 'Pretendard-Medium',
  '400': 'Pretendard-Regular',
  '500': 'Pretendard-Medium',
  '700': 'Pretendard-Bold',
} as const;

/** 글꼴을 불러온다. 끝났으면 true (실패해도 true로 바꿔 시스템 글꼴로 계속 쓴다). */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    'Pretendard-Regular': require('../../assets/fonts/Pretendard-Regular.otf'),
    'Pretendard-Medium': require('../../assets/fonts/Pretendard-Medium.otf'),
    'Pretendard-Bold': require('../../assets/fonts/Pretendard-Bold.otf'),
  });
  return loaded || !!error;
}
