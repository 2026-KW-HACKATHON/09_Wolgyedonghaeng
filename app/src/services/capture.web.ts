import { toPng } from 'html-to-image';
import type { View } from 'react-native';
import type { SaveImageResult, ShareImageResult } from './capture';

// 웹에서 react-native-web 의 View 참조는 DOM 요소다.
async function render(view: View | null): Promise<Blob | null> {
  const node = view as unknown as HTMLElement | null;
  if (!node || typeof node.getBoundingClientRect !== 'function') return null;
  try {
    const dataUrl = await toPng(node, { pixelRatio: 2, cacheBust: true });
    const res = await fetch(dataUrl);
    return await res.blob();
  } catch {
    return null;
  }
}

function download(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function saveCardImage(view: View | null, fileName: string): Promise<SaveImageResult> {
  const blob = await render(view);
  if (!blob) return 'failed';
  download(blob, fileName);
  return 'downloaded';
}

export async function shareCardImage(view: View | null, fileName: string): Promise<ShareImageResult> {
  const blob = await render(view);
  if (!blob) return 'failed';
  const file = new File([blob], fileName, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  try {
    if (typeof nav.share === 'function' && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], title: '상담 준비 카드' });
      return 'shared';
    }
  } catch (e) {
    // 사용자가 공유 창을 닫은 경우는 실패로 보지 않는다
    if (e instanceof Error && e.name === 'AbortError') return 'cancelled';
  }
  download(blob, fileName);
  return 'downloaded';
}
