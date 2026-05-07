import type { ParsedVoiceCommand } from '../types'
import { normalizeNumber } from './numberNormalizer'

export function parseVoiceCommand(raw: string): ParsedVoiceCommand {
  const trimmed = raw.trim()

  if (trimmed === '이전') {
    return { type: '이전', raw }
  }
  if (trimmed === '다음') {
    return { type: '다음', raw }
  }

  const 수정Match = trimmed.match(/^수정\s+(.+)$/)
  if (수정Match) {
    const num = normalizeNumber(수정Match[1])
    if (num !== null) {
      return { type: '수정', value: num, raw }
    }
  }

  if (trimmed === '수정') {
    return { type: '수정', raw }
  }

  const num = normalizeNumber(trimmed)
  if (num !== null) {
    return { type: 'number', value: num, raw }
  }

  return { type: 'unknown', raw }
}
