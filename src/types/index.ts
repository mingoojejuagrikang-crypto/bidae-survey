export const APP_VERSION = 'v0.1.0-bidae-only'

export interface FarmerLabel {
  label: string
  name: string
}

export interface NormalRange {
  min: number
  max: number
}

export interface FieldRange {
  횡경: NormalRange
  종경: NormalRange
}

export interface ChangeThreshold {
  횡경: number
  종경: number
}

export interface AppSettings {
  surveyDate: string
  farmerLabels: FarmerLabel[]
  treatments: string[]
  trees: string[]
  fruits: string[]
  autoFields: string[]
  userFields: string[]
  fieldOrder: string[]
  normalRanges: FieldRange
  changeThresholds: ChangeThreshold
  appsScriptUrl: string
  logEnabled: boolean
  audioClipEnabled: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  surveyDate: new Date().toISOString().slice(0, 10),
  farmerLabels: [
    { label: 'A', name: '이원창' },
    { label: 'B', name: '강남호' },
    { label: 'C', name: '양승보' },
  ],
  treatments: ['시험', '관행'],
  trees: ['1', '2', '3'],
  fruits: ['1', '2', '3', '4', '5'],
  autoFields: ['조사일자', '기준일자', '농가명', '라벨', '처리', '조사나무', '조사과실'],
  userFields: ['횡경', '종경', '비고'],
  fieldOrder: ['횡경', '종경'],
  normalRanges: {
    횡경: { min: 10, max: 120 },
    종경: { min: 10, max: 120 },
  },
  changeThresholds: {
    횡경: 30,
    종경: 30,
  },
  appsScriptUrl: '',
  logEnabled: true,
  audioClipEnabled: true,
}

export interface SurveyRow {
  rowId: string
  surveyDate: string
  baseDate: string
  farmerName: string
  label: string
  treatment: string
  tree: string
  fruit: string
  횡경: string
  종경: string
  비고: string
  isComplete: boolean
  isDirty: boolean
  uploadStatus: 'pending' | 'uploaded' | 'failed'
  createdAt: string
  updatedAt: string
}

export interface BusinessRow {
  조사일자: string
  기준일자: string
  농가명: string
  라벨: string
  처리: string
  조사나무: string
  조사과실: string
  횡경: string
  종경: string
  비고: string
}

export interface LogEntry {
  logId: string
  timestamp: string
  sessionId: string
  appVersion: string
  deviceInfo: string
  osName: string
  osVersion: string
  browserName: string
  browserVersion: string
  userAgent: string
  screenSize: string
  networkStatus: string
  surveyDate: string
  baseDate: string
  rowKey: string
  fieldName: string
  audioClipFileName: string
  recognizedText: string
  normalizedValue: string
  finalValue: string
  confidence: number
  inputMode: 'voice' | 'manual'
  correctionType: 'normal' | '수정' | '이전' | '다음' | 'manual'
  errorType: 'stt_error' | 'range_warning' | 'unsupported' | 'none'
  latencyMs: number
}

export interface AudioClip {
  clipId: string
  fileName: string
  blob: Blob
  rowKey: string
  fieldName: string
  timestamp: string
}

export interface UploadHistoryEntry {
  uploadId: string
  surveyDate: string
  uploadedAt: string
  rowIds: string[]
  status: 'success' | 'failed'
  error?: string
}

export interface DeviceInfo {
  userAgent: string
  osName: string
  osVersion: string
  browserName: string
  browserVersion: string
  screenSize: string
  speechRecognitionSupported: boolean
  speechSynthesisSupported: boolean
  mediaRecorderSupported: boolean
  indexedDBSupported: boolean
  serviceWorkerSupported: boolean
}

export type VoiceCommandType = 'number' | '수정' | '이전' | '다음' | 'unknown'

export interface ParsedVoiceCommand {
  type: VoiceCommandType
  value?: number
  raw: string
}
