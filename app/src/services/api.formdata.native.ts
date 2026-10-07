import type { LocalImage } from './api.models';

/** 네이티브: React Native가 {uri, name, type} 객체를 파일로 올린다. */
export async function appendImage(form: FormData, field: string, image: LocalImage): Promise<void> {
  form.append(field, { uri: image.uri, name: image.name, type: image.type } as unknown as Blob);
}
