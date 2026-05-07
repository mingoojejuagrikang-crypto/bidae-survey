import { useState, useRef, useCallback, useEffect } from 'react'
import type { SurveyRow, AppSettings } from '../types'
import { parseVoiceCommand } from '../utils/voiceParser'
import { speak } from '../utils/tts'
import { findPreviousRow } from '../utils/previousValue'
import { getSpeechRecognition, type ISpeechRecognition } from '../utils/speechRecognition'
import { WarningBadge } from '../components/WarningBadge'

interface Props {
  rows: SurveyRow[]
  allRows: SurveyRow[]
  settings: AppSettings
  onUpdateRow: (row: SurveyRow) => Promise<void>
  onNavigate: (page: string) => void
  onDownloadCSV: () => void
  onDownloadZip: () => void
  onUpload: () => void
}

export function InputPage({ rows, allRows, settings, onUpdateRow, onNavigate, onDownloadCSV, onDownloadZip, onUpload }: Props) {
  const [currentRowIdx, setCurrentRowIdx] = useState(0)
  const [currentField, setCurrentField] = useState<'횡경' | '종경'>('횡경')
  const [listening, setListening] = useState(false)
  const [lastField, setLastField] = useState<'횡경' | '종경'>('횡경')
  const [warnings, setWarnings] = useState<string[]>([])
  const recognitionRef = useRef<ISpeechRecognition | null>(null)
  const fieldRef = useRef(currentField)
  const rowIdxRef = useRef(currentRowIdx)

  useEffect(() => { fieldRef.current = currentField }, [currentField])
  useEffect(() => { rowIdxRef.current = currentRowIdx }, [currentRowIdx])

  const currentRow = rows[currentRowIdx]
  const prevRow = currentRow ? findPreviousRow(currentRow, allRows) : null

  const checkWarnings = useCallback((field: '횡경' | '종경', value: string, prev: SurveyRow | null): string[] => {
    const warns: string[] = []
    const num = parseFloat(value)
    if (!isNaN(num)) {
      const range = settings.normalRanges[field]
      if (num < range.min || num > range.max) {
        warns.push(`${field} 범위 외 (${range.min}~${range.max})`)
      }
      if (prev) {
        const prevVal = parseFloat(prev[field])
        if (!isNaN(prevVal)) {
          const diff = Math.abs(num - prevVal)
          if (diff >= settings.changeThresholds[field]) {
            warns.push(`${field} 변화 큼 (+${diff.toFixed(1)})`)
          }
        }
      }
    }
    setWarnings(warns)
    if (warns.length > 0) speak('경고')
    return warns
  }, [settings])

  function goPrev() {
    if (fieldRef.current === '종경') {
      setCurrentField('횡경')
      fieldRef.current = '횡경'
      setLastField('횡경')
      speak('횡경')
    } else {
      if (rowIdxRef.current > 0) {
        const newIdx = rowIdxRef.current - 1
        setCurrentRowIdx(newIdx)
        rowIdxRef.current = newIdx
        setCurrentField('종경')
        fieldRef.current = '종경'
        setWarnings([])
        speak('종경')
        setLastField('종경')
      }
    }
  }

  function goNext() {
    if (fieldRef.current === '횡경') {
      setCurrentField('종경')
      fieldRef.current = '종경'
      setLastField('종경')
      speak('종경')
    } else {
      if (rowIdxRef.current < rows.length - 1) {
        const newIdx = rowIdxRef.current + 1
        setCurrentRowIdx(newIdx)
        rowIdxRef.current = newIdx
        setCurrentField('횡경')
        fieldRef.current = '횡경'
        setWarnings([])
        speak('횡경')
        setLastField('횡경')
      }
    }
  }

  async function applyValue(field: '횡경' | '종경', value: number) {
    const row = rows[rowIdxRef.current]
    if (!row) return
    const prev = findPreviousRow(row, allRows)
    const updated = { ...row, [field]: String(value) }
    checkWarnings(field, String(value), prev)
    await onUpdateRow(updated)
    speak(`${field} ${value}`)
  }

  function handleVoice(transcript: string) {
    const cmd = parseVoiceCommand(transcript)
    if (cmd.type === 'number' && cmd.value !== undefined) {
      void applyValue(fieldRef.current, cmd.value)
      setLastField(fieldRef.current)
    } else if (cmd.type === '수정' && cmd.value !== undefined) {
      void applyValue(lastField, cmd.value)
    } else if (cmd.type === '이전') {
      goPrev()
    } else if (cmd.type === '다음') {
      goNext()
    }
  }

  function startListening() {
    const SpeechRec = getSpeechRecognition()
    if (!SpeechRec) {
      alert('이 브라우저는 음성인식을 지원하지 않습니다.')
      return
    }
    const recognition = new SpeechRec()
    recognition.lang = 'ko-KR'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0][0].transcript
      handleVoice(transcript)
    }
    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)
    recognition.start()
    recognitionRef.current = recognition
    setListening(true)
  }

  function stopListening() {
    recognitionRef.current?.stop()
    setListening(false)
  }

  if (rows.length === 0) {
    return (
      <div style={{ padding: 16 }}>
        <p>조사 행이 없습니다. 설정에서 행을 생성해 주세요.</p>
        <button onClick={() => onNavigate('generate')}>행 생성으로</button>
      </div>
    )
  }

  if (!currentRow) return null

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif', maxWidth: 480 }}>
      <div style={{ background: '#f1f5f9', padding: '8px 12px', borderRadius: 8, marginBottom: 12, fontSize: 14 }}>
        <div>{currentRow.surveyDate} / 기준 {currentRow.baseDate}</div>
        <div>{currentRow.label} {currentRow.farmerName} / {currentRow.treatment}</div>
        <div>나무 {currentRow.tree} / 과실 {currentRow.fruit}</div>
        <div style={{ fontWeight: 700 }}>현재: {currentField}</div>
        <div style={{ fontSize: 12, color: '#64748b' }}>{currentRowIdx + 1} / {rows.length}</div>
      </div>

      {warnings.map((w, i) => <WarningBadge key={i} message={w} />)}

      <div style={{ background: '#fff', border: '2px solid #2563eb', borderRadius: 12, padding: 16, marginBottom: 12 }}>
        {(['횡경', '종경'] as const).map(field => {
          const val = currentRow[field]
          const prevVal = prevRow ? prevRow[field] : null
          const isCurrent = currentField === field
          return (
            <div key={field} style={{
              display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8,
              background: isCurrent ? '#eff6ff' : 'transparent',
              padding: '4px 8px', borderRadius: 6,
            }}>
              <span style={{ fontSize: 16, fontWeight: 600, width: 40 }}>{field}:</span>
              <span style={{ fontSize: 28, fontWeight: 700, minWidth: 80 }}>
                {val !== '' ? val : '-'}
              </span>
              <span style={{ fontSize: 14, color: '#64748b' }} data-testid={`prev-${field}`}>
                (이전 {prevVal && prevVal !== '' ? prevVal : '-'})
              </span>
              <input
                type="number"
                step="0.1"
                value={val}
                onChange={async e => {
                  const updated = { ...currentRow, [field]: e.target.value }
                  await onUpdateRow(updated)
                  checkWarnings(field, e.target.value, prevRow)
                }}
                onFocus={() => { setCurrentField(field); setLastField(field) }}
                style={{ width: 80, fontSize: 16, marginLeft: 8 }}
                data-testid={`input-${field}`}
              />
            </div>
          )
        })}
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 14 }}>비고:
          <input
            type="text"
            value={currentRow.비고}
            onChange={async e => {
              const updated = { ...currentRow, 비고: e.target.value }
              await onUpdateRow(updated)
            }}
            style={{ marginLeft: 8, width: '80%', fontSize: 14 }}
            data-testid="input-비고"
          />
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <button onClick={startListening} disabled={listening}
          style={{ padding: 12, fontSize: 15, background: listening ? '#94a3b8' : '#16a34a', color: '#fff', border: 'none', borderRadius: 8 }}>
          {listening ? '인식 중...' : '음성 시작'}
        </button>
        <button onClick={stopListening} disabled={!listening}
          style={{ padding: 12, fontSize: 15, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8 }}>
          음성 종료
        </button>
        <button onClick={goPrev}
          style={{ padding: 12, fontSize: 15, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8 }}>
          이전
        </button>
        <button onClick={goNext}
          style={{ padding: 12, fontSize: 15, background: '#0891b2', color: '#fff', border: 'none', borderRadius: 8 }}>
          다음
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        <button onClick={() => onNavigate('review')}
          style={{ padding: 10, fontSize: 13, background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6 }}>
          데이터 확인
        </button>
        <button onClick={onUpload} data-testid="upload-button"
          style={{ padding: 10, fontSize: 13, background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6 }}>
          업로드
        </button>
        <button onClick={onDownloadCSV} data-testid="csv-download-button"
          style={{ padding: 10, fontSize: 13, background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6 }}>
          CSV 다운
        </button>
        <button onClick={onDownloadZip} data-testid="log-zip-download-button"
          style={{ padding: 10, fontSize: 13, background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6 }}>
          로그 ZIP
        </button>
        <button onClick={() => onNavigate('settings')}
          style={{ padding: 10, fontSize: 13, background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6 }}>
          설정
        </button>
        <button onClick={() => onNavigate('diag')}
          style={{ padding: 10, fontSize: 13, background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6 }}>
          진단
        </button>
      </div>
    </div>
  )
}
