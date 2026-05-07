export function calcBaseDate(surveyDate: string): string {
  const [year, month, day] = surveyDate.split('-').map(Number)
  const baseDay = day <= 15 ? 1 : 16
  return `${year}-${String(month).padStart(2, '0')}-${String(baseDay).padStart(2, '0')}`
}
