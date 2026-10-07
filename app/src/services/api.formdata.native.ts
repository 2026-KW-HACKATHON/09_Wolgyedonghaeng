import { File } from 'expo-file-system';
import type { LocalImage } from './api.models';

/**
 * 네이티브: Expo 의 fetch 는 {uri, name, type} 객체를 못 올린다.
 * expo-file-system 의 File 은 Blob 처럼 읽혀서 그대로 FormData 에 넣을 수 있다.
 */
export async function appendImage(form: FormData, field: string, image: LocalImage): Promise<void> {
  form.append(field, new File(image.uri) as unknown as Blob, image.name);
}
