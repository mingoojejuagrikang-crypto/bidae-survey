import { describe, it, expect } from 'vitest'
import { calcBaseDate } from '../utils/baseDate'

describe('calcBaseDate', () => {
  it('1~15일은 해당 월 1일', () => {
    expect(calcBaseDate('2025-08-05')).toBe('2025-08-01')
    expect(calcBaseDate('2025-08-01')).toBe('2025-08-01')
    expect(calcBaseDate('2025-08-15')).toBe('2025-08-01')
  })

  it('16일 이후는 해당 월 16일', () => {
    expect(calcBaseDate('2025-08-19')).toBe('2025-08-16')
    expect(calcBaseDate('2025-08-16')).toBe('2025-08-16')
    expect(calcBaseDate('2025-08-31')).toBe('2025-08-16')
    expect(calcBaseDate('2025-10-17')).toBe('2025-10-16')
  })

  it('월 패딩 확인', () => {
    expect(calcBaseDate('2025-01-10')).toBe('2025-01-01')
    expect(calcBaseDate('2025-12-20')).toBe('2025-12-16')
  })
})
