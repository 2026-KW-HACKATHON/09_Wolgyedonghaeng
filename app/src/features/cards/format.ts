/** ISO 시각을 "2026년 10월 7일" 로. 읽을 수 없으면 빈 글자. */
export function formatKoDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (day) return `${day[1]}년 ${Number(day[2])}월 ${Number(day[3])}일`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/** ISO 시각을 "10월 7일" 로 (목록용). */
export function formatShortDate(iso: string | null | undefined): string {
  const full = formatKoDate(iso);
  return full ? full.replace(/^\d+년 /, '') : '';
}
