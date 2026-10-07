import React, { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { copy } from '../../config/copy';
import { Body, Label, useTheme, type ThemeSetting } from '../../ui';

const OPTIONS: [ThemeSetting, string][] = [
  ['auto', copy.home.themeAuto],
  ['light', copy.home.themeLight],
  ['dark', copy.home.themeDark],
];

function TopTextButton({ title, label, onPress }: { title: string; label: string; onPress?: () => void }) {
  const { size } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: size.touch,
        minWidth: size.touch,
        paddingHorizontal: 8,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Body tone="inkSoft" style={{ textDecorationLine: 'underline' }}>
        {title}
      </Body>
    </Pressable>
  );
}

/** 로고, 화면 밝기 메뉴, 로그인 자리. 로고는 홈에서만 쓴다 (design.md 1절). */
export function HomeTopBar({ onPressLogin }: { onPressLogin?: () => void }) {
  const { logo, setting, setSetting, colors, radius, size, space } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={{ gap: space.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Image
          source={logo}
          style={{ width: 40, height: 40 }}
          resizeMode="contain"
          accessibilityLabel={copy.home.logoLabel}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TopTextButton
            title={copy.home.themeMenu}
            label={copy.home.themeMenuLabel}
            onPress={() => setOpen((v) => !v)}
          />
          <TopTextButton title={copy.home.login} label={copy.home.loginLabel} onPress={onPressLogin} />
        </View>
      </View>
      {open ? (
        <View style={{ flexDirection: 'row', gap: space.xs }} accessibilityRole="radiogroup">
          {OPTIONS.map(([key, name]) => {
            const selected = setting === key;
            return (
              <Pressable
                key={key}
                accessibilityRole="radio"
                accessibilityLabel={name}
                accessibilityState={{ selected, checked: selected }}
                onPress={() => setSetting(key)}
                style={({ pressed }) => ({
                  flex: 1,
                  minHeight: size.touch,
                  borderRadius: radius.sm,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: selected ? colors.green : colors.surface,
                  borderWidth: selected ? 0 : size.borderWidth,
                  borderColor: colors.line,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Label style={{ color: selected ? colors.onGreen : colors.ink }}>{name}</Label>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
