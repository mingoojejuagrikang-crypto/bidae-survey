import type { SurveyRow } from '../types'
import { toBusinessRow } from './rowGenerator'

export async function uploadToAppsScript(
  url: string,
  rows: SurveyRow[],
): Promise<{ success: boolean; error?: string }> {
  try {
    const data = rows.map(toBusinessRow)
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: data }),
    })
    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}` }
    }
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export function buildUploadPayload(rows: SurveyRow[]): Record<string, string>[] {
  return rows.map(toBusinessRow)
}
