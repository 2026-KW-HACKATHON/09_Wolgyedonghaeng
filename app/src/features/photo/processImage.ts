import { SaveFormat, manipulateAsync, type Action } from 'expo-image-manipulator';
import type { LocalImage } from '../../services/api.models';

export const MAX_LONG_SIDE = 1024;
export const JPEG_QUALITY = 0.8;

/** 긴 변이 1024를 넘으면 줄이는 동작. 넘지 않으면 크기는 그대로 둔다. */
export function resizeActions(width: number, height: number): Action[] {
  const long = Math.max(width, height);
  if (!long || long <= MAX_LONG_SIDE) return [];
  return width >= height ? [{ resize: { width: MAX_LONG_SIDE } }] : [{ resize: { height: MAX_LONG_SIDE } }];
}

/**
 * 사진을 긴 변 1024 이하로 줄이고 JPEG 0.8로 다시 저장한다.
 * 다시 저장하면 EXIF(위치·기기 정보)가 사라진다 (spec 6.1). 크기가 작아도 항상 다시 저장한다.
 */
export async function processImage(uri: string, width: number, height: number): Promise<LocalImage> {
  const out = await manipulateAsync(uri, resizeActions(width, height), {
    compress: JPEG_QUALITY,
    format: SaveFormat.JPEG,
  });
  return {
    uri: out.uri,
    width: out.width,
    height: out.height,
    name: `photo-${Date.now()}.jpg`,
    type: 'image/jpeg',
  };
}
