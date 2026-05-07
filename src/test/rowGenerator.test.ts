import { describe, it, expect } from 'vitest'
import { generateSurveyRows, toBusinessRow, BUSINESS_COLUMNS } from '../utils/rowGenerator'
import { DEFAULT_SETTINGS } from '../types'

describe('generateSurveyRows', () => {
  it('기본 설정으로 90행 생성', () => {
    const rows = generateSurveyRows(DEFAULT_SETTINGS)
    expect(rows).toHaveLength(90)
  })

  it('농가/라벨 매핑 확인', () => {
    const rows = generateSurveyRows(DEFAULT_SETTINGS)
    const aRows = rows.filter(r => r.label === 'A')
    expect(aRows.every(r => r.farmerName === '이원창')).toBe(true)
    const bRows = rows.filter(r => r.label === 'B')
    expect(bRows.every(r => r.farmerName === '강남호')).toBe(true)
    const cRows = rows.filter(r => r.label === 'C')
    expect(cRows.every(r => r.farmerName === '양승보')).toBe(true)
  })

  it('설정 변경 시 행 수 변화', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      farmerLabels: [{ label: 'A', name: '이원창' }],
      treatments: ['시험'],
      trees: ['1', '2'],
      fruits: ['1', '2', '3'],
    }
    const rows = generateSurveyRows(settings)
    expect(rows).toHaveLength(6)
  })

  it('기준일자 자동 설정', () => {
    const settings = { ...DEFAULT_SETTINGS, surveyDate: '2025-08-05' }
    const rows = generateSurveyRows(settings)
    expect(rows[0].baseDate).toBe('2025-08-01')
  })

  it('rowId 중복 없음', () => {
    const rows = generateSurveyRows(DEFAULT_SETTINGS)
    const ids = rows.map(r => r.rowId)
    const unique = new Set(ids)
    expect(unique.size).toBe(rows.length)
  })
})

describe('toBusinessRow', () => {
  it('업무 데이터 컬럼만 포함', () => {
    const rows = generateSurveyRows(DEFAULT_SETTINGS)
    const bRow = toBusinessRow(rows[0])
    const keys = Object.keys(bRow)
    expect(keys).toEqual(BUSINESS_COLUMNS)
  })

  it('가상 상태 컬럼 미포함', () => {
    const rows = generateSurveyRows(DEFAULT_SETTINGS)
    const bRow = toBusinessRow(rows[0])
    const forbidden = ['isComplete', 'isDirty', 'hasError', 'rowId', 'uploadStatus', 'createdAt', 'updatedAt', 'inputStatus']
    for (const f of forbidden) {
      expect(Object.keys(bRow)).not.toContain(f)
    }
  })
})
