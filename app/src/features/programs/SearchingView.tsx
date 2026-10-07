import React, { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { copy } from '../../config/copy';
import { Voice, useReducedMotion, useTheme } from '../../ui';

/** 숨 쉬는 로고 한 주기 (design.md 9절) */
const BREATH_MS = 3600;
const SENTENCE_MS = 4000;
const calm = Easing.bezier(0.45, 0, 0.55, 1);

/** S3. 로고가 숨 쉬고 문장이 4초마다 바뀐다. 스피너·진행률 막대 없음. 동작 줄이기가 켜져 있으면 멈춘다. */
export function SearchingView({ sentences }: { sentences?: readonly string[] }) {
  const { logo, space, motion } = useTheme();
  const reduced = useReducedMotion();
  const lines = sentences ?? [copy.searching.first, copy.searching.second];
  const [index, setIndex] = useState(0);
  const opacity = useSharedValue(reduced ? 1 : 0.55);

  useEffect(() => {
    if (reduced) {
      cancelAnimation(opacity);
      opacity.value = 1;
      return;
    }
    const half = BREATH_MS / 2;
    opacity.value = withRepeat(
      withSequence(withTiming(1, { duration: half, easing: calm }), withTiming(0.55, { duration: half, easing: calm })),
      -1,
    );
    return () => cancelAnimation(opacity);
  }, [reduced, opacity]);

  useEffect(() => {
    if (lines.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % lines.length), SENTENCE_MS);
    return () => clearInterval(t);
  }, [lines.length]);

  const logoStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={{ alignItems: 'center', gap: space.xl, paddingTop: space.xxl }}>
      <Animated.View style={logoStyle}>
        <Image source={logo} style={{ width: 160, height: 160 }} resizeMode="contain" accessibilityLabel={copy.searching.logoLabel} />
      </Animated.View>
      <Animated.View
        key={index}
        entering={reduced ? undefined : FadeIn.duration(motion.slow)}
        style={{ minHeight: 120 }}
      >
        <Voice accessibilityRole="header" accessibilityLiveRegion="polite" style={{ textAlign: 'center' }}>
          {lines[index % lines.length]}
        </Voice>
      </Animated.View>
    </View>
  );
}
