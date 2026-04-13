import { describe, expect, it } from 'vitest'
import { formatDataTimestamp } from './formatters'

describe('formatDataTimestamp', () => {
  it('formats Korean timestamps in KST', () => {
    expect(formatDataTimestamp('2026-04-13T23:09:04.024Z', 'ko')).toBe('2026년 04월 14일 08:09 (KST)')
  })

  it('formats English timestamps in US Eastern Time', () => {
    expect(formatDataTimestamp('2026-04-13T23:09:04.024Z', 'en')).toBe('2026-04-13 19:09 (ET)')
  })
})
