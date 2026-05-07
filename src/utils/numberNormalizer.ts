const KO_DIGIT: Record<string, number> = {
  '영': 0, '일': 1, '이': 2, '삼': 3, '사': 4,
  '오': 5, '육': 6, '칠': 7, '팔': 8, '구': 9,
}

function singleKoDigit(s: string): number | null {
  return s in KO_DIGIT ? KO_DIGIT[s] : null
}

function parseKoreanInt(s: string): number | null {
  let result = 0
  let remaining = s

  if (remaining.includes('백')) {
    const idx = remaining.indexOf('백')
    const before = remaining.slice(0, idx)
    const d = before === '' ? 1 : singleKoDigit(before)
    if (d === null) return null
    result += d * 100
    remaining = remaining.slice(idx + 1)
  }

  if (remaining.includes('십')) {
    const idx = remaining.indexOf('십')
    const before = remaining.slice(0, idx)
    const after = remaining.slice(idx + 1)
    const tens = before === '' ? 1 : singleKoDigit(before)
    if (tens === null) return null
    result += tens * 10
    if (after !== '') {
      const units = singleKoDigit(after)
      if (units === null) return null
      result += units
    }
    return result > 0 ? result : null
  }

  if (remaining === '') return result > 0 ? result : null

  if ([...remaining].every(ch => ch in KO_DIGIT)) {
    const digits = [...remaining].map(ch => KO_DIGIT[ch])
    return parseInt(digits.join(''))
  }

  const d = singleKoDigit(remaining)
  if (d !== null) { result += d; return result }

  return null
}

function parseKoreanPart(part: string, isDecimal: boolean): string | null {
  const trimmed = part.trim()
  if (!trimmed) return ''

  if (/^[\d]+$/.test(trimmed)) return trimmed

  const noSpace = trimmed.replace(/\s+/g, '')
  const hasKorean = /[가-힣]/.test(noSpace)
  const hasArabic = /[0-9]/.test(noSpace)

  if (!hasKorean && hasArabic) return noSpace

  if (hasKorean && !hasArabic) {
    if (isDecimal) {
      if ([...noSpace].every(ch => ch in KO_DIGIT)) {
        return [...noSpace].map(ch => KO_DIGIT[ch]).join('')
      }
      const d = singleKoDigit(noSpace)
      return d !== null ? String(d) : null
    }

    const intVal = parseKoreanInt(noSpace)
    if (intVal !== null) return String(intVal)

    if (trimmed.includes(' ')) {
      const tokens = trimmed.split(/\s+/)
      const digits = tokens.map(t => {
        const d = singleKoDigit(t)
        return d !== null ? String(d) : null
      })
      if (digits.every(d => d !== null)) return digits.join('')
    }

    return null
  }

  return null
}

export function normalizeNumber(input: string): number | null {
  let s = input.trim()
  s = s.replace(/쩜|점/g, '.')

  const dotParts = s.split('.')
  if (dotParts.length > 2) return null

  const normInt = parseKoreanPart(dotParts[0], false)
  if (normInt === null) return null

  if (dotParts.length === 1) {
    if (normInt === '') return null
    const num = parseFloat(normInt)
    return isNaN(num) ? null : num
  }

  const normDec = parseKoreanPart(dotParts[1], true)
  if (normDec === null) return null

  const joined = `${normInt}.${normDec}`
  if (joined === '.') return null

  const num = parseFloat(joined)
  return isNaN(num) ? null : num
}
