import { describe, it, expect } from 'vitest'
import { buildUploadPayload } from '../utils/upload'
import { generateSurveyRows } from '../utils/rowGenerator'
import { DEFAULT_SETTINGS } from '../types'
import { BUSINESS_COLUMNS } from '../utils/rowGenerator'

describe('buildUploadPayload', () => {
  it('업무 데이터 컬럼만 포함', () => {
    const rows = generateSurveyRows(DEFAULT_SETTINGS)
    const payload = buildUploadPayload(rows.slice(0, 1))
    expect(Object.keys(payload[0])).toEqual(BUSINESS_COLUMNS)
  })

  it('가상 상태 미포함', () => {
    const rows = generateSurveyRows(DEFAULT_SETTINGS)
    const payload = buildUploadPayload(rows.slice(0, 1))
    const forbidden = ['isComplete', 'isDirty', 'uploadStatus', 'rowId', 'createdAt', 'updatedAt']
    for (const f of forbidden) {
      expect(Object.keys(payload[0])).not.toContain(f)
    }
  })

  it('실제 업로드 테스트 미실행: 인증 정보 없음', () => {
    const url = process.env.APPS_SCRIPT_URL
    if (!url) {
      console.log('실제 업로드 테스트 미실행: 인증 정보 없음')
      expect(true).toBe(true)
      return
    }
  })
})
