import AsyncStorage from '@react-native-async-storage/async-storage';

// services/storage.ts 가 생기기 전의 작은 헬퍼. 같은 키 규칙(jipgyeol:v1:flag:*)을 따른다.
const KEY = 'jipgyeol:v1:flag:photoNotice';

/** 외부 AI 서비스 전송 안내를 이미 보여 줬는지 */
export async function hasSeenPhotoNotice(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === '1';
  } catch {
    return false;
  }
}

export async function markPhotoNoticeSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, '1');
  } catch {
    // 저장하지 못하면 다음에 한 번 더 보여 준다
  }
}
