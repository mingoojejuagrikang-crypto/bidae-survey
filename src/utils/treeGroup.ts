import type { SurveyRow } from '../types'

export type MeasureField = '횡경' | '종경'

export interface TreeGroup {
  key: string
  label: string
  farmerName: string
  treatment: string
  tree: string
  rows: SurveyRow[]
}

export function getTreeGroups(rows: SurveyRow[]): TreeGroup[] {
  const map = new Map<string, TreeGroup>()
  const order: string[] = []

  for (const row of rows) {
    const key = `${row.label}_${row.farmerName}_${row.treatment}_${row.tree}`
    if (!map.has(key)) {
      map.set(key, { key, label: row.label, farmerName: row.farmerName, treatment: row.treatment, tree: row.tree, rows: [] })
      order.push(key)
    }
    map.get(key)!.rows.push(row)
  }

  for (const group of map.values()) {
    group.rows.sort((a, b) => {
      const na = parseInt(a.fruit, 10)
      const nb = parseInt(b.fruit, 10)
      return isNaN(na) || isNaN(nb) ? a.fruit.localeCompare(b.fruit) : na - nb
    })
  }

  return order.map(key => map.get(key)!)
}

export function findFirstIncompletePosition(
  group: TreeGroup,
  orderedFields: readonly MeasureField[],
): { fruitIdx: number; field: MeasureField } | null {
  for (let fruitIdx = 0; fruitIdx < group.rows.length; fruitIdx++) {
    const row = group.rows[fruitIdx]
    for (const field of orderedFields) {
      if (row[field] === '' || row[field] === undefined) {
        return { fruitIdx, field }
      }
    }
  }
  return null
}

export function isTreeComplete(
  group: TreeGroup,
  orderedFields: readonly MeasureField[],
): boolean {
  return findFirstIncompletePosition(group, orderedFields) === null
}
