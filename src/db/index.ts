import Dexie, { type EntityTable } from 'dexie'
import type { AppSettings, SurveyRow, LogEntry, AudioClip, UploadHistoryEntry } from '../types'

interface SettingsRecord {
  id: number
  data: AppSettings
}

const db = new Dexie('BidaeSurveyDB') as Dexie & {
  settings: EntityTable<SettingsRecord, 'id'>
  surveyRows: EntityTable<SurveyRow, 'rowId'>
  logs: EntityTable<LogEntry, 'logId'>
  audioClips: EntityTable<AudioClip, 'clipId'>
  uploadHistory: EntityTable<UploadHistoryEntry, 'uploadId'>
}

db.version(1).stores({
  settings: 'id',
  surveyRows: 'rowId, surveyDate, label, treatment, tree, fruit, uploadStatus',
  logs: 'logId, timestamp, surveyDate, rowKey',
  audioClips: 'clipId, fileName, rowKey, fieldName, timestamp',
  uploadHistory: 'uploadId, surveyDate, uploadedAt',
})

export { db }
