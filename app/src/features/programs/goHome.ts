import type { useRouter } from 'expo-router';

type Router = ReturnType<typeof useRouter>;

/** 홈으로 돌아가며 쌓인 화면을 모두 닫는다. 스택에 홈이 두 번 남지 않게 한다. */
export function goHomeClean(router: Router): void {
  if (router.canDismiss()) {
    router.dismissAll();
  } else {
    router.replace('/');
  }
}
