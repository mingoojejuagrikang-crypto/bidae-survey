import { useCallback } from 'react'
import { db } from '../db'
import type { LogEntry, AppSettings } from '../types'
import { APP_VERSION } from '../types'
import { getDeviceInfo } from '../utils/deviceInfo'
import { calcBaseDate } from '../utils/baseDate'

let sessionId = crypto.randomUUID()

export function resetSessionId() {
  sessionId = crypto.randomUUID()
}

export function useLogs(settings: AppSettings) {
  const addLog = useCallback(async (partial: Partial<LogEntry> & { fieldName: string; surveyDate: string; rowKey: string }) => {
    if (!settings.logEnabled) return
    const dev = getDeviceInfo()
    const entry: LogEntry = {
      logId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      sessionId,
      appVersion: APP_VERSION,
      deviceInfo: dev.userAgent,
      osName: dev.osName,
      osVersion: dev.osVersion,
      browserName: dev.browserName,
      browserVersion: dev.browserVersion,
      userAgent: dev.userAgent,
      screenSize: dev.screenSize,
      networkStatus: navigator.onLine ? 'online' : 'offline',
      surveyDate: partial.surveyDate,
      baseDate: calcBaseDate(partial.surveyDate),
      rowKey: partial.rowKey,
      fieldName: partial.fieldName,
      audioClipFileName: partial.audioClipFileName ?? '',
      recognizedText: partial.recognizedText ?? '',
      normalizedValue: partial.normalizedValue ?? '',
      finalValue: partial.finalValue ?? '',
      confidence: partial.confidence ?? 0,
      inputMode: partial.inputMode ?? 'manual',
      correctionType: partial.correctionType ?? 'normal',
      errorType: partial.errorType ?? 'none',
      latencyMs: partial.latencyMs ?? 0,
    }
    await db.logs.add(entry)
  }, [settings.logEnabled])

  const getLogs = useCallback(async (surveyDate?: string): Promise<LogEntry[]> => {
    if (surveyDate) {
      return db.logs.where('surveyDate').equals(surveyDate).toArray()
    }
    return db.logs.toArray()
  }, [])

  const clearLogs = useCallback(async () => {
    await db.logs.clear()
    await db.audioClips.clear()
  }, [])

  return { addLog, getLogs, clearLogs }
}
