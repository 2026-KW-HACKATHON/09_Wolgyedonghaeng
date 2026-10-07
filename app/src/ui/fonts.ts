import { useFonts } from 'expo-font';
import { GowunDodum_400Regular } from '@expo-google-fonts/gowun-dodum';

/** 글꼴 이름. 로딩 전에는 쓰지 않고 시스템 글꼴로 먼저 그린다. */
export const FONT = {
  voice: 'GowunDodum_400Regular',
  '400': 'Pretendard-Regular',
  '500': 'Pretendard-Medium',
  '700': 'Pretendard-Bold',
} as const;

/** 글꼴을 불러온다. 끝났으면 true (실패해도 true로 바꿔 시스템 글꼴로 계속 쓴다). */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    GowunDodum_400Regular,
    'Pretendard-Regular': require('../../assets/fonts/Pretendard-Regular.otf'),
    'Pretendard-Medium': require('../../assets/fonts/Pretendard-Medium.otf'),
    'Pretendard-Bold': require('../../assets/fonts/Pretendard-Bold.otf'),
  });
  return loaded || !!error;
}
