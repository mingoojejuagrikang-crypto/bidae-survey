import { useState, useEffect, useCallback } from 'react'
import { db } from '../db'
import type { SurveyRow, AppSettings } from '../types'
import { generateSurveyRows } from '../utils/rowGenerator'

export function useSurveyRows(surveyDate: string) {
  const [rows, setRows] = useState<SurveyRow[]>([])

  const reload = useCallback(() => {
    db.surveyRows
      .where('surveyDate')
      .equals(surveyDate)
      .toArray()
      .then(data => {
        data.sort((a, b) => a.rowId.localeCompare(b.rowId))
        setRows(data)
      })
  }, [surveyDate])

  useEffect(reload, [reload])

  async function createRows(settings: AppSettings, forceRecreate = false): Promise<{
    existed: boolean
    warning?: string
  }> {
    const existing = await db.surveyRows.where('surveyDate').equals(settings.surveyDate).count()

    if (existing > 0 && !forceRecreate) {
      return { existed: true }
    }

    if (existing > 0 && forceRecreate) {
      const hasValues = await db.surveyRows
        .where('surveyDate')
        .equals(settings.surveyDate)
        .filter(r => r.횡경 !== '' || r.종경 !== '')
        .count()
      if (hasValues > 0) {
        return { existed: true, warning: 'existing_values' }
      }
      await db.surveyRows.where('surveyDate').equals(settings.surveyDate).delete()
    }

    const newRows = generateSurveyRows(settings)
    await db.surveyRows.bulkPut(newRows)
    reload()
    return { existed: false }
  }

  async function updateRow(row: SurveyRow): Promise<void> {
    const updated = { ...row, updatedAt: new Date().toISOString(), isDirty: true }
    await db.surveyRows.put(updated)
    setRows(prev => prev.map(r => r.rowId === row.rowId ? updated : r))
  }

  return { rows, reload, createRows, updateRow }
}
