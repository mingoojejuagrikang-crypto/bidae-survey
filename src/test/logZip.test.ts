import { describe, it, expect } from 'vitest'
import JSZip from 'jszip'
import { createLogZip, verifyNoBusinessColumnsInLog } from '../utils/logZip'
import type { LogEntry, AudioClip, DeviceInfo } from '../types'

const mockDeviceInfo: DeviceInfo = {
  userAgent: 'test',
  osName: 'Android',
  osVersion: '13',
  browserName: 'Chrome',
  browserVersion: '120',
  screenSize: '390x844',
  speechRecognitionSupported: true,
  speechSynthesisSupported: true,
  mediaRecorderSupported: true,
  indexedDBSupported: true,
  serviceWorkerSupported: true,
}

const mockLog: LogEntry = {
  logId: '1',
  timestamp: '2026-05-07T09:00:00.000Z',
  sessionId: 'sess1',
  appVersion: 'v0.1.0-bidae-only',
  deviceInfo: 'test',
  osName: 'Android',
  osVersion: '13',
  browserName: 'Chrome',
  browserVersion: '120',
  userAgent: 'test',
  screenSize: '390x844',
  networkStatus: 'online',
  surveyDate: '2026-05-07',
  baseDate: '2026-05-01',
  rowKey: 'row001',
  fieldName: '횡경',
  audioClipFileName: 'test.webm',
  recognizedText: '35.1',
  normalizedValue: '35.1',
  finalValue: '35.1',
  confidence: 0.95,
  inputMode: 'voice',
  correctionType: 'normal',
  errorType: 'none',
  latencyMs: 120,
}

describe('createLogZip', () => {
  it('logs.json 포함', async () => {
    const blob = await createLogZip([mockLog], [], mockDeviceInfo, '2026-05-07', false)
    const zip = await JSZip.loadAsync(blob)
    expect(zip.files['logs.json']).toBeDefined()
  })

  it('logs.csv 포함', async () => {
    const blob = await createLogZip([mockLog], [], mockDeviceInfo, '2026-05-07', false)
    const zip = await JSZip.loadAsync(blob)
    expect(zip.files['logs.csv']).toBeDefined()
  })

  it('device.json 포함', async () => {
    const blob = await createLogZip([mockLog], [], mockDeviceInfo, '2026-05-07', false)
    const zip = await JSZip.loadAsync(blob)
    expect(zip.files['device.json']).toBeDefined()
  })

  it('audio/ 폴더 포함', async () => {
    const blob = await createLogZip([mockLog], [], mockDeviceInfo, '2026-05-07', false)
    const zip = await JSZip.loadAsync(blob)
    const hasAudio = Object.keys(zip.files).some(k => k.startsWith('audio/'))
    expect(hasAudio).toBe(true)
  })

  it('음성클립 저장 꺼져 있어도 ZIP 생성', async () => {
    const blob = await createLogZip([], [], mockDeviceInfo, '2026-05-07', false)
    expect(blob.size).toBeGreaterThan(0)
  })

  it('음성클립 켜기면 audio 파일 포함', async () => {
    const clip: AudioClip = {
      clipId: 'c1',
      fileName: 'test.webm',
      blob: new Blob(['audio'], { type: 'audio/webm' }),
      rowKey: 'row001',
      fieldName: '횡경',
      timestamp: '2026-05-07T09:00:00.000Z',
    }
    const blob = await createLogZip([mockLog], [clip], mockDeviceInfo, '2026-05-07', true)
    const zip = await JSZip.loadAsync(blob)
    expect(zip.files['audio/test.webm']).toBeDefined()
  })
})

describe('verifyNoBusinessColumnsInLog', () => {
  it('로그에 업무 데이터 컬럼(농가명 등) 없음', () => {
    expect(verifyNoBusinessColumnsInLog([mockLog])).toBe(true)
  })
})
