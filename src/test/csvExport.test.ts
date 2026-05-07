import { describe, it, expect } from 'vitest'
import { rowsToCSV, BUSINESS_COLUMNS } from '../utils'
import { generateSurveyRows } from '../utils/rowGenerator'
import { DEFAULT_SETTINGS } from '../types'

describe('rowsToCSV', () => {
  it('업무 데이터 컬럼만 포함', () => {
    const rows = generateSurveyRows(DEFAULT_SETTINGS)
    const csv = rowsToCSV(rows)
    const header = csv.split('\n')[0]
    const cols = header.split(',')
    expect(cols).toEqual(BUSINESS_COLUMNS)
  })

  it('로그/가상 상태 컬럼 미포함', () => {
    const rows = generateSurveyRows(DEFAULT_SETTINGS)
    const csv = rowsToCSV(rows)
    const forbidden = ['isComplete', 'isDirty', 'uploadStatus', 'createdAt', 'updatedAt', 'rowId']
    for (const f of forbidden) {
      expect(csv).not.toContain(f)
    }
  })

  it('90행 CSV 생성', () => {
    const rows = generateSurveyRows(DEFAULT_SETTINGS)
    const csv = rowsToCSV(rows)
    const lines = csv.split('\n').filter(Boolean)
    expect(lines).toHaveLength(91) // header + 90 rows
  })
})
