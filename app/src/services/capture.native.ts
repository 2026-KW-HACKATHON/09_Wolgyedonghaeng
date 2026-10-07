import * as MediaLibrary from 'expo-media-library/legacy';
import * as Sharing from 'expo-sharing';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import type { SaveImageResult, ShareImageResult } from './capture';

async function toPng(view: View | null): Promise<string | null> {
  if (!view) return null;
  try {
    return await captureRef(view, { format: 'png', quality: 1, result: 'tmpfile' });
  } catch {
    return null;
  }
}

export async function saveCardImage(view: View | null, _fileName: string): Promise<SaveImageResult> {
  const uri = await toPng(view);
  if (!uri) return 'failed';
  try {
    const perm = await MediaLibrary.requestPermissionsAsync(true);
    if (!perm.granted) return 'denied';
    await MediaLibrary.saveToLibraryAsync(uri);
    return 'saved';
  } catch {
    return 'failed';
  }
}

export async function shareCardImage(view: View | null, _fileName: string): Promise<ShareImageResult> {
  const uri = await toPng(view);
  if (!uri) return 'failed';
  try {
    if (!(await Sharing.isAvailableAsync())) return 'failed';
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: '상담 준비 카드' });
    return 'shared';
  } catch {
    return 'failed';
  }
}
