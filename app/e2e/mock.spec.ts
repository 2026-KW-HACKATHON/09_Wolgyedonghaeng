// 목 모드(EXPO_PUBLIC_USE_MOCK_API=1) 웹 E2E. 서버 없이 S0 → S6 → 홈.
import { expect, test } from '@playwright/test';
import { bodyText, confirmAddress, fillHousehold, pickPhoto, runFullFlow, searchAddress } from './flow';

const GEO = { latitude: 37.6, longitude: 127.06 };

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} 모드`, () => {
    test.use({ colorScheme: scheme, permissions: ['geolocation'], geolocation: GEO });

    test('S0 → S6 → 홈 완주', async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await runFullFlow(page, '/?mock=normal');
    });
  });
}

test.describe('위치 권한 거부', () => {
  test.use({ permissions: [] });

  test('직접 입력으로 주소를 고른다', async ({ page }) => {
    await page.goto('/?mock=normal');
    await pickPhoto(page);
    await fillHousehold(page);
    await expect(page.getByText('위치를 쓸 수 없어서 주소를 직접 적어 주세요')).toBeVisible();
    await searchAddress(page, '월계로');
    const hit = page.getByRole('button', { name: /월계로/ }).first();
    await expect(hit).toBeVisible();
    await hit.click();
    await expect(page.getByText(/사진을 보니|지금은 찾지 못했어요/)).toBeVisible({ timeout: 30_000 });
  });
});

test.describe('확인 단계·기타·결과 없음·오류', () => {
  test.use({ permissions: ['geolocation'], geolocation: GEO });

  async function toResults(page: import('@playwright/test').Page, scenario: string) {
    await page.goto(`/?mock=${scenario}`);
    await pickPhoto(page);
    await fillHousehold(page);
    await expect(page.getByText('여기 사세요?')).toBeVisible();
    await confirmAddress(page);
    await page.waitForURL(/results/);
    // 이동하면 주소의 ?mock 값이 사라지므로 다시 붙인다
    await page.evaluate(
      (s) => history.replaceState(history.state, '', location.pathname + '?mock=' + s),
      scenario,
    );
  }

  test('확인 단계: [맞아요] 를 누르면 결과가 나온다', async ({ page }) => {
    await toResults(page, 'confirm');
    await expect(page.getByRole('button', { name: '맞아요' })).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: '맞아요' }).click();
    await expect(page.getByText('받을 수 있을 수도 있는 사업이에요')).toBeVisible();
  });

  test('기타: 문제 종류를 고르게 한다', async ({ page }) => {
    await toResults(page, 'other');
    await expect(page.getByText('사진만으로는 잘 모르겠어요')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: '행정복지센터에 전화하기' }).first()).toBeVisible();
  });

  test('결과 없음: 행정복지센터 안내', async ({ page }) => {
    await toResults(page, 'empty');
    await expect(page.getByText('지금 조건으로는 찾지 못했어요')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: /행정복지센터에 전화하기/ }).first()).toBeVisible();
  });

  test('오류: [다시 시도] 와 [행정복지센터에 전화하기] 가 보인다', async ({ page }) => {
    await toResults(page, 'error');
    await expect(page.getByText('지금은 찾지 못했어요').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: /다시 시도/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /행정복지센터에 전화하기/ })).toBeVisible();
    expect(await bodyText(page)).not.toContain('해당돼요');
  });
});
