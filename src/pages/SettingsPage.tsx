import { useState } from 'react'
import type { AppSettings, FarmerLabel } from '../types'

interface Props {
  settings: AppSettings
  onSave: (s: AppSettings) => void
}

export function SettingsPage({ settings, onSave }: Props) {
  const [local, setLocal] = useState<AppSettings>({ ...settings })

  function updateFarmer(i: number, field: keyof FarmerLabel, value: string) {
    const fl = [...local.farmerLabels]
    fl[i] = { ...fl[i], [field]: value }
    setLocal({ ...local, farmerLabels: fl })
  }

  function addFarmer() {
    setLocal({ ...local, farmerLabels: [...local.farmerLabels, { label: '', name: '' }] })
  }

  function removeFarmer(i: number) {
    const fl = [...local.farmerLabels]
    fl.splice(i, 1)
    setLocal({ ...local, farmerLabels: fl })
  }

  function handleListField(field: 'treatments' | 'trees' | 'fruits', value: string) {
    setLocal({ ...local, [field]: value.split(',').map(v => v.trim()).filter(Boolean) })
  }

  return (
    <div style={{ padding: 16, maxWidth: 600 }}>
      <h2>설정</h2>

      <section>
        <h3>조사일자</h3>
        <input
          type="date"
          value={local.surveyDate}
          onChange={e => setLocal({ ...local, surveyDate: e.target.value })}
          style={{ fontSize: 16, padding: '4px 8px' }}
        />
      </section>

      <section style={{ marginTop: 16 }}>
        <h3>농가/라벨</h3>
        {local.farmerLabels.map((fl, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
            <input
              placeholder="라벨"
              value={fl.label}
              onChange={e => updateFarmer(i, 'label', e.target.value)}
              style={{ width: 60, fontSize: 14, padding: 4 }}
            />
            <input
              placeholder="농가명"
              value={fl.name}
              onChange={e => updateFarmer(i, 'name', e.target.value)}
              style={{ width: 120, fontSize: 14, padding: 4 }}
            />
            <button onClick={() => removeFarmer(i)} style={{ fontSize: 13 }}>삭제</button>
          </div>
        ))}
        <button onClick={addFarmer} style={{ fontSize: 13, marginTop: 4 }}>농가 추가</button>
      </section>

      <section style={{ marginTop: 16 }}>
        <h3>처리 (쉼표 구분)</h3>
        <input
          value={local.treatments.join(', ')}
          onChange={e => handleListField('treatments', e.target.value)}
          style={{ width: '100%', fontSize: 14, padding: 4 }}
        />
      </section>

      <section style={{ marginTop: 16 }}>
        <h3>조사나무 번호 (쉼표 구분)</h3>
        <input
          value={local.trees.join(', ')}
          onChange={e => handleListField('trees', e.target.value)}
          style={{ width: '100%', fontSize: 14, padding: 4 }}
        />
      </section>

      <section style={{ marginTop: 16 }}>
        <h3>조사과실 번호 (쉼표 구분)</h3>
        <input
          value={local.fruits.join(', ')}
          onChange={e => handleListField('fruits', e.target.value)}
          style={{ width: '100%', fontSize: 14, padding: 4 }}
        />
      </section>

      <section style={{ marginTop: 16 }}>
        <h3>정상 범위</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <label>횡경 최솟값
            <input type="number" value={local.normalRanges.횡경.min}
              onChange={e => setLocal({ ...local, normalRanges: { ...local.normalRanges, 횡경: { ...local.normalRanges.횡경, min: +e.target.value } } })}
              style={{ width: 70, marginLeft: 8 }} />
          </label>
          <label>횡경 최댓값
            <input type="number" value={local.normalRanges.횡경.max}
              onChange={e => setLocal({ ...local, normalRanges: { ...local.normalRanges, 횡경: { ...local.normalRanges.횡경, max: +e.target.value } } })}
              style={{ width: 70, marginLeft: 8 }} />
          </label>
          <label>종경 최솟값
            <input type="number" value={local.normalRanges.종경.min}
              onChange={e => setLocal({ ...local, normalRanges: { ...local.normalRanges, 종경: { ...local.normalRanges.종경, min: +e.target.value } } })}
              style={{ width: 70, marginLeft: 8 }} />
          </label>
          <label>종경 최댓값
            <input type="number" value={local.normalRanges.종경.max}
              onChange={e => setLocal({ ...local, normalRanges: { ...local.normalRanges, 종경: { ...local.normalRanges.종경, max: +e.target.value } } })}
              style={{ width: 70, marginLeft: 8 }} />
          </label>
        </div>
      </section>

      <section style={{ marginTop: 16 }}>
        <h3>이상치 경고 기준 (이전값 대비 변화)</h3>
        <div style={{ display: 'flex', gap: 16 }}>
          <label>횡경 ±
            <input type="number" value={local.changeThresholds.횡경}
              onChange={e => setLocal({ ...local, changeThresholds: { ...local.changeThresholds, 횡경: +e.target.value } })}
              style={{ width: 60, marginLeft: 8 }} />
          </label>
          <label>종경 ±
            <input type="number" value={local.changeThresholds.종경}
              onChange={e => setLocal({ ...local, changeThresholds: { ...local.changeThresholds, 종경: +e.target.value } })}
              style={{ width: 60, marginLeft: 8 }} />
          </label>
        </div>
      </section>

      <section style={{ marginTop: 16 }}>
        <h3>Google Apps Script URL</h3>
        <p style={{ fontSize: 13, color: '#666', margin: '4px 0' }}>
          업로드는 자동 동기화가 아닙니다. 확인 후 업로드 버튼을 눌러야 전송됩니다.
        </p>
        <input
          type="url"
          placeholder="https://script.google.com/macros/s/..."
          value={local.appsScriptUrl}
          onChange={e => setLocal({ ...local, appsScriptUrl: e.target.value })}
          style={{ width: '100%', fontSize: 13, padding: 4 }}
        />
      </section>

      <section style={{ marginTop: 16 }}>
        <h3>로그 수집</h3>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={local.logEnabled}
            onChange={e => setLocal({ ...local, logEnabled: e.target.checked })} />
          로그 수집 켜기
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <input type="checkbox" checked={local.audioClipEnabled}
            onChange={e => setLocal({ ...local, audioClipEnabled: e.target.checked })} />
          음성클립 저장 켜기
        </label>
      </section>

      <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
        <button
          onClick={() => onSave(local)}
          style={{
            padding: '10px 24px', fontSize: 16, background: '#2563eb',
            color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer',
          }}
        >
          저장
        </button>
      </div>
    </div>
  )
}
