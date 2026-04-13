/**
 * Yahoo Finance data fetcher for Node.js (server-side, no CORS restriction).
 * Reuses the same endpoints and parsing logic as src/lib/yahooApi.ts.
 */

const CHART_ENDPOINT = 'https://query1.finance.yahoo.com/v8/finance/chart'
const TIMESERIES_ENDPOINT =
  'https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries'

const TIMESERIES_TYPES = [
  'quarterlyTotalRevenue',
  'quarterlyOperatingIncome',
  'quarterlyNetIncome',
  'quarterlyBasicEPS',
  'quarterlyEBITDA',
  'quarterlyBasicAverageShares',
  'quarterlyStockholdersEquity',
  'quarterlyTotalDebt',
  'quarterlyCashAndCashEquivalents',
  'trailingBasicEPS',
  'trailingMarketCap',
] as const

// ---------- Types ----------

interface ChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        symbol?: string
        longName?: string
        shortName?: string
        currency?: string
        regularMarketPrice?: number
      }
      timestamp?: number[]
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>
        }>
      }
    }>
  }
}

interface TimeseriesValue {
  asOfDate: string
  currencyCode?: string
  reportedValue?: { raw?: number }
}

interface TimeseriesNode {
  meta?: { type?: string[] }
  [key: string]: unknown
}

interface TimeseriesResponse {
  timeseries?: { result?: TimeseriesNode[] }
}

export interface PricePoint {
  date: string
  close: number
}

export interface QuarterRecord {
  year: number
  quarter: 1 | 2 | 3 | 4
  asOfDate: string
  revenue: number | null
  operatingIncome: number | null
  netIncome: number | null
  eps: number | null
  ebitda: number | null
  currencyCode: string | null
}

export interface ValuationInputs {
  price: number | null
  marketCap: number | null
  shares: number | null
  equity: number | null
  debt: number | null
  cash: number | null
}

export interface StockData {
  symbol: string
  name: string
  currency: string
  exchange: string
  sector: string | null
  industry: string | null
  market: 'KR' | 'US' | 'UNKNOWN'
  price: number | null
  priceSeries: PricePoint[]
  quarters: QuarterRecord[]
  valuationInputs: ValuationInputs
}

// ---------- Helpers ----------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function toIsoDate(timestampSeconds: number): string {
  return new Date(timestampSeconds * 1000).toISOString().slice(0, 10)
}

function toQuarter(asOfDate: string): 1 | 2 | 3 | 4 {
  const month = Number.parseInt(asOfDate.slice(5, 7), 10)
  if (month <= 3) return 1
  if (month <= 6) return 2
  if (month <= 9) return 3
  return 4
}

function inferMarket(symbol: string): 'KR' | 'US' | 'UNKNOWN' {
  const upper = symbol.toUpperCase()
  if (upper.endsWith('.KS') || upper.endsWith('.KQ')) return 'KR'
  if (/^[A-Z]{1,6}$/.test(upper) || upper.includes('.')) return 'US'
  return 'UNKNOWN'
}

const TYPE_TO_FIELD: Record<string, string> = {
  quarterlyTotalRevenue: 'revenue',
  quarterlyOperatingIncome: 'operatingIncome',
  quarterlyNetIncome: 'netIncome',
  quarterlyBasicEPS: 'eps',
  quarterlyEBITDA: 'ebitda',
  quarterlyBasicAverageShares: 'shares',
  quarterlyStockholdersEquity: 'equity',
  quarterlyTotalDebt: 'debt',
  quarterlyCashAndCashEquivalents: 'cash',
  trailingMarketCap: 'marketCap',
}

// ---------- HTTP with retry ----------

