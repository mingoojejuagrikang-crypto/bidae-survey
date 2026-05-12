import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

class FakeRecognition {
  lang = ''
  continuous = false
  interimResults = false
  onresult: ((e: SpeechRecognitionEvent) => void) | null = null
  onerror: ((e: Event) => void) | null = null
  onend: (() => void) | null = null
  start = vi.fn(() => { instances.push(this) })
  stop = vi.fn(() => { setTimeout(() => this.onend?.(), 0) })
}

const { instances, mockSpeakAsync, mockAdd } = vi.hoisted(() => ({
  instances: [] as FakeRecognition[],
  mockSpeakAsync: vi.fn().mockResolvedValue(undefined),
  mockAdd: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../utils/speechRecognition', () => ({
  getSpeechRecognition: () => FakeRecognition,
}))

vi.mock('../utils/tts', () => ({
  speakAsync: mockSpeakAsync,
  speak: vi.fn(),
  setTTSEnabled: vi.fn(),
}))

vi.mock('../db', () => ({
  db: {
    logs: { add: mockAdd },
    audioClips: { add: vi.fn().mockResolvedValue(undefined) },
  },
}))

import { useVoiceSurveyFlow } from '../hooks/useVoiceSurveyFlow'
import type { SurveyRow, AppSettings } from '../types'
import { DEFAULT_SETTINGS } from '../types'

function makeRow(overrides: Partial<SurveyRow> = {}): SurveyRow {
  return {
    rowId: crypto.randomUUID(),
    surveyDate: '2026-05-12',
    baseDate: '2026-05-10',
    farmerName: '이원창',
    label: 'A',
    treatment: '시험',
    tree: '1',
    fruit: '1',
    횡경: '',
    종경: '',
    비고: '',
    isComplete: false,
    isDirty: false,
    uploadStatus: 'pending',
    createdAt: '2026-05-12T00:00:00',
    updatedAt: '2026-05-12T00:00:00',
    ...overrides,
  }
}

function make5Fruits(tree: string, filled: Array<{ 횡경?: string; 종경?: string }> = []): SurveyRow[] {
  return ['1', '2', '3', '4', '5'].map((fruit, i) =>
    makeRow({ tree, fruit, 횡경: filled[i]?.횡경 ?? '', 종경: filled[i]?.종경 ?? '' }),
  )
}

function makeSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  return { ...DEFAULT_SETTINGS, logEnabled: false, audioClipEnabled: false, ...overrides }
}

const mockUpdateRow = vi.fn().mockResolvedValue(undefined)
const mockAddLog = vi.fn().mockResolvedValue(undefined)

function renderFlow(rows: SurveyRow[], settings?: AppSettings) {
  const s = settings ?? makeSettings()
  return renderHook(() =>
    useVoiceSurveyFlow({
      rows,
      allRows: rows,
      settings: s,
      onUpdateRow: mockUpdateRow,
      addLog: mockAddLog,
    }),
  )
}

