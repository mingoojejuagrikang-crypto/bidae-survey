import type { SurveyRow } from '../types'

export function findPreviousRow(
  currentRow: SurveyRow,
  allRows: SurveyRow[],
): SurveyRow | null {
  const candidates = allRows.filter(r =>
    r.label === currentRow.label &&
    r.farmerName === currentRow.farmerName &&
    r.treatment === currentRow.treatment &&
    r.tree === currentRow.tree &&
    r.fruit === currentRow.fruit &&
    r.surveyDate < currentRow.surveyDate,
  )

  if (candidates.length === 0) return null

  candidates.sort((a, b) => b.surveyDate.localeCompare(a.surveyDate))
  return candidates[0]
}
