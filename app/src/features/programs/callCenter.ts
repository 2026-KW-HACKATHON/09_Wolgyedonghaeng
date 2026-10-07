/** 전화 걸기용으로 숫자와 + 만 남긴다. */
export function digitsOnly(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}
