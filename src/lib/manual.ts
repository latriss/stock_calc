import type { ManualInputState, QuarterRecord, ValuationInputs } from '../types'
import { parseOptionalNumber } from './formatters'

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
    quarters,
  }
}

export function manualToQuarterRecords(state: ManualInputState): QuarterRecord[] {
  return state.quarters.map((item) => ({
    year: item.year,
    quarter: item.quarter,
    asOfDate: `${item.year}-${String(item.quarter * 3).padStart(2, '0')}-30`,
    revenue: parseOptionalNumber(item.revenue),
    operatingIncome: parseOptionalNumber(item.operatingIncome),
    netIncome: parseOptionalNumber(item.netIncome),
    eps: parseOptionalNumber(item.eps),
    ebitda: parseOptionalNumber(item.ebitda),
    currencyCode: null,
  }))
}

export function manualToValuationInputs(state: ManualInputState): ValuationInputs {
  return {
    price: parseOptionalNumber(state.price),
    marketCap: parseOptionalNumber(state.marketCap),
    shares: parseOptionalNumber(state.shares),
    equity: parseOptionalNumber(state.equity),
    debt: parseOptionalNumber(state.debt),
    cash: parseOptionalNumber(state.cash),
  }
}

