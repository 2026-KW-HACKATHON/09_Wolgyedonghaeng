import type { LocalImage } from './api.models';

/** 웹: uri(blob/data)를 Blob으로 읽어 붙인다. */
export async function appendImage(form: FormData, field: string, image: LocalImage): Promise<void> {
  const res = await fetch(image.uri);
  const blob = await res.blob();
  form.append(field, blob, image.name);
}
