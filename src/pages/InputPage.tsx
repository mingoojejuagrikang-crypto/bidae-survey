import { useState, useRef, useEffect } from 'react'
import type { SurveyRow, AppSettings, LogEntry } from '../types'
import { parseVoiceCommand } from '../utils/voiceParser'
import { speak } from '../utils/tts'
import { findPreviousRow } from '../utils/previousValue'
import { getSpeechRecognition, type ISpeechRecognition } from '../utils/speechRecognition'
import { WarningBadge } from '../components/WarningBadge'
import { db } from '../db'

const MAX_ERRORS = 5

interface Props {
  rows: SurveyRow[]
  allRows: SurveyRow[]
  settings: AppSettings
  onUpdateRow: (row: SurveyRow) => Promise<void>
  onNavigate: (page: string) => void
  onDownloadCSV: () => void
  onDownloadZip: () => void
  onUpload: () => void
  addLog: (partial: Partial<LogEntry> & { fieldName: string; surveyDate: string; rowKey: string }) => Promise<void>
}

export function InputPage({ rows, allRows, settings, onUpdateRow, onNavigate, onDownloadCSV, onDownloadZip, onUpload, addLog }: Props) {
  const orderedFields = settings.fieldOrder as Array<'횡경' | '종경'>
  const [currentRowIdx, setCurrentRowIdx] = useState(0)
  const [currentField, setCurrentField] = useState<'횡경' | '종경'>(orderedFields[0])
  const [listening, setListening] = useState(false)
  const [lastField, setLastField] = useState<'횡경' | '종경'>(orderedFields[0])
  const [warnings, setWarnings] = useState<string[]>([])

  const recognitionRef = useRef<ISpeechRecognition | null>(null)
  const fieldRef = useRef(currentField)
  const lastFieldRef = useRef(lastField)
  const rowIdxRef = useRef(currentRowIdx)
  const listeningRef = useRef(false)
  const stopRequestedRef = useRef(false)
  const consecutiveErrorsRef = useRef(0)
  const startTimeRef = useRef(0)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const rowsRef = useRef(rows)

  useEffect(() => { fieldRef.current = currentField }, [currentField])
  useEffect(() => { lastFieldRef.current = lastField }, [lastField])
  useEffect(() => { rowIdxRef.current = currentRowIdx }, [currentRowIdx])
  useEffect(() => { rowsRef.current = rows }, [rows])

  const currentRow = rows[currentRowIdx]
  const prevRow = currentRow ? findPreviousRow(currentRow, allRows) : null

  function checkWarnings(field: '횡경' | '종경', value: string, prev: SurveyRow | null): string[] {
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
  }

  async function saveCurrentChunkAsClip(rowKey: string, fieldName: string): Promise<string> {
    const recorder = mediaRecorderRef.current
    if (!settings.logEnabled || !settings.audioClipEnabled || !recorder) return ''
    const chunks = [...audioChunksRef.current]
    audioChunksRef.current = []
    if (chunks.length === 0) return ''
    const mimeType = recorder.mimeType || 'audio/webm'
    const ext = mimeType.includes('webm') ? 'webm' : mimeType.includes('mp4') ? 'mp4' : 'audio'
    const ts = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-')
    const fileName = `${ts}_${fieldName}.${ext}`
    const blob = new Blob(chunks, { type: mimeType })
    await db.audioClips.add({ clipId: crypto.randomUUID(), fileName, blob, rowKey, fieldName, timestamp: new Date().toISOString() })
    return fileName
  }

  function goPrev() {
    const [first, second] = orderedFields
    if (fieldRef.current === second) {
      setCurrentField(first)
      fieldRef.current = first
      setLastField(first)
      lastFieldRef.current = first
      speak(first)
    } else {
      if (rowIdxRef.current > 0) {
        const newIdx = rowIdxRef.current - 1
        setCurrentRowIdx(newIdx)
        rowIdxRef.current = newIdx
        setCurrentField(second)
        fieldRef.current = second
        setLastField(second)
        lastFieldRef.current = second
        setWarnings([])
        speak(second)
      }
    }
  }

  function goNext() {
    const [first, second] = orderedFields
    if (fieldRef.current === first) {
      setCurrentField(second)
      fieldRef.current = second
      setLastField(second)
      lastFieldRef.current = second
      speak(second)
    } else {
      if (rowIdxRef.current < rowsRef.current.length - 1) {
        const newIdx = rowIdxRef.current + 1
        setCurrentRowIdx(newIdx)
        rowIdxRef.current = newIdx
        setCurrentField(first)
        fieldRef.current = first
        setLastField(first)
        lastFieldRef.current = first
        setWarnings([])
        speak(first)
      }
    }
  }

  async function applyValue(
    field: '횡경' | '종경',
    value: number,
    recognizedText: string,
    inputMode: LogEntry['inputMode'],
    correctionType: LogEntry['correctionType'],
    audioClipFileName: string,
    latencyMs: number,
  ) {
    const row = rowsRef.current[rowIdxRef.current]
    if (!row) return
    const prev = findPreviousRow(row, allRows)
    const warns = checkWarnings(field, String(value), prev)
    await onUpdateRow({ ...row, [field]: String(value) })
    speak(`${field} ${value}`)
    void addLog({
      fieldName: field,
      surveyDate: row.surveyDate,
      rowKey: row.rowId,
      recognizedText,
      normalizedValue: String(value),
      finalValue: String(value),
      inputMode,
      correctionType,
      audioClipFileName,
      latencyMs,
      errorType: warns.some(w => w.includes('범위')) ? 'range_warning' : 'none',
    })
    if (warns.some(w => w.includes('변화'))) {
      void addLog({
        fieldName: field,
        surveyDate: row.surveyDate,
        rowKey: row.rowId,
        finalValue: String(value),
        inputMode,
        correctionType,
        errorType: 'range_warning',
      })
    }
  }

  async function handleVoice(transcript: string) {
    const latencyMs = Date.now() - startTimeRef.current
    startTimeRef.current = Date.now()
    const cmd = parseVoiceCommand(transcript)
    const row = rowsRef.current[rowIdxRef.current]
    if (!row) return
    const audioClipFileName = await saveCurrentChunkAsClip(row.rowId, fieldRef.current)
    if (cmd.type === 'number' && cmd.value !== undefined) {
      setLastField(fieldRef.current)
      lastFieldRef.current = fieldRef.current
      await applyValue(fieldRef.current, cmd.value, transcript, 'voice', 'normal', audioClipFileName, latencyMs)
    } else if (cmd.type === '수정' && cmd.value !== undefined) {
      await applyValue(lastFieldRef.current, cmd.value, transcript, 'voice', '수정', audioClipFileName, latencyMs)
    } else if (cmd.type === '이전') {
      void addLog({
        fieldName: fieldRef.current,
        surveyDate: row.surveyDate,
        rowKey: row.rowId,
        recognizedText: transcript,
        correctionType: '이전',
        inputMode: 'voice',
        audioClipFileName,
        latencyMs,
        errorType: 'none',
      })
      goPrev()
    } else if (cmd.type === '다음') {
      void addLog({
        fieldName: fieldRef.current,
        surveyDate: row.surveyDate,
        rowKey: row.rowId,
        recognizedText: transcript,
        correctionType: '다음',
        inputMode: 'voice',
        audioClipFileName,
        latencyMs,
        errorType: 'none',
      })
      goNext()
    }
  }

  function startListeningRecognition() {
    const SpeechRec = getSpeechRecognition()
    if (!SpeechRec) return
    const recognition = new SpeechRec()
    recognition.lang = 'ko-KR'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      consecutiveErrorsRef.current = 0
      void handleVoice(e.results[0][0].transcript)
    }
    recognition.onerror = () => {
      consecutiveErrorsRef.current++
      const row = rowsRef.current[rowIdxRef.current]
      if (row) {
        void addLog({
          fieldName: fieldRef.current,
          surveyDate: row.surveyDate,
          rowKey: row.rowId,
          errorType: 'stt_error',
          inputMode: 'voice',
        })
      }
    }
    recognition.onend = () => {
      recognitionRef.current = null
      if (listeningRef.current && !stopRequestedRef.current && consecutiveErrorsRef.current < MAX_ERRORS) {
        startTimeRef.current = Date.now()
        startListeningRecognition()
      } else {
        setListening(false)
        listeningRef.current = false
        stopMediaRecorder()
      }
    }
    recognition.start()
    recognitionRef.current = recognition
  }

  async function startListening() {
    const SpeechRec = getSpeechRecognition()
    if (!SpeechRec) {
      alert('이 브라우저는 음성인식을 지원하지 않습니다.')
      const row = rowsRef.current[rowIdxRef.current]
      if (row) {
        void addLog({
          fieldName: fieldRef.current,
          surveyDate: row.surveyDate,
          rowKey: row.rowId,
          errorType: 'unsupported',
          inputMode: 'system',
        })
      }
      return
    }
    stopRequestedRef.current = false
    consecutiveErrorsRef.current = 0
    listeningRef.current = true
    setListening(true)
    if (settings.logEnabled && settings.audioClipEnabled) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        mediaStreamRef.current = stream
        const recorder = new MediaRecorder(stream)
        mediaRecorderRef.current = recorder
        audioChunksRef.current = []
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data)
        }
        recorder.start(100)
      } catch {
        // mic denied or MediaRecorder unsupported — continue without audio
      }
    }
    startTimeRef.current = Date.now()
    startListeningRecognition()
  }

  function stopMediaRecorder() {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') recorder.stop()
    mediaRecorderRef.current = null
    const stream = mediaStreamRef.current
    if (stream) {
      stream.getTracks().forEach(t => t.stop())
      mediaStreamRef.current = null
    }
    audioChunksRef.current = []
  }

  function stopListening() {
    stopRequestedRef.current = true
    listeningRef.current = false
    recognitionRef.current?.stop()
    stopMediaRecorder()
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
        {orderedFields.map(field => {
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
                onBlur={e => {
                  const value = e.target.value
                  if (value !== '') {
                    void addLog({
                      fieldName: field,
                      surveyDate: currentRow.surveyDate,
                      rowKey: currentRow.rowId,
                      finalValue: value,
                      normalizedValue: value,
                      inputMode: 'manual',
                      correctionType: 'manual',
                      errorType: 'none',
                    })
                  }
                }}
                onFocus={() => {
                  setCurrentField(field)
                  fieldRef.current = field
                  setLastField(field)
                  lastFieldRef.current = field
                }}
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
        <button onClick={() => void startListening()} disabled={listening}
          style={{ padding: 12, fontSize: 15, background: listening ? '#94a3b8' : '#16a34a', color: '#fff', border: 'none', borderRadius: 8 }}>
          {listening ? '인식 중...' : '음성 시작'}
        </button>
        <button onClick={stopListening} disabled={!listening}
          style={{ padding: 12, fontSize: 15, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8 }}>
          음성 종료
        </button>
        <button onClick={() => {
          const row = rowsRef.current[rowIdxRef.current]
          if (row) {
            void addLog({
              fieldName: fieldRef.current,
              surveyDate: row.surveyDate,
              rowKey: row.rowId,
              correctionType: '이전',
              inputMode: 'manual',
              errorType: 'none',
            })
          }
          goPrev()
        }}
          style={{ padding: 12, fontSize: 15, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8 }}>
          이전
        </button>
        <button onClick={() => {
          const row = rowsRef.current[rowIdxRef.current]
          if (row) {
            void addLog({
              fieldName: fieldRef.current,
              surveyDate: row.surveyDate,
              rowKey: row.rowId,
              correctionType: '다음',
              inputMode: 'manual',
              errorType: 'none',
            })
          }
          goNext()
        }}
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
