import { useMemo } from 'react'
import type { DeviceInfo } from '../types'
import { getDeviceInfo } from '../utils/deviceInfo'

interface Props {
  onBack: () => void
}

export function DiagPage({ onBack }: Props) {
  const info: DeviceInfo = useMemo(() => getDeviceInfo(), [])

  const rows: [string, string][] = [
    ['SpeechRecognition', info.speechRecognitionSupported ? '지원' : '미지원'],
    ['SpeechSynthesis', info.speechSynthesisSupported ? '지원' : '미지원'],
    ['MediaRecorder', info.mediaRecorderSupported ? '지원' : '미지원'],
    ['IndexedDB', info.indexedDBSupported ? '지원' : '미지원'],
    ['Service Worker', info.serviceWorkerSupported ? '지원' : '미지원'],
    ['온라인 상태', navigator.onLine ? '온라인' : '오프라인'],
    ['브라우저', `${info.browserName} ${info.browserVersion}`],
    ['OS', `${info.osName} ${info.osVersion}`],
    ['화면 크기', info.screenSize],
    ['userAgent', info.userAgent],
  ]

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif' }} data-testid="diag-page">
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <button onClick={onBack} style={{ padding: '6px 14px', fontSize: 14 }}>← 뒤로</button>
        <h2 style={{ margin: 0 }}>브라우저 진단</h2>
      </div>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 14 }}>
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <td style={{ border: '1px solid #e2e8f0', padding: '4px 8px', fontWeight: 600, whiteSpace: 'nowrap' }}>{k}</td>
              <td style={{
                border: '1px solid #e2e8f0', padding: '4px 8px',
                color: v === '미지원' ? '#dc2626' : v === '지원' || v === '온라인' ? '#16a34a' : '#111',
                wordBreak: 'break-all',
              }}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
