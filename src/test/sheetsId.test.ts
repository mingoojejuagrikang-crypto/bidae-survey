import { describe, it, expect } from 'vitest'
import { extractSpreadsheetId } from '../utils/sheetsId'

describe('extractSpreadsheetId', () => {
  it('URL에서 spreadsheetId 추출', () => {
    expect(
      extractSpreadsheetId('https://docs.google.com/spreadsheets/d/abc123XYZ/edit#gid=0')
    ).toBe('abc123XYZ')
  })

  it('긴 ID 추출', () => {
    expect(
      extractSpreadsheetId('https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/edit')
    ).toBe('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms')
  })

  it('잘못된 URL은 null', () => {
    expect(extractSpreadsheetId('https://example.com')).toBeNull()
    expect(extractSpreadsheetId('')).toBeNull()
  })
})
