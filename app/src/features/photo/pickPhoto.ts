import * as ImagePicker from 'expo-image-picker';
import type { LocalImage } from '../../services/api.models';
import { processImage } from './processImage';

export type PhotoSource = 'camera' | 'library';

export type PickResult =
  | { status: 'ok'; image: LocalImage }
  | { status: 'denied' | 'canceled' | 'failed' };

/**
 * 카메라나 앨범에서 사진 한 장을 받아 줄이고 EXIF를 지운 결과를 돌려준다.
 * 모바일 웹은 카메라, PC 웹은 파일 선택이 열린다 (expo-image-picker 웹 구현).
 */
export async function pickPhoto(source: PhotoSource): Promise<PickResult> {
  try {
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return { status: 'denied' };
    }
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
      exif: false,
    };
    const res =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync({ ...options, allowsMultipleSelection: false });
    if (res.canceled || res.assets.length === 0) return { status: 'canceled' };
    const a = res.assets[0];
    const image = await processImage(a.uri, a.width, a.height);
    return { status: 'ok', image };
  } catch {
    return { status: 'failed' };
  }
}