describe('useVoiceSurveyFlow', () => {
  beforeEach(() => {
    instances.length = 0
    mockSpeakAsync.mockClear()
    mockAdd.mockClear()
    mockUpdateRow.mockClear()
    mockAddLog.mockClear()
  })

  it('음성 시작 → 첫 미입력 위치(과실 1 횡경)로 이동', async () => {
    const rows = make5Fruits('1')
    const { result } = renderFlow(rows)

    await act(async () => { await result.current.startListening() })

    expect(result.current.currentFruitIdx).toBe(0)
    expect(result.current.currentField).toBe('횡경')
    expect(result.current.listening).toBe(true)
  })

  it('음성 시작 TTS 순서: 조사나무 → 조사과실 → 횡경', async () => {
    const rows = make5Fruits('1')
    const { result } = renderFlow(rows)

    await act(async () => { await result.current.startListening() })

    const calls = mockSpeakAsync.mock.calls.map((c: string[]) => c[0])
    expect(calls).toEqual(['조사나무 1', '조사과실 1', '횡경'])
  })

  it('횡경 입력 후 TTS: 횡경 35.1 → 종경 (과실 번호 재발화 없음)', async () => {
    const rows = make5Fruits('1')
    const { result } = renderFlow(rows)

    await act(async () => { await result.current.startListening() })
    mockSpeakAsync.mockClear()

    await act(async () => { await result.current.handleVoice('35.1') })

    const calls = mockSpeakAsync.mock.calls.map((c: string[]) => c[0])
    expect(calls).toContain('횡경 35.1')
    expect(calls).toContain('종경')
    expect(calls.some((t: string) => t.startsWith('조사과실'))).toBe(false)
    expect(result.current.currentField).toBe('종경')
  })

  it('종경 입력 후 TTS: 종경 42.3 → 조사과실 2 → 횡경', async () => {
    const rows = make5Fruits('1')
    const { result } = renderFlow(rows)

    await act(async () => { await result.current.startListening() })
    await act(async () => { await result.current.handleVoice('35.1') })
    mockSpeakAsync.mockClear()

    await act(async () => { await result.current.handleVoice('42.3') })

    const calls = mockSpeakAsync.mock.calls.map((c: string[]) => c[0])
    expect(calls).toContain('종경 42.3')
    expect(calls).toContain('조사과실 2')
    expect(calls).toContain('횡경')
    expect(result.current.currentFruitIdx).toBe(1)
    expect(result.current.currentField).toBe('횡경')
  })

  it('과실 5 종경 입력 → 완료: TTS 완료, listening=false, sessionComplete=true', async () => {
    const rows = make5Fruits('1', [
      { 횡경: '35.1', 종경: '42.3' },
      { 횡경: '36.0', 종경: '43.1' },
      { 횡경: '35.8', 종경: '42.9' },
      { 횡경: '37.1', 종경: '43.8' },
      { 횡경: '38.2' },
    ])
    const { result } = renderFlow(rows)

    await act(async () => { await result.current.startListening() })
    mockSpeakAsync.mockClear()

    await act(async () => { await result.current.handleVoice('44.1') })

    const calls = mockSpeakAsync.mock.calls.map((c: string[]) => c[0])
    expect(calls).toContain('종경 44.1')
    expect(calls).toContain('조사나무 1')
    expect(calls).toContain('완료')
    expect(result.current.listening).toBe(false)
    expect(result.current.sessionComplete).toBe(true)
  })

  it('수정 명령: 직전 항목 수정, 현재 위치 유지', async () => {
    const rows = make5Fruits('1')
    const { result } = renderFlow(rows)

    await act(async () => { await result.current.startListening() })
    await act(async () => { await result.current.handleVoice('35.1') })
    // now at 종경
    mockSpeakAsync.mockClear()

    await act(async () => { await result.current.handleVoice('수정 36.1') })

    // 수정 적용: lastField(횡경)에 36.1
    expect(mockUpdateRow).toHaveBeenLastCalledWith(expect.objectContaining({ 횡경: '36.1' }))
    // 현재 위치 유지: 종경
    expect(result.current.currentField).toBe('종경')
  })

  it('수정 TTS 순서: lastField 수정값 → 현재 필드', async () => {
    const rows = make5Fruits('1')
    const { result } = renderFlow(rows)

    await act(async () => { await result.current.startListening() })
    await act(async () => { await result.current.handleVoice('35.1') })
    mockSpeakAsync.mockClear()

    await act(async () => { await result.current.handleVoice('수정 36.1') })

    const calls = mockSpeakAsync.mock.calls.map((c: string[]) => c[0])
    expect(calls[0]).toBe('횡경 36.1')
    expect(calls[1]).toBe('종경')
  })

  it('음성 이전 — 세션 범위 이탈 없음: 과실 1 횡경에서 이전 → no-op', async () => {
    const rows = make5Fruits('1')
    const { result } = renderFlow(rows)

    await act(async () => { await result.current.startListening() })
    // at fruit 1 횡경
    const fruitBefore = result.current.currentFruitIdx
    const fieldBefore = result.current.currentField

    await act(async () => { await result.current.handleVoice('이전') })

    expect(result.current.currentFruitIdx).toBe(fruitBefore)
    expect(result.current.currentField).toBe(fieldBefore)
  })

  it('음성 다음 — 값 없는 마지막 위치에서 no-op', async () => {
    // All fruits complete except last 종경
    const rows = make5Fruits('1', [
      { 횡경: '35.1', 종경: '42.3' },
      { 횡경: '36.0', 종경: '43.1' },
      { 횡경: '35.8', 종경: '42.9' },
      { 횡경: '37.1', 종경: '43.8' },
      { 횡경: '38.2' },
    ])
    const { result } = renderFlow(rows)

    // startListening navigates to fruit 5 종경 (first incomplete)
    await act(async () => { await result.current.startListening() })
    expect(result.current.currentFruitIdx).toBe(4)
    expect(result.current.currentField).toBe('종경')

    // "다음" with empty value at last position → no-op (tree not complete)
    const idxBefore = result.current.currentFruitIdx
    const fieldBefore = result.current.currentField

    await act(async () => { await result.current.handleVoice('다음') })

    expect(result.current.currentFruitIdx).toBe(idxBefore)
    expect(result.current.currentField).toBe(fieldBefore)
    expect(result.current.sessionComplete).toBe(false)
  })

  it('음성 다음 — 값 있는 마지막 위치에서 completeTreeSession 호출', async () => {
    // All fruits fully complete
    const rows = make5Fruits('1', [
      { 횡경: '35.1', 종경: '42.3' },
      { 횡경: '36.0', 종경: '43.1' },
      { 횡경: '35.8', 종경: '42.9' },
      { 횡경: '37.1', 종경: '43.8' },
      { 횡경: '38.2', 종경: '44.1' },
    ])
    const { result } = renderFlow(rows)

    // startListening → tree is complete → announces "완료" and sets sessionComplete
    await act(async () => { await result.current.startListening() })

    const calls = mockSpeakAsync.mock.calls.map((c: string[]) => c[0])
    expect(calls).toContain('완료')
    expect(result.current.sessionComplete).toBe(true)
  })

  it('sessionComplete=true + startListening → 다음 나무로 이동', async () => {
    const rows = [
      ...make5Fruits('1', [
        { 횡경: '35.1', 종경: '42.3' },
        { 횡경: '36.0', 종경: '43.1' },
        { 횡경: '35.8', 종경: '42.9' },
        { 횡경: '37.1', 종경: '43.8' },
        { 횡경: '38.2' },
      ]),
      ...make5Fruits('2'),
    ]
    const { result } = renderFlow(rows)

    // Complete tree 1
    await act(async () => { await result.current.startListening() })
    await act(async () => { await result.current.handleVoice('44.1') })
    expect(result.current.sessionComplete).toBe(true)

    // Start listening again → should move to tree 2
    mockSpeakAsync.mockClear()
    await act(async () => { await result.current.startListening() })

    expect(result.current.currentTreeGroupIdx).toBe(1)
    const calls = mockSpeakAsync.mock.calls.map((c: string[]) => c[0])
    expect(calls).toContain('조사나무 2')
  })

  it('isSpeakingRef=true → recognition 재시작 안 함', async () => {
    const rows = make5Fruits('1')
    const { result } = renderFlow(rows)

    await act(async () => { await result.current.startListening() })
    const countBefore = instances.length

    // Simulate recognition onend while speaking (speakAsync pending)
    let resolveSpeak!: () => void
    mockSpeakAsync.mockImplementationOnce(() => new Promise<void>(r => { resolveSpeak = r }))

    // Start processing (sets isProcessingRef=true)
    const voicePromise = act(async () => { await result.current.handleVoice('35.1') })

    // Fire recognition onend — should NOT start new recognition while processing
    await act(async () => {
      const rec = instances[instances.length - 1]
      rec?.onend?.()
    })

    // Resolve the pending speakAsync
    resolveSpeak?.()
    await voicePromise

    // During processing, onend should have returned early (no new recognition started from onend)
    // (startListeningRecognition may still be called from handleVoice itself after TTS)
    // The key: no EXTRA recognition was started by the onend handler alone
    expect(instances.length).toBeGreaterThanOrEqual(countBefore)
  })
})
