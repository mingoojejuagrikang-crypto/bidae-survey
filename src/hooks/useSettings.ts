import { useState, useEffect } from 'react'
import { db } from '../db'
import { DEFAULT_SETTINGS } from '../types'
import type { AppSettings } from '../types'

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    db.settings.get(1).then(rec => {
      if (rec) setSettings(rec.data)
      setLoaded(true)
    })
  }, [])

  async function saveSettings(s: AppSettings) {
    await db.settings.put({ id: 1, data: s })
    setSettings(s)
  }

  return { settings, saveSettings, loaded }
}
