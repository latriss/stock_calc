import type { ManualInputState, Market, QuarterRecord, ValuationInputs } from '../types'
import { parseOptionalNumber } from './formatters'

/** Multiplier to convert display unit back to raw value */
function unitMultiplier(market: Market): number {
  return market === 'KR' ? 1_0000_0000 : market === 'US' ? 1_000_000 : 1
}

function scaleUp(input: string, multiplier: number): number | null {
  const v = parseOptionalNumber(input)
  return v !== null ? v * multiplier : null
}

export function createInitialManualState(referenceYear = new Date().getFullYear()): ManualInputState {
  const years = [referenceYear - 1, referenceYear]
  const quarters: ManualInputState['quarters'] = []

  for (const year of years) {
    for (const quarter of [1, 2, 3, 4] as const) {
      quarters.push({
        year,
        quarter,
        revenue: '',
        operatingIncome: '',
        netIncome: '',
        eps: '',
        ebitda: '',
      })
    }
  }

  return {
    price: '',
    marketCap: '',
    shares: '',
    equity: '',
    debt: '',
    cash: '',
    advancedEnabled: false,
    market: 'KR',
    quarters,
  }
}

export function manualToQuarterRecords(state: ManualInputState): QuarterRecord[] {
  const m = unitMultiplier(state.market)
  return state.quarters.map((item) => ({
    year: item.year,
    quarter: item.quarter,
    asOfDate: `${item.year}-${String(item.quarter * 3).padStart(2, '0')}-30`,
    revenue: scaleUp(item.revenue, m),
    operatingIncome: scaleUp(item.operatingIncome, m),
    netIncome: scaleUp(item.netIncome, m),
    eps: parseOptionalNumber(item.eps),
    ebitda: scaleUp(item.ebitda, m),
    currencyCode: null,
  }))
}

export function manualToValuationInputs(state: ManualInputState): ValuationInputs {
  const m = unitMultiplier(state.market)
  return {
    price: parseOptionalNumber(state.price),
    marketCap: scaleUp(state.marketCap, m),
    shares: scaleUp(state.shares, m),
    equity: scaleUp(state.equity, m),
    debt: scaleUp(state.debt, m),
    cash: scaleUp(state.cash, m),
  }
}