async function fetchJson<T>(url: string, maxRetries = 2, baseDelay = 500): Promise<T> {
  let attempt = 0
  let lastError: unknown

  while (attempt <= maxRetries) {
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'stock-calc/1.0' },
      })

      if (!response.ok) {
        if ((response.status === 429 || response.status >= 500) && attempt < maxRetries) {
          const retryAfter = response.headers.get('retry-after')
          const delayMs = retryAfter
            ? Number.parseInt(retryAfter, 10) * 1000
            : baseDelay * 2 ** attempt
          await sleep(delayMs)
          attempt++
          continue
        }
        throw new Error(`HTTP ${response.status} for ${url}`)
      }

      return (await response.json()) as T
    } catch (error) {
      lastError = error
      if (attempt >= maxRetries) break
      await sleep(baseDelay * 2 ** attempt)
      attempt++
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Failed to fetch ${url}`)
}

// ---------- Parsing ----------

function parseTimeseriesValues(node: TimeseriesNode, typeName: string): TimeseriesValue[] {
  const raw = node[typeName]
  if (!Array.isArray(raw)) return []

  return raw.filter((item): item is TimeseriesValue => {
    if (!item || typeof item !== 'object') return false
    return typeof (item as TimeseriesValue).asOfDate === 'string'
  })
}

function parseFundamentals(payload: TimeseriesResponse) {
  const quarterMap = new Map<string, QuarterRecord>()
  const valuationInputs: Omit<ValuationInputs, 'price'> = {
    marketCap: null,
    shares: null,
    equity: null,
    debt: null,
    cash: null,
  }

  let trailingEps: number | null = null

  for (const node of payload.timeseries?.result ?? []) {
    const typeName = node.meta?.type?.[0]
    if (!typeName) continue

    const values = parseTimeseriesValues(node, typeName)
    if (values.length === 0) continue

    if (typeName === 'trailingBasicEPS') {
      const latest = [...values].sort((a, b) => a.asOfDate.localeCompare(b.asOfDate)).at(-1)
      trailingEps = numberOrNull(latest?.reportedValue?.raw)
      continue
    }

    const mappedField = TYPE_TO_FIELD[typeName]
    if (!mappedField) continue

    for (const value of values) {
      const numeric = numberOrNull(value.reportedValue?.raw)
      if (numeric === null) continue

      if (mappedField === 'marketCap') {
        valuationInputs.marketCap = numeric
        continue
      }
      if (mappedField === 'shares') valuationInputs.shares = numeric
      if (mappedField === 'equity') valuationInputs.equity = numeric
      if (mappedField === 'debt') valuationInputs.debt = numeric
      if (mappedField === 'cash') valuationInputs.cash = numeric

      const quarter = toQuarter(value.asOfDate)
      const year = Number.parseInt(value.asOfDate.slice(0, 4), 10)
      const key = `${year}-Q${quarter}`
      const base: QuarterRecord = quarterMap.get(key) ?? {
        year,
        quarter,
        asOfDate: value.asOfDate,
        revenue: null,
        operatingIncome: null,
        netIncome: null,
        eps: null,
        ebitda: null,
        currencyCode: value.currencyCode ?? null,
      }

      if (mappedField === 'revenue') base.revenue = numeric
      else if (mappedField === 'operatingIncome') base.operatingIncome = numeric
      else if (mappedField === 'netIncome') base.netIncome = numeric
      else if (mappedField === 'eps') base.eps = numeric
      else if (mappedField === 'ebitda') base.ebitda = numeric

      quarterMap.set(key, base)
    }
  }

  const quarters = [...quarterMap.values()].sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.quarter - b.quarter,
  )

  return { quarters, valuationInputs, trailingEps }
}

// ---------- Public API ----------

export interface TickerEntry {
  symbol: string
  name: string
  exchange: string
}

export async function fetchStockData(
  ticker: TickerEntry,
  sector?: string | null,
  industry?: string | null,
): Promise<StockData> {
  const encodedSymbol = encodeURIComponent(ticker.symbol)
  const period1 = 946684800 // 2000-01-01
  const period2 = Math.floor(Date.now() / 1000)

  const chartUrl = `${CHART_ENDPOINT}/${encodedSymbol}?range=6mo&interval=1d`
  const timeseriesUrl = `${TIMESERIES_ENDPOINT}/${encodedSymbol}?type=${TIMESERIES_TYPES.join(',')}&period1=${period1}&period2=${period2}`

  const [chartPayload, fundamentalsPayload] = await Promise.all([
    fetchJson<ChartResponse>(chartUrl),
    fetchJson<TimeseriesResponse>(timeseriesUrl),
  ])

  const chartNode = chartPayload.chart?.result?.[0]
  const timestamps = chartNode?.timestamp ?? []
  const closes = chartNode?.indicators?.quote?.[0]?.close ?? []
  const priceSeries: PricePoint[] = timestamps
    .map((ts, i) => ({ date: toIsoDate(ts), close: closes[i] }))
    .filter((p): p is PricePoint => typeof p.close === 'number')

  const currentPrice =
    numberOrNull(chartNode?.meta?.regularMarketPrice) ?? priceSeries.at(-1)?.close ?? null

  const parsed = parseFundamentals(fundamentalsPayload)
  const currency = chartNode?.meta?.currency ?? parsed.quarters.at(-1)?.currencyCode ?? 'USD'

  return {
    symbol: ticker.symbol,
    name: chartNode?.meta?.longName ?? chartNode?.meta?.shortName ?? ticker.name,
    currency,
    exchange: ticker.exchange,
    sector: sector ?? null,
    industry: industry ?? null,
    market: inferMarket(ticker.symbol),
    price: currentPrice,
    priceSeries,
    quarters: parsed.quarters,
    valuationInputs: {
      ...parsed.valuationInputs,
      price: currentPrice,
    },
  }
}