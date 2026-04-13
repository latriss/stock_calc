import type { ManualInputState, Market, QuarterRecord, ValuationInputs } from '../types'
import { formatInputNumberString, parseOptionalNumber } from './formatters'

/** Multiplier to convert display unit back to raw value */
function unitMultiplier(market: Market): number {
  return market === 'KR' ? 1_0000_0000 : market === 'US' ? 1_000_000 : 1
}

function scaleUp(input: string, multiplier: number): number | null {
  const v = parseOptionalNumber(input)
  return v !== null ? v * multiplier : null
}

function scaleDown(value: number | null | undefined, multiplier: number): string {
  return value !== null && value !== undefined && Number.isFinite(value)
    ? formatInputNumberString(String(Math.round(value / multiplier)))
    : ''
}

function createQuarterInputGrid(referenceYear: number): ManualInputState['quarters'] {
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
        ebitda: '',
      })
    }
  }

  return quarters
}

export function createInitialManualState(referenceYear = new Date().getFullYear()): ManualInputState {
  const quarters = createQuarterInputGrid(referenceYear)

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

export function populateManualQuarters(
  sourceQuarters: QuarterRecord[],
  market: Market,
  referenceYear = new Date().getFullYear(),
): ManualInputState['quarters'] {
  const multiplier = unitMultiplier(market)
  const sourceMap = new Map(
    sourceQuarters.map((quarter) => [`${quarter.year}-Q${quarter.quarter}`, quarter] as const),
  )

  return createQuarterInputGrid(referenceYear).map((quarter) => {
    const source = sourceMap.get(`${quarter.year}-Q${quarter.quarter}`)
    if (!source) {
      return quarter
    }

    return {
      ...quarter,
      revenue: scaleDown(source.revenue, multiplier),
      operatingIncome: scaleDown(source.operatingIncome, multiplier),
      netIncome: scaleDown(source.netIncome, multiplier),
      ebitda: scaleDown(source.ebitda, multiplier),
    }
  })
}

function calculateNetIncomeRatio(quarter: ManualInputState['quarters'][number]): number | null {
  const operatingIncome = parseOptionalNumber(quarter.operatingIncome)
  const netIncome = parseOptionalNumber(quarter.netIncome)

  if (operatingIncome === null || netIncome === null || operatingIncome === 0) {
    return null
  }

  return netIncome / operatingIncome
}

function chooseEstimateRatio(sameQuarterRatio: number | undefined, averageRatio: number): number | null {
  if (Number.isFinite(sameQuarterRatio)) {
    return Math.min(sameQuarterRatio as number, averageRatio)
  }

  if (Number.isFinite(averageRatio)) {
    return averageRatio
  }

  return null
}

export function estimateMissingNetIncome(
  quarters: ManualInputState['quarters'],
): ManualInputState['quarters'] {
  const ratioEntries = quarters
    .map((quarter, index) => ({
      index,
      year: quarter.year,
      quarter: quarter.quarter,
      ratio: calculateNetIncomeRatio(quarter),
    }))
    .filter(
      (entry): entry is { index: number; year: number; quarter: 1 | 2 | 3 | 4; ratio: number } =>
        entry.ratio !== null,
    )

  if (ratioEntries.length === 0) {
    return quarters
  }

  const averageRatio = ratioEntries.reduce((sum, entry) => sum + entry.ratio, 0) / ratioEntries.length

  return quarters.map((quarter, index) => {
    if (parseOptionalNumber(quarter.netIncome) !== null) {
      return quarter
    }

    const operatingIncome = parseOptionalNumber(quarter.operatingIncome)
    if (operatingIncome === null || operatingIncome === 0) {
      return quarter
    }

    const sameQuarterRatio = ratioEntries
      .filter((entry) => entry.index !== index && entry.quarter === quarter.quarter)
      .sort((a, b) => Math.abs(a.year - quarter.year) - Math.abs(b.year - quarter.year))[0]?.ratio

    const ratio = chooseEstimateRatio(sameQuarterRatio, averageRatio)
    if (ratio === null) {
      return quarter
    }

    return {
      ...quarter,
      netIncome: formatInputNumberString(String(Math.round(operatingIncome * ratio))),
    }
  })
}

export function manualToQuarterRecords(state: ManualInputState): QuarterRecord[] {
  const m = unitMultiplier(state.market)
  const shares = scaleUp(state.shares, m)
  return state.quarters.map((item) => {
    const revenue = scaleUp(item.revenue, m)
    const operatingIncome = scaleUp(item.operatingIncome, m)
    const netIncome = scaleUp(item.netIncome, m)
    const ebitda = scaleUp(item.ebitda, m)

    return {
      year: item.year,
      quarter: item.quarter,
      asOfDate: `${item.year}-${String(item.quarter * 3).padStart(2, '0')}-30`,
      revenue,
      operatingIncome,
      netIncome,
      eps: shares !== null && shares > 0 && netIncome !== null ? netIncome / shares : null,
      ebitda,
      currencyCode: null,
    }
  })
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
