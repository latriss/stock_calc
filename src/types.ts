export type Language = 'ko' | 'en'

export type Market = 'KR' | 'US' | 'UNKNOWN'

export type MetricStatus = 'ok' | 'na'

export interface StockSearchResult {
  symbol: string
  name: string
  alias?: string
  exchange: string
  sector: string | null
  industry: string | null
  market: Market
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

export interface MetricResult {
  annualized: number | null
  ttm: number | null
  displayStatus: MetricStatus
}

export interface CalculatedMetrics {
  eps: MetricResult
  per: MetricResult
  pbr: MetricResult
  evEbitda: MetricResult
  bps: number | null
  ev: number | null
}

export interface StockDetailData {
  symbol: string
  name: string
  currency: string
  sector: string | null
  industry: string | null
  market: Market
  price: number | null
  priceSeries: PricePoint[]
  quarters: QuarterRecord[]
  valuationInputs: ValuationInputs
}

export interface ManualInputState {
  price: string
  marketCap: string
  shares: string
  equity: string
  debt: string
  cash: string
  advancedEnabled: boolean
  market: Market
  quarters: Array<{
    year: number
    quarter: 1 | 2 | 3 | 4
    revenue: string
    operatingIncome: string
    netIncome: string
    depreciationAmortization: string
  }>
}
