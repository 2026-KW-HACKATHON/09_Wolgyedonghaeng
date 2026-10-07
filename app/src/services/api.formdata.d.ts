// 실제 구현은 api.formdata.web.ts / api.formdata.native.ts (Metro가 플랫폼에 맞게 고른다)
import type { LocalImage } from './api.models';

export function appendImage(form: FormData, field: string, image: LocalImage): Promise<void>;
