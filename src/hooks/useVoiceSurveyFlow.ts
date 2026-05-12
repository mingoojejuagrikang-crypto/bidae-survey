import { useState, useRef, useEffect, useMemo } from 'react'
import type { SurveyRow, AppSettings, LogEntry } from '../types'
import { parseVoiceCommand } from '../utils/voiceParser'
import { speakAsync } from '../utils/tts'
import { findPreviousRow } from '../utils/previousValue'
import { getSpeechRecognition, type ISpeechRecognition } from '../utils/speechRecognition'
import { getTreeGroups, findFirstIncompletePosition, isTreeComplete } from '../utils/treeGroup'
import type { MeasureField, TreeGroup } from '../utils/treeGroup'
import { db } from '../db'

const MAX_ERRORS = 5

interface VoiceSurveyFlowOptions {
  rows: SurveyRow[]
  allRows: SurveyRow[]
  settings: AppSettings
  onUpdateRow: (row: SurveyRow) => Promise<void>
  addLog: (partial: Partial<LogEntry> & { fieldName: string; surveyDate: string; rowKey: string }) => Promise<void>
}

export function useVoiceSurveyFlow({
  rows,
  allRows,
  settings,
  onUpdateRow,
  addLog,
}: VoiceSurveyFlowOptions) {
  const treeGroupsRef = useRef<TreeGroup[]>([])
  const treeGroups = useMemo(() => getTreeGroups(rows), [rows])
  treeGroupsRef.current = treeGroups

  const [currentTreeGroupIdx, setCurrentTreeGroupIdx] = useState(0)
  const [currentFruitIdx, setCurrentFruitIdx] = useState(0)
  const [currentField, setCurrentField] = useState<MeasureField>(() => settings.fieldOrder[0] as MeasureField)
  const [lastField, setLastField] = useState<MeasureField>(() => settings.fieldOrder[0] as MeasureField)
  const [listening, setListening] = useState(false)
  const [warnings, setWarnings] = useState<string[]>([])
  const [ttsLog, setTtsLog] = useState<string[]>([])
  const [sessionComplete, setSessionComplete] = useState(false)

  const recognitionRef = useRef<ISpeechRecognition | null>(null)
  const fieldRef = useRef<MeasureField>(settings.fieldOrder[0] as MeasureField)
  const lastFieldRef = useRef<MeasureField>(settings.fieldOrder[0] as MeasureField)
  const lastFruitIdxRef = useRef(0)
  const treeGroupIdxRef = useRef(0)
  const fruitIdxRef = useRef(0)
  const listeningRef = useRef(false)
  const stopRequestedRef = useRef(false)
  const isSpeakingRef = useRef(false)
  const isProcessingRef = useRef(false)
  const consecutiveErrorsRef = useRef(0)
  const startTimeRef = useRef(0)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const sessionCompleteRef = useRef(false)
  const settingsRef = useRef(settings)
  const allRowsRef = useRef(allRows)

  useEffect(() => { settingsRef.current = settings }, [settings])
  useEffect(() => { allRowsRef.current = allRows }, [allRows])

  function speakAndLog(text: string): Promise<void> {
    setTtsLog(prev => [...prev, text])
    return speakAsync(text)
  }

  function computeWarnings(field: MeasureField, value: string, prev: SurveyRow | null): string[] {
    const warns: string[] = []
    const num = parseFloat(value)
    if (!isNaN(num)) {
      const range = settingsRef.current.normalRanges[field]
      if (num < range.min || num > range.max) {
        warns.push(`${field} 범위 외 (${range.min}~${range.max})`)
      }
      if (prev) {
        const prevVal = parseFloat(prev[field])
        if (!isNaN(prevVal)) {
          const diff = Math.abs(num - prevVal)
          if (diff >= settingsRef.current.changeThresholds[field]) {
            warns.push(`${field} 변화 큼 (+${diff.toFixed(1)})`)
          }
        }
      }
    }
    return warns
  }

  async function applyAndLog(
    row: SurveyRow,
    field: MeasureField,
    value: number,
    recognizedText: string,
    correctionType: LogEntry['correctionType'],
    audioClipFileName: string,
    latencyMs: number,
  ): Promise<string[]> {
    const prev = findPreviousRow(row, allRowsRef.current)
    const warns = computeWarnings(field, String(value), prev)
    setWarnings(warns)
    await onUpdateRow({ ...row, [field]: String(value) })
    void addLog({
      fieldName: field,
      surveyDate: row.surveyDate,
      rowKey: row.rowId,
      recognizedText,
      normalizedValue: String(value),
      finalValue: String(value),
      inputMode: 'voice',
      correctionType,
      audioClipFileName,
      latencyMs,
      errorType: warns.some(w => w.includes('범위')) ? 'range_warning' : 'none',
    })
    return warns
  }

  async function applyValueManual(row: SurveyRow, field: MeasureField, value: string) {
    if (value === '') {
      await onUpdateRow({ ...row, [field]: value })
      setWarnings([])
      return
    }
    const prev = findPreviousRow(row, allRowsRef.current)
    const warns = computeWarnings(field, value, prev)
    setWarnings(warns)
    await onUpdateRow({ ...row, [field]: value })
    void addLog({
      fieldName: field,
      surveyDate: row.surveyDate,
      rowKey: row.rowId,
      finalValue: value,
      normalizedValue: value,
      inputMode: 'manual',
      correctionType: 'manual',
      errorType: warns.some(w => w.includes('범위')) ? 'range_warning' : 'none',
    })
  }

  async function saveCurrentChunkAsClip(rowKey: string, fieldName: string): Promise<string> {
    const recorder = mediaRecorderRef.current
    if (!settingsRef.current.logEnabled || !settingsRef.current.audioClipEnabled || !recorder) return ''
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

  function stopMediaRecorder() {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') recorder.stop()
    mediaRecorderRef.current = null
    const stream = mediaStreamRef.current
    if (stream) { stream.getTracks().forEach(t => t.stop()); mediaStreamRef.current = null }
    audioChunksRef.current = []
  }

  function resetTreeCursor() {
    const f = settingsRef.current.fieldOrder[0] as MeasureField
    setCurrentFruitIdx(0); fruitIdxRef.current = 0
    setCurrentField(f); fieldRef.current = f
    setLastField(f); lastFieldRef.current = f
    lastFruitIdxRef.current = 0
    setWarnings([])
  }

  function moveToNextTree() {
    if (treeGroupIdxRef.current < treeGroupsRef.current.length - 1) {
      const newIdx = treeGroupIdxRef.current + 1
      setCurrentTreeGroupIdx(newIdx); treeGroupIdxRef.current = newIdx
      resetTreeCursor()
      setSessionComplete(false); sessionCompleteRef.current = false
    }
  }

  function moveToPrevTree() {
    if (treeGroupIdxRef.current > 0) {
      const newIdx = treeGroupIdxRef.current - 1
      setCurrentTreeGroupIdx(newIdx); treeGroupIdxRef.current = newIdx
      resetTreeCursor()
      setSessionComplete(false); sessionCompleteRef.current = false
    }
  }

  function focusField(fruitIdx: number, field: MeasureField) {
    setCurrentFruitIdx(fruitIdx); fruitIdxRef.current = fruitIdx
    setCurrentField(field); fieldRef.current = field
    setLastField(field); lastFieldRef.current = field
    lastFruitIdxRef.current = fruitIdx
  }

  type AdvanceResult = 'next_field' | 'next_fruit' | 'complete'

  function advancePosition(group: TreeGroup): AdvanceResult {
    const [first, second] = settingsRef.current.fieldOrder as [MeasureField, MeasureField]
    if (fieldRef.current === first) {
      setCurrentField(second); fieldRef.current = second
      return 'next_field'
    }
    if (fruitIdxRef.current < group.rows.length - 1) {
      const next = fruitIdxRef.current + 1
      setCurrentFruitIdx(next); fruitIdxRef.current = next
      setCurrentField(first); fieldRef.current = first
      setWarnings([])
      return 'next_fruit'
    }
    return 'complete'
  }

  type NextPositionResult = 'moved' | 'no_op' | 'should_complete'

  function moveToNextPosition(group: TreeGroup): NextPositionResult {
    const [first, second] = settingsRef.current.fieldOrder as [MeasureField, MeasureField]
    if (fieldRef.current === first) {
      setCurrentField(second); fieldRef.current = second
      setLastField(second); lastFieldRef.current = second
      return 'moved'
    }
    if (fruitIdxRef.current < group.rows.length - 1) {
      const next = fruitIdxRef.current + 1
      setCurrentFruitIdx(next); fruitIdxRef.current = next
      setCurrentField(first); fieldRef.current = first
      setLastField(first); lastFieldRef.current = first
      setWarnings([])
      return 'moved'
    }
    const freshGroup = treeGroupsRef.current[treeGroupIdxRef.current]
    if (freshGroup && isTreeComplete(freshGroup, settingsRef.current.fieldOrder as MeasureField[])) {
      return 'should_complete'
    }
    return 'no_op'
  }

  function moveToPrevPosition() {
    const [first, second] = settingsRef.current.fieldOrder as [MeasureField, MeasureField]
    if (fieldRef.current === second) {
      setCurrentField(first); fieldRef.current = first
      setLastField(first); lastFieldRef.current = first
    } else if (fruitIdxRef.current > 0) {
      const prev = fruitIdxRef.current - 1
      setCurrentFruitIdx(prev); fruitIdxRef.current = prev
      setCurrentField(second); fieldRef.current = second
      setLastField(second); lastFieldRef.current = second
      setWarnings([])
    }
  }

  function navigatePrev() {
    const group = treeGroupsRef.current[treeGroupIdxRef.current]
    if (!group) return
    const row = group.rows[fruitIdxRef.current]
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
    moveToPrevPosition()
  }

  function navigateNext() {
    const group = treeGroupsRef.current[treeGroupIdxRef.current]
    if (!group) return
    const row = group.rows[fruitIdxRef.current]
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
    moveToNextPosition(group)
  }

  async function completeTreeSession(group: TreeGroup) {
    await speakAndLog(`조사나무 ${group.tree}`)
    await speakAndLog('완료')
    isSpeakingRef.current = false
    listeningRef.current = false
    stopRequestedRef.current = true
    setListening(false)
    setSessionComplete(true); sessionCompleteRef.current = true
    stopMediaRecorder()
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
      const group = treeGroupsRef.current[treeGroupIdxRef.current]
      const row = group?.rows[fruitIdxRef.current]
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
      // During TTS or processing: don't touch listening state; the operation will restart
      if (isSpeakingRef.current || isProcessingRef.current) return
      if (
        !listeningRef.current ||
        stopRequestedRef.current ||
        consecutiveErrorsRef.current >= MAX_ERRORS
      ) {
        setListening(false)
        listeningRef.current = false
        stopMediaRecorder()
      } else {
        startTimeRef.current = Date.now()
        startListeningRecognition()
      }
    }
    recognition.start()
    recognitionRef.current = recognition
  }

  async function startListening() {
    if (sessionCompleteRef.current) {
      if (treeGroupIdxRef.current + 1 < treeGroupsRef.current.length) {
        moveToNextTree()
      } else {
        isSpeakingRef.current = true
        await speakAndLog('모든 조사 완료')
        isSpeakingRef.current = false
        return
      }
    }

    const group = treeGroupsRef.current[treeGroupIdxRef.current]
    if (!group) return

    const pos = findFirstIncompletePosition(group, settingsRef.current.fieldOrder as MeasureField[])
    if (pos === null) {
      isSpeakingRef.current = true
      await speakAndLog(`조사나무 ${group.tree}`)
      await speakAndLog('완료')
      isSpeakingRef.current = false
      setSessionComplete(true); sessionCompleteRef.current = true
      return
    }

    setCurrentFruitIdx(pos.fruitIdx); fruitIdxRef.current = pos.fruitIdx
    setCurrentField(pos.field); fieldRef.current = pos.field
    setLastField(pos.field); lastFieldRef.current = pos.field
    lastFruitIdxRef.current = pos.fruitIdx
    setSessionComplete(false); sessionCompleteRef.current = false
    stopRequestedRef.current = false
    consecutiveErrorsRef.current = 0

    // MediaRecorder: fire-and-forget so getUserMedia never blocks TTS
    // (getUserMedia can hang indefinitely in headless/CI environments)
    if (settingsRef.current.logEnabled && settingsRef.current.audioClipEnabled) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          mediaStreamRef.current = stream
          const recorder = new MediaRecorder(stream)
          mediaRecorderRef.current = recorder
          audioChunksRef.current = []
          recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
          recorder.start(100)
        })
        .catch(() => { /* mic denied or MediaRecorder unsupported */ })
    }

    // TTS runs immediately — ensures tts-log is populated even in headless/E2E mode
    isSpeakingRef.current = true
    await speakAndLog(`조사나무 ${group.tree}`)
    await speakAndLog(`조사과실 ${group.rows[pos.fruitIdx].fruit}`)
    await speakAndLog(pos.field)
    isSpeakingRef.current = false

    const SpeechRec = getSpeechRecognition()
    if (!SpeechRec) {
      // SpeechRecognition unavailable (headless / unsupported browser)
      // In ?e2e=1 mode the debug panel injects voice via handleVoice() directly
      const row = treeGroupsRef.current[treeGroupIdxRef.current]?.rows[fruitIdxRef.current]
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

    listeningRef.current = true
    setListening(true)
    startTimeRef.current = Date.now()
    startListeningRecognition()
  }

  function stopListening() {
    stopRequestedRef.current = true
    listeningRef.current = false
    recognitionRef.current?.stop()
    stopMediaRecorder()
    setListening(false)
  }

  async function handleVoice(transcript: string) {
    isProcessingRef.current = true
    consecutiveErrorsRef.current = 0
    try {
      const cmd = parseVoiceCommand(transcript)
      const group = treeGroupsRef.current[treeGroupIdxRef.current]
      const row = group?.rows[fruitIdxRef.current]
      if (!row) return
      const latencyMs = Date.now() - startTimeRef.current
      startTimeRef.current = Date.now()
      const audioClipFileName = await saveCurrentChunkAsClip(row.rowId, fieldRef.current)

      if (cmd.type === 'number' && cmd.value !== undefined) {
        const inputField = fieldRef.current
        recognitionRef.current?.stop()
        isSpeakingRef.current = true

        const warns = await applyAndLog(row, inputField, cmd.value, transcript, 'normal', audioClipFileName, latencyMs)
        setLastField(inputField); lastFieldRef.current = inputField
        lastFruitIdxRef.current = fruitIdxRef.current

        if (warns.length > 0) await speakAndLog('경고')
        await speakAndLog(`${inputField} ${cmd.value}`)

        const advance = advancePosition(group)

        if (advance === 'complete') {
          await completeTreeSession(group)
        } else if (advance === 'next_fruit') {
          const nextFruitRow = treeGroupsRef.current[treeGroupIdxRef.current]?.rows[fruitIdxRef.current]
          if (nextFruitRow) await speakAndLog(`조사과실 ${nextFruitRow.fruit}`)
          await speakAndLog(fieldRef.current)
          isSpeakingRef.current = false
          if (listeningRef.current && !stopRequestedRef.current) startListeningRecognition()
        } else {
          await speakAndLog(fieldRef.current)
          isSpeakingRef.current = false
          if (listeningRef.current && !stopRequestedRef.current) startListeningRecognition()
        }

      } else if (cmd.type === '수정' && cmd.value !== undefined) {
        const lastRow = group?.rows[lastFruitIdxRef.current]
        if (!lastRow) return
        recognitionRef.current?.stop()
        isSpeakingRef.current = true
        await applyAndLog(lastRow, lastFieldRef.current, cmd.value, transcript, '수정', audioClipFileName, latencyMs)
        await speakAndLog(`${lastFieldRef.current} ${cmd.value}`)
        await speakAndLog(fieldRef.current)
        isSpeakingRef.current = false
        if (listeningRef.current && !stopRequestedRef.current) startListeningRecognition()

      } else if (cmd.type === '이전') {
        recognitionRef.current?.stop()
        isSpeakingRef.current = true
        moveToPrevPosition()
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
        await speakAndLog(fieldRef.current)
        isSpeakingRef.current = false
        if (listeningRef.current && !stopRequestedRef.current) startListeningRecognition()

      } else if (cmd.type === '다음') {
        recognitionRef.current?.stop()
        isSpeakingRef.current = true
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
        const nextResult = moveToNextPosition(group)
        if (nextResult === 'should_complete') {
          await completeTreeSession(group)
        } else {
          await speakAndLog(fieldRef.current)
          isSpeakingRef.current = false
          if (listeningRef.current && !stopRequestedRef.current) startListeningRecognition()
        }
      }
    } finally {
      isProcessingRef.current = false
    }
  }

  return {
    treeGroups,
    currentTreeGroupIdx,
    currentFruitIdx,
    currentField,
    lastField,
    listening,
    warnings,
    ttsLog,
    sessionComplete,
    startListening,
    stopListening,
    handleVoice,
    movePrevTree: moveToPrevTree,
    moveNextTree: moveToNextTree,
    navigatePrev,
    navigateNext,
    applyValueManual,
    focusField,
  }
}
