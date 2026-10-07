import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** 휴대폰의 "동작 줄이기"가 켜져 있으면 true. 켜져 있으면 모든 모션을 끄고 즉시 전환한다. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => alive && setReduced(v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduced;
}
