import type { View } from 'react-native';

export type SaveImageResult = 'saved' | 'downloaded' | 'denied' | 'failed';
export type ShareImageResult = 'shared' | 'cancelled' | 'downloaded' | 'failed';

/** 상담 카드 화면 영역을 PNG 로 만들어 앨범에 저장한다 (웹은 파일로 내려받는다). */
export function saveCardImage(view: View | null, fileName: string): Promise<SaveImageResult>;

/** 상담 카드 PNG 를 다른 앱으로 보낸다 (웹은 공유를 쓸 수 없으면 내려받는다). */
export function shareCardImage(view: View | null, fileName: string): Promise<ShareImageResult>;
