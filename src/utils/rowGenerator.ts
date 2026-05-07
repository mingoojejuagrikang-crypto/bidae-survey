import type { AppSettings, SurveyRow } from '../types'
import { calcBaseDate } from './baseDate'

export function generateRowId(
  surveyDate: string,
  label: string,
  treatment: string,
  tree: string,
  fruit: string,
): string {
  return `${surveyDate}__${label}__${treatment}__${tree}__${fruit}`
}

export function generateSurveyRows(settings: AppSettings): SurveyRow[] {
  const baseDate = calcBaseDate(settings.surveyDate)
  const now = new Date().toISOString()
  const rows: SurveyRow[] = []

  for (const fl of settings.farmerLabels) {
    for (const treatment of settings.treatments) {
      for (const tree of settings.trees) {
        for (const fruit of settings.fruits) {
          const rowId = generateRowId(settings.surveyDate, fl.label, treatment, tree, fruit)
          rows.push({
            rowId,
            surveyDate: settings.surveyDate,
            baseDate,
            farmerName: fl.name,
            label: fl.label,
            treatment,
            tree,
            fruit,
            횡경: '',
            종경: '',
            비고: '',
            isComplete: false,
            isDirty: false,
            uploadStatus: 'pending',
            createdAt: now,
            updatedAt: now,
          })
        }
      }
    }
  }

  return rows
}

export function toBusinessRow(row: SurveyRow): Record<string, string> {
  return {
    조사일자: row.surveyDate,
    기준일자: row.baseDate,
    농가명: row.farmerName,
    라벨: row.label,
    처리: row.treatment,
    조사나무: row.tree,
    조사과실: row.fruit,
    횡경: row.횡경,
    종경: row.종경,
    비고: row.비고,
  }
}

export const BUSINESS_COLUMNS = [
  '조사일자', '기준일자', '농가명', '라벨', '처리', '조사나무', '조사과실', '횡경', '종경', '비고',
]
