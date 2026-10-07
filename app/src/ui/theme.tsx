import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme, type ImageSourcePropType, type TextStyle } from 'react-native';
import { FONT, useAppFonts } from './fonts';
import { base, dark, light, type ColorTokens, type FontWeight } from './tokens';

export type ThemeSetting = 'auto' | 'light' | 'dark';
export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'jipgyeol:v1:theme';

const LOGO_LIGHT = require('../../assets/brand/logo-green-on-light.png') as ImageSourcePropType;
const LOGO_DARK = require('../../assets/brand/logo-mint-on-dark.png') as ImageSourcePropType;

export interface Theme {
  colors: ColorTokens;
  mode: ThemeMode;
  setting: ThemeSetting;
  setSetting: (s: ThemeSetting) => void;
  logo: ImageSourcePropType;
  fontsReady: boolean;
  /** 글꼴 스타일. 로딩 전에는 시스템 글꼴 + fontWeight. */
  font: (weight: FontWeight | 'voice') => TextStyle;
  type: typeof base.type;
  space: typeof base.space;
  radius: typeof base.radius;
  size: typeof base.size;
  motion: typeof base.motion;
}

const ThemeContext = createContext<Theme | null>(null);

function build(
  mode: ThemeMode,
  setting: ThemeSetting,
  setSetting: (s: ThemeSetting) => void,
  fontsReady: boolean,
): Theme {
  return {
    colors: mode === 'dark' ? dark : light,
    mode,
    setting,
    setSetting,
    logo: mode === 'dark' ? LOGO_DARK : LOGO_LIGHT,
    fontsReady,
    font: (w) =>
      fontsReady
        ? { fontFamily: FONT[w] }
        : { fontWeight: w === 'voice' ? '400' : w },
    type: base.type,
    space: base.space,
    radius: base.radius,
    size: base.size,
    motion: base.motion,
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const fontsReady = useAppFonts();
  const [setting, setSettingState] = useState<ThemeSetting>('auto');

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (alive && (v === 'auto' || v === 'light' || v === 'dark')) setSettingState(v);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const setSetting = useCallback((s: ThemeSetting) => {
    setSettingState(s);
    AsyncStorage.setItem(STORAGE_KEY, s).catch(() => {});
  }, []);

  const mode: ThemeMode = setting === 'auto' ? (system === 'dark' ? 'dark' : 'light') : setting;

  const theme = useMemo(
    () => build(mode, setting, setSetting, fontsReady),
    [mode, setting, setSetting, fontsReady],
  );

  return (
    <ThemeContext.Provider value={theme}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  const t = useContext(ThemeContext);
  if (!t) throw new Error('useTheme은 ThemeProvider 안에서만 쓸 수 있어요');
  return t;
}

/** 상담 카드처럼 다크 모드에서도 라이트 값으로 그려야 하는 영역. */
export function ForceLight({ children }: { children: React.ReactNode }) {
  const parent = useTheme();
  const value = useMemo(
    () => build('light', parent.setting, parent.setSetting, parent.fontsReady),
    [parent.setting, parent.setSetting, parent.fontsReady],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
