import { describe, it, expect } from 'vitest'
import { findPreviousRow } from '../utils/previousValue'
import type { SurveyRow } from '../types'

function makeRow(surveyDate: string, overrides: Partial<SurveyRow> = {}): SurveyRow {
  return {
    rowId: `${surveyDate}__A__시험__1__1`,
    surveyDate,
    baseDate: '2025-08-01',
    farmerName: '이원창',
    label: 'A',
    treatment: '시험',
    tree: '1',
    fruit: '1',
    횡경: '35.0',
    종경: '33.0',
    비고: '',
    isComplete: false,
    isDirty: false,
    uploadStatus: 'pending',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  }
}

describe('findPreviousRow', () => {
  it('이전 조사값 찾기', () => {
    const current = makeRow('2025-09-01')
    const prev = makeRow('2025-08-01')
    const older = makeRow('2025-07-01')
    const result = findPreviousRow(current, [current, prev, older])
    expect(result?.surveyDate).toBe('2025-08-01')
  })

  it('이전값 없으면 null', () => {
    const current = makeRow('2025-08-01')
    const result = findPreviousRow(current, [current])
    expect(result).toBeNull()
  })

  it('다른 행 매치 안 함', () => {
    const current = makeRow('2025-09-01')
    const other = makeRow('2025-08-01', { label: 'B', farmerName: '강남호' })
    const result = findPreviousRow(current, [current, other])
    expect(result).toBeNull()
  })
})
