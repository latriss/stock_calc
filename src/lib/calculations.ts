import type { CalculatedMetrics, MetricResult, QuarterRecord, ValuationInputs } from '../types'

type QuarterNumericKey = 'eps' | 'ebitda'

interface MetricInput {
  quarters: QuarterRecord[]
  valuationInputs: ValuationInputs
  referenceYear?: number
}

interface BasicMetricOutput {
  eps: number | null
  per: number | null
  pbr: number | null
  evEbitda: number | null
}

function createMetricResult(annualized: number | null, ttm: number | null): MetricResult {
  return {
    annualized,
    ttm,
    displayStatus: annualized !== null || ttm !== null ? 'ok' : 'na',
  }
}

function sortQuarters(quarters: QuarterRecord[]): QuarterRecord[] {
  return [...quarters].sort((a, b) => {
    if (a.year !== b.year) {
      return a.year - b.year
    }
    return a.quarter - b.quarter
  })
}

function getQuarterValue(record: QuarterRecord, key: QuarterNumericKey): number | null {
  return record[key] ?? null
}

function annualizedFromYear(
  quarters: QuarterRecord[],
  key: QuarterNumericKey,
  preferredYear: number,
): number | null {
  const valuesForPreferredYear = quarters
    .filter((record) => record.year === preferredYear)
    .map((record) => getQuarterValue(record, key))
    .filter((value): value is number => value !== null)

  if (valuesForPreferredYear.length > 0) {
    const avg = valuesForPreferredYear.reduce((acc, current) => acc + current, 0) / valuesForPreferredYear.length
    return avg * 4
  }

  const years = [...new Set(quarters.map((record) => record.year))].sort((a, b) => b - a)
  for (const year of years) {
    const values = quarters
      .filter((record) => record.year === year)
      .map((record) => getQuarterValue(record, key))
      .filter((value): value is number => value !== null)

    if (values.length > 0) {
      const avg = values.reduce((acc, current) => acc + current, 0) / values.length
      return avg * 4
    }
  }

  return null
}

function trailingSum(quarters: QuarterRecord[], key: QuarterNumericKey, count: number): number | null {
  const values = sortQuarters(quarters)
    .map((record) => getQuarterValue(record, key))
    .filter((value): value is number => value !== null)

  if (values.length < count) {
    return null
  }

  return values
    .slice(-count)
    .reduce((acc, current) => acc + current, 0)
}

function calculateBps(valuationInputs: ValuationInputs): number | null {
  if (
    valuationInputs.equity === null ||
    valuationInputs.shares === null ||
    valuationInputs.shares <= 0
  ) {
    return null
  }
  return valuationInputs.equity / valuationInputs.shares
}

function calculateEv(valuationInputs: ValuationInputs): number | null {
  const marketCap =
    valuationInputs.marketCap ??
    (valuationInputs.price !== null && valuationInputs.shares !== null
      ? valuationInputs.price * valuationInputs.shares
      : null)

  if (marketCap === null || valuationInputs.debt === null || valuationInputs.cash === null) {
    return null
  }

  return marketCap + valuationInputs.debt - valuationInputs.cash
}

function calculatePer(price: number | null, eps: number | null): number | null {
  if (price === null || eps === null || price <= 0 || eps <= 0) {
    return null
  }
  return price / eps
}

function calculatePbr(price: number | null, bps: number | null): number | null {
  if (price === null || bps === null || price <= 0 || bps <= 0) {
    return null
  }
  return price / bps
}

function calculateEvToEbitda(ev: number | null, ebitda: number | null): number | null {
  if (ev === null || ebitda === null || ebitda <= 0) {
    return null
  }
  return ev / ebitda
}

export function calculateAnnualizedMetrics(input: MetricInput): BasicMetricOutput {
  const preferredYear = input.referenceYear ?? new Date().getFullYear()
  const annualizedEps = annualizedFromYear(input.quarters, 'eps', preferredYear)
  const annualizedEbitda = annualizedFromYear(input.quarters, 'ebitda', preferredYear)

  const bps = calculateBps(input.valuationInputs)
  const ev = calculateEv(input.valuationInputs)

  return {
    eps: annualizedEps,
    per: calculatePer(input.valuationInputs.price, annualizedEps),
    pbr: calculatePbr(input.valuationInputs.price, bps),
    evEbitda: calculateEvToEbitda(ev, annualizedEbitda),
  }
}

export function calculateTtmMetrics(input: MetricInput): BasicMetricOutput {
  const ttmEps = trailingSum(input.quarters, 'eps', 4)
  const ttmEbitda = trailingSum(input.quarters, 'ebitda', 4)

  const bps = calculateBps(input.valuationInputs)
  const ev = calculateEv(input.valuationInputs)

  return {
    eps: ttmEps,
    per: calculatePer(input.valuationInputs.price, ttmEps),
    pbr: calculatePbr(input.valuationInputs.price, bps),
    evEbitda: calculateEvToEbitda(ev, ttmEbitda),
  }
}

export function calculateCombinedMetrics(input: MetricInput): CalculatedMetrics {
  const annualized = calculateAnnualizedMetrics(input)
  const ttm = calculateTtmMetrics(input)
  const bps = calculateBps(input.valuationInputs)
  const ev = calculateEv(input.valuationInputs)

  return {
    eps: createMetricResult(annualized.eps, ttm.eps),
    per: createMetricResult(annualized.per, ttm.per),
    pbr: createMetricResult(annualized.pbr, ttm.pbr),
    evEbitda: createMetricResult(annualized.evEbitda, ttm.evEbitda),
    bps,
    ev,
  }
}

export function buildQuarterGrid(quarters: QuarterRecord[], baseYear: number): QuarterRecord[] {
  const map = new Map<string, QuarterRecord>()
  for (const record of quarters) {
    map.set(`${record.year}-Q${record.quarter}`, record)
  }

  const rows: QuarterRecord[] = []
  for (const year of [baseYear, baseYear + 1]) {
    for (const quarter of [1, 2, 3, 4] as const) {
      const hit = map.get(`${year}-Q${quarter}`)
      rows.push(
        hit ?? {
          year,
          quarter,
          asOfDate: `${year}-${String(quarter * 3).padStart(2, '0')}-30`,
          revenue: null,
          operatingIncome: null,
          netIncome: null,
          eps: null,
          ebitda: null,
          currencyCode: null,
        },
      )
    }
  }

  return rows
}

