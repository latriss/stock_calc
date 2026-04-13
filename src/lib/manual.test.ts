import { describe, expect, it } from 'vitest'
import type { QuarterRecord } from '../types'
import {
  createInitialManualState,
  estimateMissingNetIncome,
  manualToQuarterRecords,
  populateManualQuarters,
} from './manual'

const sourceQuarters: QuarterRecord[] = [
  {
    year: 2024,
    quarter: 3,
    asOfDate: '2024-09-30',
    revenue: 100_000_000_000,
    operatingIncome: 10_000_000_000,
    netIncome: 8_000_000_000,
    eps: 1000,
    ebitda: 12_000_000_000,
    currencyCode: 'KRW',
  },
  {
    year: 2024,
    quarter: 4,
    asOfDate: '2024-12-31',
    revenue: 110_000_000_000,
    operatingIncome: 11_000_000_000,
    netIncome: 9_000_000_000,
    eps: 1100,
    ebitda: 13_000_000_000,
    currencyCode: 'KRW',
  },
  {
    year: 2025,
    quarter: 1,
    asOfDate: '2025-03-31',
    revenue: 120_000_000_000,
    operatingIncome: 12_000_000_000,
    netIncome: 10_000_000_000,
    eps: 1200,
    ebitda: 14_000_000_000,
    currencyCode: 'KRW',
  },
  {
    year: 2025,
    quarter: 2,
    asOfDate: '2025-06-30',
    revenue: 130_000_000_000,
    operatingIncome: 13_000_000_000,
    netIncome: 11_000_000_000,
    eps: 1300,
    ebitda: 15_000_000_000,
    currencyCode: 'KRW',
  },
  {
    year: 2025,
    quarter: 3,
    asOfDate: '2025-09-30',
    revenue: 140_000_000_000,
    operatingIncome: 14_000_000_000,
    netIncome: 12_000_000_000,
    eps: 1400,
    ebitda: 16_000_000_000,
    currencyCode: 'KRW',
  },
  {
    year: 2025,
    quarter: 4,
    asOfDate: '2025-12-31',
    revenue: 150_000_000_000,
    operatingIncome: 15_000_000_000,
    netIncome: 13_000_000_000,
    eps: 1500,
    ebitda: 17_000_000_000,
    currencyCode: 'KRW',
  },
]

describe('manual input helpers', () => {
  it('creates last-year and this-year rows from the reference year', () => {
    const state = createInitialManualState(2026)

    expect(state.quarters).toHaveLength(8)
    expect(state.quarters[0].year).toBe(2025)
    expect(state.quarters[7].year).toBe(2026)
  })

  it('keeps the target year window when copying stock quarters into manual input', () => {
    const quarters = populateManualQuarters(sourceQuarters, 'KR', 2026)

    expect(quarters).toHaveLength(8)
    expect(quarters[0].year).toBe(2025)
    expect(quarters[7].year).toBe(2026)
    expect(quarters[0].revenue).toBe('1,200')
    expect(quarters[3].ebitda).toBe('170')
    expect(quarters[4].revenue).toBe('')
    expect(quarters[7].ebitda).toBe('')
  })

  it('calculates EPS and keeps EBITDA as a direct manual input', () => {
    const state = createInitialManualState(2026)
    state.market = 'KR'
    state.shares = '1'
    state.advancedEnabled = true
    state.quarters[0].netIncome = '100'
    state.quarters[0].operatingIncome = '80'
    state.quarters[0].ebitda = '100'

    const [firstQuarter] = manualToQuarterRecords(state)

    expect(firstQuarter.eps).toBe(100)
    expect(firstQuarter.ebitda).toBe(10_000_000_000)
  })

  it('uses the lower value between same-quarter ratio and overall average ratio', () => {
    const state = createInitialManualState(2026)
    state.quarters[0].operatingIncome = '100'
    state.quarters[0].netIncome = '80'
    state.quarters[1].operatingIncome = '120'
    state.quarters[1].netIncome = '90'
    state.quarters[4].operatingIncome = '200'
    state.quarters[5].operatingIncome = '160'
    state.quarters[6].operatingIncome = '100'
    state.quarters[6].netIncome = '40'

    const estimated = estimateMissingNetIncome(state.quarters)

    expect(estimated[0].netIncome).toBe('80')
    expect(estimated[4].netIncome).toBe('130')
    expect(estimated[5].netIncome).toBe('104')
    expect(estimated[6].netIncome).toBe('40')
  })

  it('falls back to average ratio when same-quarter history is unavailable', () => {
    const state = createInitialManualState(2026)
    state.quarters[0].operatingIncome = '100'
    state.quarters[0].netIncome = '80'
    state.quarters[1].operatingIncome = '120'
    state.quarters[1].netIncome = '60'
    state.quarters[6].operatingIncome = '100'

    const estimated = estimateMissingNetIncome(state.quarters)

    expect(estimated[6].netIncome).toBe('65')
  })
})
