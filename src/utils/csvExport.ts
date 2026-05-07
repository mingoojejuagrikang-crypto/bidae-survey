import type { SurveyRow } from '../types'
import { toBusinessRow, BUSINESS_COLUMNS } from './rowGenerator'

export function rowsToCSV(rows: SurveyRow[]): string {
  const lines: string[] = [BUSINESS_COLUMNS.join(',')]
  for (const row of rows) {
    const bRow = toBusinessRow(row)
    const line = BUSINESS_COLUMNS.map(col => {
      const v = bRow[col] ?? ''
      return v.includes(',') || v.includes('"') || v.includes('\n')
        ? `"${v.replace(/"/g, '""')}"`
        : v
    }).join(',')
    lines.push(line)
  }
  return lines.join('\n')
}

export function downloadCSV(rows: SurveyRow[], surveyDate: string): void {
  const csv = rowsToCSV(rows)
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `bidae-survey-${surveyDate}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
