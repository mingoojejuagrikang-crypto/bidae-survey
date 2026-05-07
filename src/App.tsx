import { useState, useEffect, useCallback } from 'react'
import { APP_VERSION } from './types'
import { useSettings } from './hooks/useSettings'
import { useSurveyRows } from './hooks/useSurveyRows'
import { useLogs } from './hooks/useLogs'
import { SettingsPage } from './pages/SettingsPage'
import { InputPage } from './pages/InputPage'
import { ReviewPage } from './pages/ReviewPage'
import { DiagPage } from './pages/DiagPage'
import { GeneratePage } from './pages/GeneratePage'
import { downloadCSV } from './utils/csvExport'
import { createLogZip, downloadZip } from './utils/logZip'
import { uploadToAppsScript } from './utils/upload'
import { getDeviceInfo } from './utils/deviceInfo'
import { db } from './db'
import type { SurveyRow } from './types'

type Page = 'home' | 'settings' | 'generate' | 'input' | 'review' | 'diag'

function btnStyle(bg: string): React.CSSProperties {
  return {
    padding: '14px 16px', fontSize: 16, background: bg, color: '#fff',
    border: 'none', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
  }
}

function NavBar({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ background: '#2563eb', color: '#fff', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 16, cursor: 'pointer' }}>←</button>
      <span style={{ fontSize: 15, fontWeight: 600 }}>감귤 비대조사 음성입력</span>
    </div>
  )
}

function useSurveyRowsWithAll(surveyDate: string) {
  const hook = useSurveyRows(surveyDate)
  const [allRows, setAllRows] = useState<SurveyRow[]>([])

  const reloadAll = useCallback(() => {
    db.surveyRows.toArray().then(all => setAllRows(all))
  }, [])

  useEffect(reloadAll, [reloadAll])
  // Re-sync allRows when current surveyDate rows change
  useEffect(reloadAll, [hook.rows, reloadAll])

  return { ...hook, allRows }
}

export function App() {
  const { settings, saveSettings, loaded } = useSettings()
  const { rows, createRows, updateRow, allRows } = useSurveyRowsWithAll(settings.surveyDate)
  const { getLogs, clearLogs } = useLogs(settings)
  const [page, setPage] = useState<Page>('home')
  const [uploadMsg, setUploadMsg] = useState('')

  if (!loaded) return <div style={{ padding: 16 }}>로딩 중...</div>

  async function handleDownloadCSV() {
    downloadCSV(rows, settings.surveyDate)
  }

  async function handleDownloadZip() {
    const logs = await getLogs(settings.surveyDate)
    const clips = await db.audioClips.toArray()
    const devInfo = getDeviceInfo()
    const blob = await createLogZip(logs, clips, devInfo, settings.surveyDate, settings.audioClipEnabled)
    downloadZip(blob, settings.surveyDate)
  }

  async function handleUpload() {
    if (!settings.appsScriptUrl) {
      setUploadMsg('설정에서 Apps Script URL을 입력해 주세요.')
      return
    }
    const pending = rows.filter(r => r.uploadStatus !== 'uploaded')
    if (pending.length === 0) {
      setUploadMsg('업로드할 데이터가 없습니다.')
      return
    }
    setUploadMsg('업로드 중...')
    const result = await uploadToAppsScript(settings.appsScriptUrl, pending)
    if (result.success) {
      for (const r of pending) {
        await updateRow({ ...r, uploadStatus: 'uploaded' })
      }
      setUploadMsg(`✓ ${pending.length}행 업로드 완료`)
    } else {
      setUploadMsg(`업로드 실패: ${result.error}`)
    }
  }

  if (page === 'settings') {
    return (
      <>
        <NavBar onBack={() => setPage('home')} />
        <SettingsPage settings={settings} onSave={async s => { await saveSettings(s); setPage('home') }} />
      </>
    )
  }

  if (page === 'generate') {
    return (
      <>
        <NavBar onBack={() => setPage('home')} />
        <GeneratePage
          settings={settings}
          onGenerate={async (force) => createRows(settings, force)}
          onBack={() => setPage('input')}
        />
      </>
    )
  }

  if (page === 'review') {
    return <ReviewPage rows={rows} onBack={() => setPage('input')} />
  }

  if (page === 'diag') {
    return <DiagPage onBack={() => setPage('input')} />
  }

  if (page === 'input') {
    return (
      <InputPage
        rows={rows}
        allRows={allRows}
        settings={settings}
        onUpdateRow={updateRow}
        onNavigate={p => setPage(p as Page)}
        onDownloadCSV={handleDownloadCSV}
        onDownloadZip={handleDownloadZip}
        onUpload={handleUpload}
      />
    )
  }

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif', maxWidth: 480 }} data-testid="home-page">
      <h1 style={{ fontSize: 20, fontWeight: 700 }}>감귤 비대조사 음성입력</h1>
      <p style={{ fontSize: 13, color: '#64748b' }}>{APP_VERSION}</p>

      {uploadMsg && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', padding: 10, borderRadius: 6, marginBottom: 12, fontSize: 14 }}>
          {uploadMsg}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
        <button onClick={() => setPage('input')} data-testid="btn-input"
          style={btnStyle('#2563eb')}>
          조사 입력
        </button>
        <button onClick={() => setPage('generate')} data-testid="btn-generate"
          style={btnStyle('#0891b2')}>
          조사 행 생성
        </button>
        <button onClick={() => setPage('review')} data-testid="btn-review"
          style={btnStyle('#6366f1')}>
          데이터 확인
        </button>
        <button onClick={() => setPage('settings')} data-testid="btn-settings"
          style={btnStyle('#64748b')}>
          설정
        </button>
        <button onClick={() => setPage('diag')} data-testid="btn-diag"
          style={btnStyle('#78716c')}>
          브라우저 진단
        </button>
        <button onClick={handleDownloadCSV} data-testid="btn-csv"
          style={btnStyle('#15803d')}>
          CSV 다운로드
        </button>
        <button onClick={handleDownloadZip} data-testid="btn-zip"
          style={btnStyle('#b45309')}>
          로그 ZIP 다운로드
        </button>
        <button onClick={handleUpload} data-testid="btn-upload"
          style={btnStyle('#7c3aed')}>
          업로드
        </button>
      </div>

      <div style={{ marginTop: 24, fontSize: 13, color: '#94a3b8' }}>
        조사 행 {rows.length}개 로드됨 / 오늘 {settings.surveyDate}
        <button onClick={clearLogs} style={{ marginLeft: 12, fontSize: 12, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>
          로그 삭제
        </button>
      </div>
    </div>
  )
}

export default App
