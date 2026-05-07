import { useState } from 'react'
import type { SurveyRow } from '../types'

interface Props {
  rows: SurveyRow[]
  onBack: () => void
}

type Filter = 'all' | 'incomplete' | 'pending_upload' | 'uploaded'

export function ReviewPage({ rows, onBack }: Props) {
  const [filter, setFilter] = useState<Filter>('all')

  const getRows = (f: Filter) => {
    switch (f) {
      case 'incomplete': return rows.filter(r => r.횡경 === '' || r.종경 === '')
      case 'pending_upload': return rows.filter(r => r.uploadStatus === 'pending')
      case 'uploaded': return rows.filter(r => r.uploadStatus === 'uploaded')
      default: return rows
    }
  }

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <button onClick={onBack} style={{ padding: '6px 14px', fontSize: 14 }}>← 뒤로</button>
        <h2 style={{ margin: 0 }}>데이터 확인</h2>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {(['all', 'incomplete', 'pending_upload', 'uploaded'] as Filter[]).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              padding: '4px 10px', fontSize: 13, borderRadius: 4,
              border: '1px solid #cbd5e1',
              background: filter === f ? '#2563eb' : '#fff',
              color: filter === f ? '#fff' : '#111',
            }}>
            {f === 'all' ? '전체' : f === 'incomplete' ? '미완료' : f === 'pending_upload' ? '업로드 전' : '업로드 완료'}
          </button>
        ))}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%' }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              {['조사일자', '기준일자', '농가명', '라벨', '처리', '나무', '과실', '횡경', '종경', '비고', '상태'].map(h => (
                <th key={h} style={{ border: '1px solid #e2e8f0', padding: '4px 8px', textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {getRows(filter).map(r => (
              <tr key={r.rowId} style={{ background: r.uploadStatus === 'uploaded' ? '#f0fdf4' : 'transparent' }}>
                <td style={tdStyle}>{r.surveyDate}</td>
                <td style={tdStyle}>{r.baseDate}</td>
                <td style={tdStyle}>{r.farmerName}</td>
                <td style={tdStyle}>{r.label}</td>
                <td style={tdStyle}>{r.treatment}</td>
                <td style={tdStyle}>{r.tree}</td>
                <td style={tdStyle}>{r.fruit}</td>
                <td style={tdStyle}>{r.횡경}</td>
                <td style={tdStyle}>{r.종경}</td>
                <td style={tdStyle}>{r.비고}</td>
                <td style={tdStyle}>
                  <span style={{ fontSize: 12, color: r.uploadStatus === 'uploaded' ? '#16a34a' : '#64748b' }}>
                    {r.uploadStatus === 'uploaded' ? '업로드 완료' : r.횡경 === '' || r.종경 === '' ? '미완료' : '업로드 전'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {getRows(filter).length === 0 && <p style={{ textAlign: 'center', color: '#64748b' }}>데이터 없음</p>}
      </div>
    </div>
  )
}

const tdStyle: React.CSSProperties = { border: '1px solid #e2e8f0', padding: '3px 6px' }
