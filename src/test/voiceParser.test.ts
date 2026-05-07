import { describe, it, expect } from 'vitest'
import { parseVoiceCommand } from '../utils/voiceParser'

describe('parseVoiceCommand', () => {
  it('"35.1" → 숫자 입력', () => {
    const r = parseVoiceCommand('35.1')
    expect(r.type).toBe('number')
    expect(r.value).toBe(35.1)
  })

  it('"35 점 1" → 35.1', () => {
    const r = parseVoiceCommand('35 점 1')
    expect(r.type).toBe('number')
    expect(r.value).toBe(35.1)
  })

  it('"삼 오 점 일" → 35.1', () => {
    const r = parseVoiceCommand('삼 오 점 일')
    expect(r.type).toBe('number')
    expect(r.value).toBe(35.1)
  })

  it('"수정 35.1" → 직전 항목 수정', () => {
    const r = parseVoiceCommand('수정 35.1')
    expect(r.type).toBe('수정')
    expect(r.value).toBe(35.1)
  })

  it('"이전" → 이전 이동', () => {
    const r = parseVoiceCommand('이전')
    expect(r.type).toBe('이전')
  })

  it('"다음" → 다음 이동', () => {
    const r = parseVoiceCommand('다음')
    expect(r.type).toBe('다음')
  })

  it('알 수 없는 명령', () => {
    const r = parseVoiceCommand('확인')
    expect(r.type).toBe('unknown')
  })
})
