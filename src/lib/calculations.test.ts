import { describe, expect, it } from 'vitest'
import {
  buildQuarterGrid,
  calculateAnnualizedMetrics,
  calculateCombinedMetrics,
  calculateTtmMetrics,
} from './calculations'
import type { QuarterRecord, ValuationInputs } from '../types'

const sampleQuarters: QuarterRecord[] = [
  {
    year: 2025,
    quarter: 1,
    asOfDate: '2025-03-31',
    revenue: 100,
    operatingIncome: 30,
    netIncome: 20,
    eps: 1.8,
    ebitda: 95,
    currencyCode: 'USD',
  },
  {
    year: 2025,
    quarter: 2,
    asOfDate: '2025-06-30',
    revenue: 110,
    operatingIncome: 31,
    netIncome: 22,
    eps: 2.1,
    ebitda: 105,
    currencyCode: 'USD',
  },
  {
    year: 2026,
    quarter: 1,
    asOfDate: '2026-03-31',
    revenue: 120,
    operatingIncome: 36,
    netIncome: 24,
    eps: 2,
    ebitda: 100,
    currencyCode: 'USD',
  },
  {
    year: 2026,
    quarter: 2,
    asOfDate: '2026-06-30',
    revenue: 125,
    operatingIncome: 38,
    netIncome: 26,
    eps: 1.5,
    ebitda: 90,
    currencyCode: 'USD',
  },
]

const valuationInputs: ValuationInputs = {
  price: 70,
  marketCap: 7000,
  shares: 100,
  equity: 1000,
  debt: 300,
  cash: 100,
}

describe('valuation calculations', () => {
  it('calculates annualized metrics from this year average * 4', () => {
    const annualized = calculateAnnualizedMetrics({
      quarters: sampleQuarters,
      valuationInputs,
      referenceYear: 2026,
    })

    expect(annualized.eps).toBeCloseTo(7)
    expect(annualized.per).toBeCloseTo(10)
    expect(annualized.pbr).toBeCloseTo(7)
    expect(annualized.evEbitda).toBeCloseTo(18.947, 3)
  })

  it('calculates ttm metrics from the latest 4 confirmed quarters', () => {
    const ttm = calculateTtmMetrics({
      quarters: sampleQuarters,
      valuationInputs,
      referenceYear: 2026,
    })

    expect(ttm.eps).toBeCloseTo(7.4)
    expect(ttm.per).toBeCloseTo(9.459, 3)
    expect(ttm.pbr).toBeCloseTo(7)
    expect(ttm.evEbitda).toBeCloseTo(18.462, 3)
  })

  it('returns N/A-equivalent null when required valuation inputs are missing', () => {
    const metrics = calculateCombinedMetrics({
      quarters: sampleQuarters,
      valuationInputs: {
        price: 70,
        marketCap: null,
        shares: null,
        equity: null,
        debt: null,
        cash: null,
      },
      referenceYear: 2026,
    })

    expect(metrics.bps).toBeNull()
    expect(metrics.pbr.annualized).toBeNull()
    expect(metrics.ev).toBeNull()
    expect(metrics.evEbitda.ttm).toBeNull()
  })

  it('builds year-quarter grid with null placeholders for missing quarters', () => {
    const grid = buildQuarterGrid(sampleQuarters.slice(0, 2), 2025)
    expect(grid).toHaveLength(8)
    expect(grid[0].year).toBe(2025)
    expect(grid[4].year).toBe(2026)
    expect(grid[7].quarter).toBe(4)
    expect(grid[7].revenue).toBeNull()
  })
})

