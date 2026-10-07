import { Image } from 'expo-image';
import React from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { copy } from '../../config/copy';
import type { LocalImage } from '../../services/api.models';
import { BigButton, Voice, useTheme } from '../../ui';

interface Props {
  images: LocalImage[];
  /** 크게 보여 주는 사진 번호 */
  current: number;
  busy: boolean;
  onCamera: () => void;
  onAlbum: () => void;
}

/** 사진 칸. 너비 = 화면 − 40, 높이 = 화면의 45%. 웹은 가운데 열(480) 기준. */
export function PhotoBox({ images, current, busy, onCamera, onAlbum }: Props) {
  const { colors, radius, space, size } = useTheme();
  const win = useWindowDimensions();
  const width = Math.min(win.width, size.webColumn) - space.screen * 2;
  const height = Math.round(win.height * 0.45);
  const shown = images[current] ?? images[0];

  if (shown) {
    return (
      <View style={{ width, height, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface }}>
        <Image
          source={{ uri: shown.uri }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          accessibilityLabel={copy.home.photoLabel(Math.min(current, images.length - 1) + 1, images.length)}
        />
      </View>
    );
  }

  return (
    <View
      style={{
        width,
        minHeight: height,
        borderRadius: radius.lg,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        padding: space.lg,
        gap: space.lg,
      }}
    >
      <Voice style={{ textAlign: 'center' }}>{copy.home.emptyVoice}</Voice>
      <View style={{ alignSelf: 'stretch', gap: space.sm }}>
        <BigButton title={copy.home.takePhoto} onPress={onCamera} disabled={busy} />
        <BigButton variant="secondary" title={copy.home.pickPhoto} onPress={onAlbum} disabled={busy} />
      </View>
    </View>
  );
}

/** 64px 썸네일 줄. 누르면 위 칸에 크게 보인다. */
export function ThumbRow({
  images,
  current,
  onSelect,
}: {
  images: LocalImage[];
  current: number;
  onSelect: (i: number) => void;
}) {
  const { colors, radius, size, space } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: space.sm }}>
      {images.map((im, i) => {
        const selected = i === current;
        return (
          <Pressable
            key={im.uri}
            accessibilityRole="button"
            accessibilityLabel={copy.home.thumbLabel(i + 1)}
            accessibilityState={{ selected }}
            onPress={() => onSelect(i)}
            style={{
              width: size.thumb,
              height: size.thumb,
              borderRadius: radius.sm,
              overflow: 'hidden',
              borderWidth: selected ? 3 : 0,
              borderColor: colors.green,
            }}
          >
            <Image source={{ uri: im.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          </Pressable>
        );
      })}
    </View>
  );
}
