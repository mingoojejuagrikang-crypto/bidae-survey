import JSZip from 'jszip'
import type { LogEntry, AudioClip, DeviceInfo } from '../types'
import { BUSINESS_COLUMNS } from './rowGenerator'

const LOG_COLUMNS = [
  'logId', 'timestamp', 'sessionId', 'appVersion', 'osName', 'osVersion',
  'browserName', 'browserVersion', 'userAgent', 'screenSize', 'networkStatus',
  'surveyDate', 'baseDate', 'rowKey', 'fieldName', 'audioClipFileName',
  'recognizedText', 'normalizedValue', 'finalValue', 'confidence',
  'inputMode', 'correctionType', 'errorType', 'latencyMs',
]

function logsToCSV(logs: LogEntry[]): string {
  const lines: string[] = [LOG_COLUMNS.join(',')]
  for (const log of logs) {
    const line = LOG_COLUMNS.map(col => {
      const v = String((log as unknown as Record<string, unknown>)[col] ?? '')
      return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v
    }).join(',')
    lines.push(line)
  }
  return lines.join('\n')
}

function hasBusinessColumn(col: string): boolean {
  return BUSINESS_COLUMNS.includes(col)
}

export function verifyNoBusinessColumnsInLog(logs: LogEntry[]): boolean {
  if (logs.length === 0) return true
  const logKeys = Object.keys(logs[0])
  return !logKeys.some(k => hasBusinessColumn(k) && !['surveyDate', 'baseDate'].includes(k))
}

export async function createLogZip(
  logs: LogEntry[],
  audioClips: AudioClip[],
  deviceInfo: DeviceInfo,
  _surveyDate: string,
  audioEnabled: boolean,
): Promise<Blob> {
  const zip = new JSZip()

  zip.file('logs.json', JSON.stringify(logs, null, 2))
  zip.file('logs.csv', logsToCSV(logs))
  zip.file('device.json', JSON.stringify(deviceInfo, null, 2))

  const audioFolder = zip.folder('audio')!
  if (audioEnabled) {
    for (const clip of audioClips) {
      audioFolder.file(clip.fileName, clip.blob)
    }
  }

  return zip.generateAsync({ type: 'blob' })
}

export function downloadZip(blob: Blob, surveyDate: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `bidae-logs-${surveyDate}.zip`
  a.click()
  URL.revokeObjectURL(url)
}
