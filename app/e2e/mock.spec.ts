// 목 모드(EXPO_PUBLIC_USE_MOCK_API=1) 웹 E2E. 서버 없이 S0 → S6 → 홈.
import { expect, test } from '@playwright/test';
import {
  bodyText,
  confirmAddress,
  fillAndSaveProfile,
  fillHousehold,
  loginFromHome,
  pickPhoto,
  runFullFlow,
  searchAddress,
} from './flow';

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
    await expect(page.getByText('위치 권한이 막혀 있어요')).toBeVisible();
    await searchAddress(page, '월계로');
    const hit = page.getByRole('button', { name: /월계로/ }).first();
    await expect(hit).toBeVisible();
    await hit.click();
    await expect(page.getByText(/문제가 있으시네요|지금은 찾지 못했어요/)).toBeVisible({ timeout: 30_000 });
  });
});

test.describe('확인 단계·기타·결과 없음·오류', () => {
  test.use({ permissions: ['geolocation'], geolocation: GEO });

  async function toResults(page: import('@playwright/test').Page, scenario: string) {
    await page.goto(`/?mock=${scenario}`);
    await pickPhoto(page);
    await fillHousehold(page);
    await expect(page.getByText('주소가 맞나요?')).toBeVisible();
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
    await expect(page.getByText('해당 가능성이 있는 사업이에요')).toBeVisible();
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

test.describe('로그인과 내 정보', () => {
  test.use({ permissions: ['geolocation'], geolocation: GEO });

  test('로그인 → 내 정보 저장 → 저장된 정보로 시작 → 로그아웃', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/?mock=normal');
    await expect(page.getByText('고칠 곳을 찍어 주세요')).toBeVisible();
    await loginFromHome(page);
    await page.getByRole('button', { name: '내 정보 보기' }).click();
    await expect(page.getByText('테스트 님으로 로그인했어요')).toBeVisible();
    await fillAndSaveProfile(page);

    // 다음 검색: S1 에서 저장된 정보로 시작
    await page.getByRole('button', { name: '처음 화면으로 돌아가기' }).click();
    await pickPhoto(page);
    await expect(page.getByText('저장된 정보로 시작할까요?')).toBeVisible();
    await page.getByRole('button', { name: '저장된 정보로 시작하기' }).click();
    await expect(page.getByRole('button', { name: '다음' })).toBeDisabled(); // 가구 특성은 아직 답하지 않았다
    await page.getByText('65세 이상 가족이 있어요').click();
    await expect(page.getByRole('button', { name: '다음' })).toBeEnabled();

    // 로그아웃: 기기에 저장한 것을 남기기
    await page.goto('/?mock=normal');
    await page.getByRole('button', { name: '내 정보 보기' }).click();
    await page.getByRole('button', { name: '로그아웃하기' }).click();
    await page.getByRole('button', { name: '로그아웃하기' }).click();
    await expect(page.getByText('내 기기에 저장한 사업·카드를 남길까요?')).toBeVisible();
    await page.getByRole('button', { name: '남길게요' }).click();
    await expect(page.getByRole('button', { name: '카카오로 로그인하기' })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('웹 리다이렉트로 돌아오는 주소(/auth-callback)가 로그인을 끝낸다', async ({ page }) => {
    await page.goto('/auth-callback?code=fake');
    await expect(page.getByRole('button', { name: '내 정보 보기' })).toBeVisible();
  });

  test('로그인 안내: 다시 보지 않기를 누르면 다음에는 뜨지 않는다', async ({ page }) => {
    await page.goto('/?mock=normal');
    await pickPhoto(page);
    await fillHousehold(page);
    await confirmAddress(page);
    await expect(page.getByText('누수 문제가 있으시네요')).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: /^(?!문제 종류|다른 사업).*,(?!.*무료 점검)/ }).first().click();
    await page.getByRole('button', { name: '상담 카드 만들기' }).click();
    await page.waitForURL(/card\//);
    await expect(page.getByText('상담 준비 카드')).toBeVisible(); // 카드가 먼저 보인다
    await page.getByRole('button', { name: '상담 카드를 이미지로 저장하기' }).click();
    await expect(page.getByText('로그인하고 정보를 지키세요')).toBeVisible();
    await page.getByRole('button', { name: '로그인 안내를 다시 보지 않기' }).click();
    await expect(page.getByText('상담 준비 카드')).toBeVisible();
  });
});
