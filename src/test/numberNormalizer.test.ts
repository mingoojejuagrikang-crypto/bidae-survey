import { describe, it, expect } from 'vitest'
import { normalizeNumber } from '../utils/numberNormalizer'

describe('normalizeNumber', () => {
  it('숫자 문자열 그대로', () => {
    expect(normalizeNumber('35.1')).toBe(35.1)
    expect(normalizeNumber('42')).toBe(42)
    expect(normalizeNumber('0.5')).toBe(0.5)
  })

  it('점 → .(공백 있음)', () => {
    expect(normalizeNumber('35 점 1')).toBe(35.1)
  })

  it('점 → .(공백 없음)', () => {
    expect(normalizeNumber('35점1')).toBe(35.1)
  })

  it('쩜 → .', () => {
    expect(normalizeNumber('35쩜1')).toBe(35.1)
  })

  it('한글 한자리 숫자', () => {
    expect(normalizeNumber('삼 오 점 일')).toBe(35.1)
  })

  it('한글 한자리 붙여쓰기', () => {
    expect(normalizeNumber('삼오점일')).toBe(35.1)
  })

  it('한글 십단위', () => {
    expect(normalizeNumber('삼십오 점 일')).toBe(35.1)
  })

  it('잘못된 입력은 null', () => {
    expect(normalizeNumber('')).toBeNull()
    expect(normalizeNumber('abc')).toBeNull()
    expect(normalizeNumber('확인')).toBeNull()
  })
})
