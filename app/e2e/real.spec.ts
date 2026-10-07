// 실서버(가짜 모드) 연결 웹 E2E. 서버 :8010 이 가짜 분류기로 응답하고, 사진은 실제 multipart 로 올라간다.
import { expect, test } from '@playwright/test';
import { confirmAddress, fillHousehold, pickPhoto, runFullFlow } from './flow';

const GEO = { latitude: 37.6, longitude: 127.06 };
const API = 'http://localhost:8010';

test('서버가 가짜 모드로 떠 있다', async ({ request }) => {
  const h = await (await request.get(`${API}/health`)).json();
  expect(h.ok).toBe(true);
  expect(h.version.server).toBeTruthy();
  expect(h.mock).toContain('openrouter');
});

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} 모드`, () => {
    test.use({ colorScheme: scheme, permissions: ['geolocation'], geolocation: GEO });

    test('S0 → S6 → 홈 완주 (실제 업로드)', async ({ page }) => {
      const uploads: string[] = [];
      page.on('request', (r) => {
        if (r.url().endsWith('/analyze') && r.method() === 'POST') {
          uploads.push(r.headers()['content-type'] ?? '');
        }
      });
      await runFullFlow(page, '/');
      expect(uploads.length).toBeGreaterThanOrEqual(1);
      expect(uploads[0]).toContain('multipart/form-data');
    });
  });
}

test.describe('서버 오류', () => {
  test.use({ permissions: ['geolocation'], geolocation: GEO });

  test('분석이 실패하면 [다시 시도] 와 전화 안내가 보인다', async ({ page }) => {
    await page.route('**/analyze', (route) =>
      route.fulfill({
        status: 502,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({ error: { code: 'ANALYZE_FAILED', message: '지금은 사진을 살펴보지 못했어요.' } }),
      }),
    );
    await page.goto('/');
    await pickPhoto(page);
    await fillHousehold(page);
    await confirmAddress(page);
    await expect(page.getByRole('button', { name: /다시 시도/ })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: /행정복지센터에 전화하기/ })).toBeVisible();
  });
});
