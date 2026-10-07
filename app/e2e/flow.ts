import { expect, type Page } from '@playwright/test';
import path from 'path';

export const PHOTO = path.join(__dirname, 'fixtures', 'problem.jpg');

/** S0: 사진 고르기 → 다음 */
export async function pickPhoto(page: Page) {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByLabel('앨범에서 고르기').first().click(),
  ]);
  await chooser.setFiles(PHOTO);
  const next = page.getByRole('button', { name: '다음' });
  await expect(next).toBeVisible();
  await expect(page.getByText('사진을 줄이고 있어요')).toHaveCount(0);
  await next.click();
}

/** S1: 1명, 소득 첫 구간, 주거급여 아니요, 자가, 65세 이상 */
export async function fillHousehold(page: Page) {
  await page.getByLabel('1명', { exact: true }).click();
  await page.getByText('만 원 이하').first().click();
  await page.getByRole('radio', { name: '아니요', exact: true }).click();
  await page.getByText('우리 집(자가)').click();
  await page.getByText('65세 이상 가족이 있어요').click();
  await page.getByRole('button', { name: '다음' }).click();
}

/** S2: 위치로 찾은 주소를 [예] 로 확인 */
export async function confirmAddress(page: Page) {
  await page.getByRole('button', { name: /^예/ }).click();
}

/** S2: 위치를 못 쓸 때 직접 입력 (적으면 바로 찾는다) */
export async function searchAddress(page: Page, text: string) {
  await page.getByLabel('도로명 주소 검색').fill(text);
}

export async function bodyText(page: Page) {
  return page.locator('body').innerText();
}

/**
 * S0 → S6 → 홈 전체 흐름. 목 모드와 실서버 모드에서 같이 쓴다.
 * 끝나면 홈에 저장한 사업과 카드가 보이는지까지 확인한다.
 */
export async function runFullFlow(page: Page, startUrl: string) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto(startUrl);
  await expect(page.getByText('고칠 곳을 찍어 주세요')).toBeVisible();
  await pickPhoto(page); // S0
  await fillHousehold(page); // S1
  await expect(page.getByText('주소가 맞나요?')).toBeVisible(); // S2
  await expect(page.getByText('서울특별시 노원구 월계로 45길 12')).toBeVisible();
  await confirmAddress(page);

  // S4: 추천 행과 안내 문구 (S3 찾는 중 화면은 짧게 지나간다)
  await expect(page.getByText('누수 문제가 있으시네요')).toBeVisible({ timeout: 30_000 });
  const rows = page.getByRole('button', { name: /^(?!문제 종류|다른 사업).*,(?!.*무료 점검)/ });
  await expect(rows.first()).toBeVisible();
  expect(await rows.count()).toBeGreaterThanOrEqual(1);
  await expect(page.getByText('해당 가능성이 있는 사업이에요')).toBeVisible();
  const rowName = (await rows.first().getAttribute('aria-label')) ?? '';
  const programName = rowName.split(',')[0];

  // S5: 사업 상세, 저장 토글
  await rows.first().click();
  await page.waitForURL(/program\//);
  await expect(page.getByRole('button', { name: '이 사업 저장하기' })).toBeVisible();
  await page.getByRole('button', { name: '이 사업 저장하기' }).click();
  await expect(page.getByRole('button', { name: /^저장했어요/ })).toBeVisible();
  await page.getByRole('button', { name: /^저장했어요/ }).click(); // 취소
  await expect(page.getByRole('button', { name: '이 사업 저장하기' })).toBeVisible();
  await page.getByRole('button', { name: '이 사업 저장하기' }).click(); // 다시 저장
  await expect(page.getByRole('button', { name: /^저장했어요/ })).toBeVisible();

  // 상담 카드 → S6
  await page.getByRole('button', { name: '상담 카드 만들기' }).click();
  // 비로그인으로 처음 카드를 만들면 로그인 안내가 한 번 뜬다
  await expect(page.getByText('로그인하면 정보가 지워지지 않아요')).toBeVisible();
  await page.getByRole('button', { name: '로그인하지 않고 카드 보기' }).click();
  await page.waitForURL(/card\//);
  await expect(page.getByText('상담 준비 카드')).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '상담 카드를 이미지로 저장하기' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.png$/);
  await expect(page.getByText('이미지를 내려받았어요')).toBeVisible();

  // 홈에 저장 목록
  await page.getByRole('button', { name: '처음 화면으로 가기' }).first().click();
  await expect(page.getByRole('heading', { name: '저장한 지원사업' })).toHaveCount(1); // 홈이 스택에 두 번 남지 않는다
  await expect(page.getByRole('heading', { name: '저장한 지원사업' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^저장한 사업/ }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: '저장한 상담 카드' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /^상담 카드/ }).first()).toBeVisible();
  expect(programName.length).toBeGreaterThan(0);
  expect(errors).toEqual([]);
}

/** 홈 오른쪽 위 [로그인] → (가짜) 로그인 → [내 정보] */
export async function loginFromHome(page: Page) {
  await page.getByRole('button', { name: '카카오로 로그인하기' }).click();
  await expect(page.getByRole('button', { name: '내 정보 보기' })).toBeVisible();
}

/** 내 정보: 1명, 소득 첫 구간, 주거급여 아니요, 자가 → 저장 */
export async function fillAndSaveProfile(page: Page) {
  await page.getByLabel('1명', { exact: true }).click();
  await page.getByText('만 원 이하').first().click();
  await page.getByRole('radio', { name: '아니요', exact: true }).click();
  await page.getByText('우리 집(자가)').click();
  await page.getByRole('button', { name: '내 정보 저장하기' }).click();
  await expect(page.getByText(/저장했어요/).first()).toBeVisible();
}
