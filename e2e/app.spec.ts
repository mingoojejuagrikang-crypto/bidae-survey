import { test, expect } from '@playwright/test'

const BASE = '/bidae-survey/'

test.describe('감귤 비대조사 음성입력 PWA', () => {
  test('앱 첫 화면 로드', async ({ page }) => {
    await page.goto(BASE)
    await expect(page.locator('h1')).toContainText('감귤 비대조사 음성입력')
    await expect(page.locator('[data-testid="home-page"]')).toBeVisible()
  })

  test('앱 버전 표시', async ({ page }) => {
    await page.goto(BASE)
    await expect(page.locator('text=v0.1.0-bidae-only')).toBeVisible()
  })

  test('설정 화면 열기 및 저장', async ({ page }) => {
    await page.goto(BASE)
    await page.click('[data-testid="btn-settings"]')
    await expect(page.locator('h2')).toContainText('설정')
    await page.click('button:has-text("저장")')
    await expect(page.locator('[data-testid="home-page"]')).toBeVisible()
  })

  test('조사 행 생성 화면 열기', async ({ page }) => {
    await page.goto(BASE)
    await page.click('[data-testid="btn-generate"]')
    await expect(page.locator('h2')).toContainText('조사 행 생성')
    await expect(page.locator('text=생성 예정 행 수: 90')).toBeVisible()
  })

  test('조사 행 생성 실행 및 90행 확인', async ({ page }) => {
    await page.goto(BASE)
    await page.click('[data-testid="btn-generate"]')
    await page.click('button:has-text("조사 행 생성")')

    await expect(page.locator('text=90행 생성 완료')).toBeVisible({ timeout: 10000 })
  })

  test('입력 화면 표시', async ({ page }) => {
    await page.goto(BASE)
    await page.click('[data-testid="btn-generate"]')
    await page.click('button:has-text("조사 행 생성")')
    await page.click('button:has-text("입력 화면으로")')

    await expect(page.locator('text=현재:')).toBeVisible()
    await expect(page.locator('[data-testid="input-횡경"]')).toBeVisible()
    await expect(page.locator('[data-testid="input-종경"]')).toBeVisible()
  })

  test('횡경 수동 입력', async ({ page }) => {
    await page.goto(BASE)
    await page.click('[data-testid="btn-generate"]')
    await page.click('button:has-text("조사 행 생성")')
    await page.click('button:has-text("입력 화면으로")')

    const input = page.locator('[data-testid="input-횡경"]')
    await input.fill('35.1')
    await input.press('Tab')
    await expect(input).toHaveValue('35.1')
  })

  test('종경 수동 입력', async ({ page }) => {
    await page.goto(BASE)
    await page.click('[data-testid="btn-generate"]')
    await page.click('button:has-text("조사 행 생성")')
    await page.click('button:has-text("입력 화면으로")')

    const input = page.locator('[data-testid="input-종경"]')
    await input.fill('42.3')
    await expect(input).toHaveValue('42.3')
  })

  test('이전 조사값 표시 영역 존재', async ({ page }) => {
    await page.goto(BASE)
    await page.click('[data-testid="btn-generate"]')
    await page.click('button:has-text("조사 행 생성")')
    await page.click('button:has-text("입력 화면으로")')

    await expect(page.locator('[data-testid="prev-횡경"]')).toBeVisible()
    await expect(page.locator('[data-testid="prev-종경"]')).toBeVisible()
  })

  test('다음 행 이동', async ({ page }) => {
    await page.goto(BASE)
    await page.click('[data-testid="btn-generate"]')
    await page.click('button:has-text("조사 행 생성")')
    await page.click('button:has-text("입력 화면으로")')

    await expect(page.locator('text=1 / 90')).toBeVisible()
    await page.locator('[data-testid="input-횡경"]').fill('35')
    await page.click('button:has-text("다음")')
    await page.click('button:has-text("다음")')
    await expect(page.locator('text=2 / 90')).toBeVisible()
  })

  test('CSV 다운로드 버튼 존재', async ({ page }) => {
    await page.goto(BASE)
    await page.click('[data-testid="btn-generate"]')
    await page.click('button:has-text("조사 행 생성")')
    await page.click('button:has-text("입력 화면으로")')

    await expect(page.locator('[data-testid="csv-download-button"]')).toBeVisible()
  })

  test('로그 ZIP 다운로드 버튼 존재', async ({ page }) => {
    await page.goto(BASE)
    await page.click('[data-testid="btn-generate"]')
    await page.click('button:has-text("조사 행 생성")')
    await page.click('button:has-text("입력 화면으로")')

    await expect(page.locator('[data-testid="log-zip-download-button"]')).toBeVisible()
  })

  test('업로드 버튼 존재', async ({ page }) => {
    await page.goto(BASE)
    await page.click('[data-testid="btn-generate"]')
    await page.click('button:has-text("조사 행 생성")')
    await page.click('button:has-text("입력 화면으로")')

    await expect(page.locator('[data-testid="upload-button"]')).toBeVisible()
  })

  test('데이터 확인 화면 표시', async ({ page }) => {
    await page.goto(BASE)
    await page.click('[data-testid="btn-review"]')
    await expect(page.locator('h2')).toContainText('데이터 확인')
  })

  test('브라우저 진단 화면 표시', async ({ page }) => {
    await page.goto(BASE)
    await page.click('[data-testid="btn-diag"]')
    await expect(page.locator('[data-testid="diag-page"]')).toBeVisible()
    await expect(page.locator('text=SpeechRecognition')).toBeVisible()
    await expect(page.locator('text=IndexedDB')).toBeVisible()
  })
})
