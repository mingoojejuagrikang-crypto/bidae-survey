import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

const { mockAdd } = vi.hoisted(() => ({
  mockAdd: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../db', () => ({
  db: {
    logs: { add: mockAdd },
  },
}))

vi.mock('../utils/deviceInfo', () => ({
  getDeviceInfo: () => ({
    userAgent: 'test-agent',
    osName: 'TestOS',
    osVersion: '1.0',
    browserName: 'TestBrowser',
    browserVersion: '100',
    screenSize: '1280x720',
    speechRecognitionSupported: false,
    speechSynthesisSupported: false,
    mediaRecorderSupported: false,
    indexedDBSupported: true,
    serviceWorkerSupported: false,
  }),
}))

vi.mock('../utils/baseDate', () => ({
  calcBaseDate: (d: string) => d,
}))

import { useLogs } from '../hooks/useLogs'
import type { AppSettings } from '../types'
import { DEFAULT_SETTINGS } from '../types'

function makeSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  return { ...DEFAULT_SETTINGS, ...overrides }
}

describe('useLogs.addLog', () => {
  beforeEach(() => {
    mockAdd.mockClear()
  })

  it('logEnabled=false일 때 db.logs.add를 호출하지 않는다', async () => {
    const { result } = renderHook(() => useLogs(makeSettings({ logEnabled: false })))
    await result.current.addLog({ fieldName: '횡경', surveyDate: '2026-05-07', rowKey: 'row-1' })
    expect(mockAdd).not.toHaveBeenCalled()
  })

  it('로그 엔트리에 필수 필드가 모두 포함된다', async () => {
    const { result } = renderHook(() => useLogs(makeSettings({ logEnabled: true })))
    await result.current.addLog({
      fieldName: '횡경',
      surveyDate: '2026-05-07',
      rowKey: 'row-1',
      recognizedText: '삼오점일',
      normalizedValue: '35.1',
      finalValue: '35.1',
      inputMode: 'voice',
      correctionType: 'normal',
      latencyMs: 320,
    })
    expect(mockAdd).toHaveBeenCalledOnce()
    const entry = mockAdd.mock.calls[0][0]
    expect(entry).toMatchObject({
      fieldName: '횡경',
      surveyDate: '2026-05-07',
      rowKey: 'row-1',
      recognizedText: '삼오점일',
      normalizedValue: '35.1',
      finalValue: '35.1',
      inputMode: 'voice',
      correctionType: 'normal',
      latencyMs: 320,
    })
    expect(typeof entry.logId).toBe('string')
    expect(typeof entry.timestamp).toBe('string')
    expect(typeof entry.sessionId).toBe('string')
    expect(entry.appVersion).toMatch(/^v/)
    expect(entry.osName).toBe('TestOS')
    expect(entry.browserName).toBe('TestBrowser')
  })

  it('inputMode system은 SpeechRecognition 미지원 케이스에 사용 가능하다', async () => {
    const { result } = renderHook(() => useLogs(makeSettings({ logEnabled: true })))
    await result.current.addLog({
      fieldName: '횡경',
      surveyDate: '2026-05-07',
      rowKey: 'row-1',
      inputMode: 'system',
      errorType: 'unsupported',
    })
    expect(mockAdd).toHaveBeenCalledOnce()
    expect(mockAdd.mock.calls[0][0].inputMode).toBe('system')
    expect(mockAdd.mock.calls[0][0].errorType).toBe('unsupported')
  })

  it('correctionType이 수정일 때 필드에 올바르게 기록된다', async () => {
    const { result } = renderHook(() => useLogs(makeSettings({ logEnabled: true })))
    await result.current.addLog({
      fieldName: '종경',
      surveyDate: '2026-05-07',
      rowKey: 'row-2',
      inputMode: 'voice',
      correctionType: '수정',
      finalValue: '42.0',
    })
    expect(mockAdd.mock.calls[0][0].correctionType).toBe('수정')
  })

  it('audioClipFileName이 없으면 빈 문자열로 기록된다', async () => {
    const { result } = renderHook(() => useLogs(makeSettings({ logEnabled: true })))
    await result.current.addLog({ fieldName: '횡경', surveyDate: '2026-05-07', rowKey: 'row-1' })
    expect(mockAdd.mock.calls[0][0].audioClipFileName).toBe('')
  })
})
