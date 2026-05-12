import { useEffect } from 'react'
import { useVoiceSurveyFlow } from '../hooks/useVoiceSurveyFlow'
import { findPreviousRow } from '../utils/previousValue'
import { WarningBadge } from '../components/WarningBadge'
import { setTTSEnabled } from '../utils/tts'
import type { SurveyRow, AppSettings, LogEntry } from '../types'
import type { MeasureField } from '../utils/treeGroup'

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
  const isE2EMode = new URLSearchParams(window.location.search).get('e2e') === '1'

  useEffect(() => {
    if (isE2EMode) setTTSEnabled(false)
  }, [isE2EMode])

  const {
    treeGroups,
    currentTreeGroupIdx,
    currentFruitIdx,
    currentField,
    listening,
    warnings,
    ttsLog,
    sessionComplete,
    startListening,
    stopListening,
    handleVoice,
    movePrevTree,
    moveNextTree,
    navigatePrev,
    navigateNext,
    applyValueManual,
    focusField,
  } = useVoiceSurveyFlow({ rows, allRows, settings, onUpdateRow, addLog })

  if (rows.length === 0) {
    return (
      <div style={{ padding: 16 }}>
        <p>조사 행이 없습니다. 설정에서 행을 생성해 주세요.</p>
        <button onClick={() => onNavigate('generate')}>행 생성으로</button>
      </div>
    )
  }

  const currentGroup = treeGroups[currentTreeGroupIdx]
  if (!currentGroup) return null

  const totalTrees = treeGroups.length
  const currentFruitRow = currentGroup.rows[currentFruitIdx]
  const orderedFields = settings.fieldOrder as [MeasureField, MeasureField]

  function getPrevRow(row: SurveyRow): SurveyRow | null {
    return findPreviousRow(row, allRows)
  }

  return (
    <div style={{ padding: 12, fontFamily: 'sans-serif', maxWidth: 520 }}>
      {/* Header */}
      <div style={{ background: '#f1f5f9', padding: '8px 12px', borderRadius: 8, marginBottom: 10, fontSize: 13 }}>
        <div>{currentGroup.rows[0]?.surveyDate} / 기준 {currentGroup.rows[0]?.baseDate}</div>
        <div>{currentGroup.label} {currentGroup.farmerName} / {currentGroup.treatment}</div>
        <div style={{ fontWeight: 700, fontSize: 16 }} data-testid="current-tree-label">
          조사나무 {currentGroup.tree}
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            나무 {currentTreeGroupIdx + 1} / {totalTrees}
          </span>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            현재: <strong>{currentField}</strong>
          </span>
          {currentFruitRow && (
            <span data-testid="current-position-display" style={{ fontSize: 12, color: '#64748b' }}>
              과실 {currentFruitRow.fruit} / {currentGroup.rows.length}
            </span>
          )}
        </div>
      </div>

      {warnings.map((w, i) => <WarningBadge key={i} message={w} />)}

      {/* Completion banner */}
      {sessionComplete && (
        <div
          data-testid="session-complete-banner"
          style={{
            background: '#dcfce7', border: '2px solid #16a34a', borderRadius: 10,
            padding: '12px 16px', marginBottom: 10, textAlign: 'center',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 16 }}>조사나무 {currentGroup.tree} 완료 ✓</div>
          {currentTreeGroupIdx + 1 < totalTrees && (
            <div data-testid="next-tree-info" style={{ marginTop: 6, fontSize: 14, color: '#15803d' }}>
              다음: 조사나무 {treeGroups[currentTreeGroupIdx + 1].tree}
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                음성 시작 버튼을 누르면 다음 조사나무부터 시작합니다
              </div>
            </div>
          )}
          {currentTreeGroupIdx + 1 >= totalTrees && (
            <div data-testid="next-tree-info" style={{ marginTop: 6, fontSize: 14, color: '#15803d' }}>
              모든 조사나무 완료
            </div>
          )}
        </div>
      )}

      {/* Fruit measurement table */}
      <div style={{ overflowX: 'auto', marginBottom: 10 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#e2e8f0' }}>
              <th style={{ padding: '4px 6px', border: '1px solid #cbd5e1' }}>과실</th>
              {orderedFields.map(f => (
                <>
                  <th key={f} style={{ padding: '4px 6px', border: '1px solid #cbd5e1' }}>{f}</th>
                  <th key={`prev-${f}`} style={{ padding: '4px 6px', border: '1px solid #cbd5e1', color: '#64748b', fontSize: 11 }}>
                    이전{f}
                  </th>
                </>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentGroup.rows.map((row, fruitIdx) => {
              const prevRow = getPrevRow(row)
              const isCurrentFruit = fruitIdx === currentFruitIdx
              return (
                <tr
                  key={row.rowId}
                  data-testid={`fruit-row-${row.fruit}`}
                  style={{ background: isCurrentFruit ? '#eff6ff' : 'transparent' }}
                >
                  <td style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: isCurrentFruit ? 700 : 400 }}>
                    {row.fruit}
                  </td>
                  {orderedFields.map(field => (
                    <>
                      <td
                        key={field}
                        style={{
                          padding: '2px 4px', border: '1px solid #cbd5e1',
                          background: isCurrentFruit && currentField === field ? '#dbeafe' : 'transparent',
                        }}
                      >
                        <input
                          type="number"
                          step="0.1"
                          value={row[field]}
                          data-testid={`input-${field}-${row.fruit}`}
                          onFocus={() => focusField(fruitIdx, field)}
                          onChange={async e => {
                            await applyValueManual(row, field, e.target.value)
                          }}
                          onBlur={async e => {
                            if (e.target.value !== '') {
                              await applyValueManual(row, field, e.target.value)
                            }
                          }}
                          style={{ width: 60, fontSize: 13, padding: '2px 4px', border: 'none', background: 'transparent' }}
                        />
                      </td>
                      <td
                        key={`prev-${field}`}
                        data-testid={`prev-${field}-${row.fruit}`}
                        style={{ padding: '4px 6px', border: '1px solid #cbd5e1', color: '#64748b', textAlign: 'center' }}
                      >
                        {prevRow?.[field] || '-'}
                      </td>
                    </>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 비고 for current fruit */}
      {currentFruitRow && (
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 13 }}>비고 (과실 {currentFruitRow.fruit}):
            <input
              type="text"
              value={currentFruitRow.비고}
              onChange={async e => {
                await onUpdateRow({ ...currentFruitRow, 비고: e.target.value })
              }}
              style={{ marginLeft: 8, width: '70%', fontSize: 13 }}
              data-testid="input-비고"
            />
          </label>
        </div>
      )}

      {/* Voice buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <button
          onClick={() => void startListening()}
          disabled={listening}
          style={{ padding: 12, fontSize: 15, background: listening ? '#94a3b8' : '#16a34a', color: '#fff', border: 'none', borderRadius: 8 }}
        >
          {listening ? '인식 중...' : '음성 시작'}
        </button>
        <button
          onClick={stopListening}
          disabled={!listening}
          style={{ padding: 12, fontSize: 15, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8 }}
        >
          음성 종료
        </button>
      </div>

      {/* Tree navigation */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <button
          onClick={movePrevTree}
          disabled={currentTreeGroupIdx === 0}
          style={{ padding: 10, fontSize: 14, background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8 }}
        >
          이전 나무
        </button>
        <button
          onClick={moveNextTree}
          disabled={currentTreeGroupIdx >= totalTrees - 1}
          style={{ padding: 10, fontSize: 14, background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8 }}
        >
          다음 나무
        </button>
      </div>

      {/* Fruit/field navigation */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <button
          onClick={navigatePrev}
          style={{ padding: 10, fontSize: 14, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8 }}
        >
          이전
        </button>
        <button
          onClick={navigateNext}
          style={{ padding: 10, fontSize: 14, background: '#0891b2', color: '#fff', border: 'none', borderRadius: 8 }}
        >
          다음
        </button>
      </div>

      {/* Utility buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        <button onClick={() => onNavigate('review')}
          style={{ padding: 10, fontSize: 12, background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6 }}>
          데이터 확인
        </button>
        <button onClick={onUpload} data-testid="upload-button"
          style={{ padding: 10, fontSize: 12, background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6 }}>
          업로드
        </button>
        <button onClick={onDownloadCSV} data-testid="csv-download-button"
          style={{ padding: 10, fontSize: 12, background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6 }}>
          CSV 다운
        </button>
        <button onClick={onDownloadZip} data-testid="log-zip-download-button"
          style={{ padding: 10, fontSize: 12, background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6 }}>
          로그 ZIP
        </button>
        <button onClick={() => onNavigate('settings')}
          style={{ padding: 10, fontSize: 12, background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6 }}>
          설정
        </button>
        <button onClick={() => onNavigate('diag')}
          style={{ padding: 10, fontSize: 12, background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6 }}>
          진단
        </button>
      </div>

      {/* TTS log (always in DOM for E2E) */}
      <span data-testid="tts-log" style={{ display: 'none' }}>{ttsLog.join('|')}</span>

      {/* Debug panel — only with ?e2e=1 */}
      {isE2EMode && (
        <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <input data-testid="debug-voice-transcript" type="text" />
          <button
            data-testid="debug-voice-submit"
            onClick={() => {
              const el = document.querySelector<HTMLInputElement>('[data-testid="debug-voice-transcript"]')
              if (el?.value) void handleVoice(el.value)
            }}
          >s</button>
        </div>
      )}
    </div>
  )
}
