import { useState } from 'react'
import type { AppSettings } from '../types'
import { calcBaseDate } from '../utils/baseDate'

interface Props {
  settings: AppSettings
  onGenerate: (forceRecreate?: boolean) => Promise<{ existed: boolean; warning?: string }>
  onBack: () => void
}

export function GeneratePage({ settings, onGenerate, onBack }: Props) {
  const [status, setStatus] = useState<'idle' | 'generated' | 'existed' | 'confirm'>('idle')
  const [warning, setWarning] = useState('')
  const rowCount = settings.farmerLabels.length * settings.treatments.length * settings.trees.length * settings.fruits.length
  const baseDate = calcBaseDate(settings.surveyDate)

  async function handleGenerate(force = false) {
    const result = await onGenerate(force)
    if (result.existed && !force) {
      setStatus('existed')
    } else if (result.warning === 'existing_values') {
      setWarning('입력값이 있는 행이 존재합니다. 계속하면 기존 값이 삭제됩니다.')
      setStatus('confirm')
    } else {
      setStatus('generated')
    }
  }

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif', maxWidth: 480 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <button onClick={onBack} style={{ padding: '6px 14px', fontSize: 14 }}>← 뒤로</button>
        <h2 style={{ margin: 0 }}>조사 행 생성</h2>
      </div>

      <div style={{ background: '#f1f5f9', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
        <div>조사일자: {settings.surveyDate}</div>
        <div>기준일자: {baseDate}</div>
        <div>농가 수: {settings.farmerLabels.length}</div>
        <div>처리: {settings.treatments.join(', ')}</div>
        <div>나무: {settings.trees.join(', ')}</div>
        <div>과실: {settings.fruits.join(', ')}</div>
        <div style={{ fontWeight: 700, marginTop: 8 }}>생성 예정 행 수: {rowCount}</div>
      </div>

      {status === 'idle' && (
        <button onClick={() => handleGenerate(false)}
          style={{ padding: '12px 24px', fontSize: 16, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8 }}>
          조사 행 생성
        </button>
      )}

      {status === 'generated' && (
        <div>
          <p style={{ color: '#16a34a', fontWeight: 600 }}>✓ {rowCount}행 생성 완료</p>
          <button onClick={onBack} style={{ padding: '10px 20px', fontSize: 14 }}>입력 화면으로</button>
        </div>
      )}

      {status === 'existed' && (
        <div>
          <p style={{ color: '#b45309' }}>이미 {settings.surveyDate} 조사 행이 존재합니다.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onBack} style={{ padding: '10px 20px', fontSize: 14 }}>기존 행 유지</button>
            <button onClick={() => handleGenerate(true)}
              style={{ padding: '10px 20px', fontSize: 14, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6 }}>
              다시 생성
            </button>
          </div>
        </div>
      )}

      {status === 'confirm' && (
        <div>
          <p style={{ color: '#dc2626' }}>{warning}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setStatus('idle')} style={{ padding: '10px 20px', fontSize: 14 }}>취소</button>
            <button onClick={async () => {
              await onGenerate(true)
              setStatus('generated')
            }}
              style={{ padding: '10px 20px', fontSize: 14, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6 }}>
              확인 후 재생성
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
