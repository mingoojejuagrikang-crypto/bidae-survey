import { describe, it, expect } from 'vitest'
import { getTreeGroups, findFirstIncompletePosition, isTreeComplete } from '../utils/treeGroup'
import type { SurveyRow } from '../types'

function makeRow(overrides: Partial<SurveyRow> = {}): SurveyRow {
  return {
    rowId: crypto.randomUUID(),
    surveyDate: '2026-05-12',
    baseDate: '2026-05-10',
    farmerName: '이원창',
    label: 'A',
    treatment: '시험',
    tree: '1',
    fruit: '1',
    횡경: '',
    종경: '',
    비고: '',
    isComplete: false,
    isDirty: false,
    uploadStatus: 'pending',
    createdAt: '2026-05-12T00:00:00',
    updatedAt: '2026-05-12T00:00:00',
    ...overrides,
  }
}

function make5Fruits(tree: string, overrides: Array<Partial<SurveyRow>> = []): SurveyRow[] {
  return ['1', '2', '3', '4', '5'].map((fruit, i) =>
    makeRow({ tree, fruit, ...overrides[i] }),
  )
}

describe('getTreeGroups', () => {
  it('단일 나무 5 과실을 하나의 그룹으로 묶는다', () => {
    const rows = make5Fruits('1')
    const groups = getTreeGroups(rows)
    expect(groups).toHaveLength(1)
    expect(groups[0].tree).toBe('1')
    expect(groups[0].rows).toHaveLength(5)
  })

  it('두 나무를 각각 그룹화한다', () => {
    const rows = [...make5Fruits('1'), ...make5Fruits('2')]
    const groups = getTreeGroups(rows)
    expect(groups).toHaveLength(2)
    expect(groups[0].tree).toBe('1')
    expect(groups[1].tree).toBe('2')
  })

  it('그룹 내 과실 번호 오름차순 정렬', () => {
    const rows = [
      makeRow({ tree: '1', fruit: '3' }),
      makeRow({ tree: '1', fruit: '1' }),
      makeRow({ tree: '1', fruit: '2' }),
    ]
    const groups = getTreeGroups(rows)
    expect(groups[0].rows.map(r => r.fruit)).toEqual(['1', '2', '3'])
  })

  it('그룹 키는 라벨_농가명_처리_나무 조합', () => {
    const rows = [
      makeRow({ label: 'A', farmerName: '이원창', treatment: '시험', tree: '1' }),
      makeRow({ label: 'A', farmerName: '이원창', treatment: '관행', tree: '1' }),
    ]
    const groups = getTreeGroups(rows)
    expect(groups).toHaveLength(2)
    expect(groups[0].key).toBe('A_이원창_시험_1')
    expect(groups[1].key).toBe('A_이원창_관행_1')
  })

  it('생성 순서 유지 (tree 1 → 2 → 3)', () => {
    const rows = [...make5Fruits('1'), ...make5Fruits('3'), ...make5Fruits('2')]
    const groups = getTreeGroups(rows)
    expect(groups.map(g => g.tree)).toEqual(['1', '3', '2'])
  })
})

describe('findFirstIncompletePosition', () => {
  const fields = ['횡경', '종경'] as const

  it('모두 비어있을 때 과실 1 횡경 반환', () => {
    const group = getTreeGroups(make5Fruits('1'))[0]
    const pos = findFirstIncompletePosition(group, fields)
    expect(pos).toEqual({ fruitIdx: 0, field: '횡경' })
  })

  it('횡경만 입력됐을 때 과실 1 종경 반환', () => {
    const rows = make5Fruits('1', [{ 횡경: '35.1' }])
    const group = getTreeGroups(rows)[0]
    const pos = findFirstIncompletePosition(group, fields)
    expect(pos).toEqual({ fruitIdx: 0, field: '종경' })
  })

  it('과실 1 완료 시 과실 2 횡경 반환', () => {
    const rows = make5Fruits('1', [{ 횡경: '35.1', 종경: '42.3' }])
    const group = getTreeGroups(rows)[0]
    const pos = findFirstIncompletePosition(group, fields)
    expect(pos).toEqual({ fruitIdx: 1, field: '횡경' })
  })

  it('과실 1~4 완료, 과실 5 횡경 비어있을 때 과실 5 횡경 반환', () => {
    const rows = make5Fruits('1', [
      { 횡경: '35.1', 종경: '42.3' },
      { 횡경: '36.0', 종경: '43.1' },
      { 횡경: '35.8', 종경: '42.9' },
      { 횡경: '37.1', 종경: '43.8' },
      {},
    ])
    const group = getTreeGroups(rows)[0]
    const pos = findFirstIncompletePosition(group, fields)
    expect(pos).toEqual({ fruitIdx: 4, field: '횡경' })
  })

  it('모두 완료됐을 때 null 반환', () => {
    const rows = make5Fruits('1', [
      { 횡경: '35.1', 종경: '42.3' },
      { 횡경: '36.0', 종경: '43.1' },
      { 횡경: '35.8', 종경: '42.9' },
      { 횡경: '37.1', 종경: '43.8' },
      { 횡경: '38.2', 종경: '44.1' },
    ])
    const group = getTreeGroups(rows)[0]
    expect(findFirstIncompletePosition(group, fields)).toBeNull()
  })

  it('종경→횡경 순서일 때 종경을 먼저 반환', () => {
    const group = getTreeGroups(make5Fruits('1'))[0]
    const pos = findFirstIncompletePosition(group, ['종경', '횡경'])
    expect(pos).toEqual({ fruitIdx: 0, field: '종경' })
  })
})

describe('isTreeComplete', () => {
  const fields = ['횡경', '종경'] as const

  it('모두 비어있을 때 false', () => {
    const group = getTreeGroups(make5Fruits('1'))[0]
    expect(isTreeComplete(group, fields)).toBe(false)
  })

  it('하나라도 비어있을 때 false', () => {
    const rows = make5Fruits('1', [
      { 횡경: '35.1', 종경: '42.3' },
      { 횡경: '36.0', 종경: '43.1' },
      { 횡경: '35.8', 종경: '42.9' },
      { 횡경: '37.1', 종경: '43.8' },
      { 횡경: '38.2', 종경: '' },
    ])
    const group = getTreeGroups(rows)[0]
    expect(isTreeComplete(group, fields)).toBe(false)
  })

  it('모두 입력됐을 때 true', () => {
    const rows = make5Fruits('1', [
      { 횡경: '35.1', 종경: '42.3' },
      { 횡경: '36.0', 종경: '43.1' },
      { 횡경: '35.8', 종경: '42.9' },
      { 횡경: '37.1', 종경: '43.8' },
      { 횡경: '38.2', 종경: '44.1' },
    ])
    const group = getTreeGroups(rows)[0]
    expect(isTreeComplete(group, fields)).toBe(true)
  })
})
