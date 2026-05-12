import { test, expect, type Page } from '@playwright/test'

const BASE = '/bidae-survey/?e2e=1'

async function setup(page: Page) {
  await page.goto(BASE)
  await page.click('[data-testid="btn-generate"]')
  await page.click('button:has-text("조사 행 생성")')
  await expect(page.locator('text=90행 생성 완료')).toBeVisible({ timeout: 10000 })
  await page.click('button:has-text("입력 화면으로")')
}

async function voiceStart(page: Page) {
  await page.click('button:has-text("음성 시작")')
  // Wait for TTS log to contain the initial field announcement
  await expect(page.locator('[data-testid="tts-log"]')).toContainText('횡경', { timeout: 5000 })
}

async function voiceInput(page: Page, value: string) {
  // fill works off-screen; dispatchEvent bypasses viewport/actionability checks for the button
  await page.locator('[data-testid="debug-voice-transcript"]').fill(value)
  await page.locator('[data-testid="debug-voice-submit"]').dispatchEvent('click')
  // Wait until at least one more TTS entry exists after this value (value + '|' means
  // the post-advance announcement was appended, ensuring fieldRef.current is updated)
  await expect(page.locator('[data-testid="tts-log"]')).toContainText(value + '|', { timeout: 5000 })
}

test.describe('음성 흐름 E2E', () => {
  test('시나리오 1 — 음성 시작 TTS 및 횡경 입력', async ({ page }) => {
    await setup(page)
    await voiceStart(page)

    // Verify startup TTS
    await expect(page.locator('[data-testid="tts-log"]')).toContainText('조사나무 1')
    await expect(page.locator('[data-testid="tts-log"]')).toContainText('조사과실 1')
    await expect(page.locator('[data-testid="tts-log"]')).toContainText('횡경')

    // Enter 횡경 for fruit 1
    await voiceInput(page, '35.1')
    await expect(page.locator('[data-testid="input-횡경-1"]')).toHaveValue('35.1')
    await expect(page.locator('[data-testid="tts-log"]')).toContainText('횡경 35.1')
    await expect(page.locator('[data-testid="tts-log"]')).toContainText('종경')

    // 과실 번호 재발화 없음: "조사과실"은 세션 시작 시 1번만
    const ttsText = await page.locator('[data-testid="tts-log"]').textContent()
    expect((ttsText ?? '').split('조사과실').length - 1).toBe(1)
  })

  test('시나리오 2 — 종경 입력 후 다음 과실 안내', async ({ page }) => {
    await setup(page)
    await voiceStart(page)

    await voiceInput(page, '35.1')  // 과실 1 횡경
    await expect(page.locator('[data-testid="tts-log"]')).toContainText('종경')

    await voiceInput(page, '42.3')  // 과실 1 종경 → 과실 2로
    await expect(page.locator('[data-testid="input-종경-1"]')).toHaveValue('42.3')
    await expect(page.locator('[data-testid="tts-log"]')).toContainText('종경 42.3')
    await expect(page.locator('[data-testid="tts-log"]')).toContainText('조사과실 2')
    await expect(page.locator('[data-testid="tts-log"]')).toContainText('횡경')
  })

  test('시나리오 3 — 조사나무 완료 후 화면 상태 검증', async ({ page }) => {
    await setup(page)
    await voiceStart(page)

    const values = ['35.1', '42.3', '36.4', '43.1', '35.8', '42.9', '37.1', '43.8', '38.2', '44.1']
    for (const v of values) {
      await voiceInput(page, v)
    }

    // 완료 배너 표시
    await expect(page.locator('[data-testid="session-complete-banner"]')).toBeVisible()

    // 다음 조사나무 크게 표시
    await expect(page.locator('[data-testid="next-tree-info"]')).toBeVisible()

    // 결과표: 과실 1~5 값 유지
    await expect(page.locator('[data-testid="input-횡경-1"]')).toHaveValue('35.1')
    await expect(page.locator('[data-testid="input-종경-5"]')).toHaveValue('44.1')

    // 자동 시작 없음: 음성 종료 버튼 비활성
    await expect(page.locator('button:has-text("음성 종료")')).toBeDisabled()

    // 다시 음성 시작 → 다음 나무(조사나무 2)로 이동
    await page.click('button:has-text("음성 시작")')
    await expect(page.locator('[data-testid="tts-log"]')).toContainText('조사나무 2', { timeout: 5000 })
  })
})
