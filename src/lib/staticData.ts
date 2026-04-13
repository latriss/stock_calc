import type { StockDetailData, StockSearchResult } from '../types'
import { inferMarketFromSymbol } from './formatters'

const DATA_BASE = `${import.meta.env.BASE_URL}data`

interface SearchEntry {
  symbol: string
  name: string
  alias?: string
  exchange: string
  sector: string | null
  industry: string | null
  market: 'KR' | 'US' | 'UNKNOWN'
}

let cachedIndex: SearchEntry[] | null = null

async function loadSearchIndex(): Promise<SearchEntry[]> {
  if (cachedIndex) return cachedIndex

  const response = await fetch(`${DATA_BASE}/search-index.json`)
  if (!response.ok) {
    throw new Error('Failed to load search index')
  }
  cachedIndex = (await response.json()) as SearchEntry[]
  return cachedIndex
}

/**
 * Client-side search against pre-built index.
 * Matches symbol prefix and name substring.
 */
export async function searchStocks(query: string): Promise<StockSearchResult[]> {
  const index = await loadSearchIndex()
  const q = query.trim().toLowerCase()
  if (!q) return []

  const results: StockSearchResult[] = []

  for (const entry of index) {
    const symbolLower = entry.symbol.toLowerCase()
    const nameLower = entry.name.toLowerCase()
    const aliasLower = entry.alias?.toLowerCase() ?? ''

    // Symbol prefix match gets highest priority
    const isSymbolPrefix = symbolLower.startsWith(q)
    // Exact symbol match
    const isExactSymbol = symbolLower === q
    // Name substring match
    const isNameMatch = nameLower.includes(q)
    // Alias (local-language name) substring match
    const isAliasMatch = aliasLower.includes(q)

    if (isExactSymbol || isSymbolPrefix || isNameMatch || isAliasMatch) {
      results.push({
        symbol: entry.symbol,
        name: entry.name,
        ...(entry.alias && { alias: entry.alias }),
        exchange: entry.exchange,
        sector: entry.sector,
        industry: entry.industry,
        market: entry.market ?? inferMarketFromSymbol(entry.symbol),
      })
    }

    if (results.length >= 20) break
  }

  // Sort: exact match first, then symbol prefix, then name match
  results.sort((a, b) => {
    const aSymbol = a.symbol.toLowerCase()
    const bSymbol = b.symbol.toLowerCase()
    const aExact = aSymbol === q ? 0 : aSymbol.startsWith(q) ? 1 : 2
    const bExact = bSymbol === q ? 0 : bSymbol.startsWith(q) ? 1 : 2
    return aExact - bExact
  })

  return results.slice(0, 20)
}

/**
 * Fetch stock detail from pre-generated static JSON.
 */
export async function fetchStockDetail(stock: StockSearchResult): Promise<StockDetailData> {
  const url = `${DATA_BASE}/stocks/${encodeURIComponent(stock.symbol)}.json`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`notInUniverse:${stock.symbol}`)
  }

  return (await response.json()) as StockDetailData
}

export interface DataMeta {
  updatedAt: string
  tickerCount: number
  successCount: number
  errors: string[]
}

let cachedMeta: DataMeta | null = null

export async function loadMeta(): Promise<DataMeta | null> {
  if (cachedMeta) return cachedMeta

  try {
    const response = await fetch(`${DATA_BASE}/meta.json`)
    if (!response.ok) return null
    cachedMeta = (await response.json()) as DataMeta
    return cachedMeta
  } catch {
    return null
  }
}
