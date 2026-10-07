import { Stack } from 'expo-router';
import { useEffect, useSyncExternalStore } from 'react';
import { preloadPrograms } from '../src/services/api';
import { ThemeProvider } from '../src/ui';

const subscribe = () => () => {};
/** 서버(정적 내보내기)에서는 false, 브라우저·앱에서는 true. 하이드레이션 중에는 false. */
const useHydrated = () => useSyncExternalStore(subscribe, () => true, () => false);

export default function RootLayout() {
  // 웹 정적 내보내기는 항상 라이트로 그려 둔다. 다크 기기에서 첫 화면이 라이트 색으로 굳지 않도록
  // 화면은 첫 그리기(하이드레이션) 이후에 그린다.
  const mounted = useHydrated();

  useEffect(() => {
    // 사업 목록을 미리 받아 둔다 (오프라인에서도 상세 화면이 열리도록)
    preloadPrograms();
  }, []);

  return (
    <ThemeProvider>
      {mounted ? (
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="household" />
          <Stack.Screen name="address" />
          <Stack.Screen name="results" />
          <Stack.Screen name="design-demo" />
        </Stack>
      ) : null}
    </ThemeProvider>
  );
}
