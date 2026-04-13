import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { StockData } from './yahoo'

const DATA_DIR = join(process.cwd(), 'public', 'data')
const STOCKS_DIR = join(DATA_DIR, 'stocks')

function ensureDir(dirPath: string): void {
  mkdirSync(dirPath, { recursive: true })
}

export function writeStockJson(data: StockData): void {
  ensureDir(STOCKS_DIR)
  const filePath = join(STOCKS_DIR, `${data.symbol}.json`)
  ensureDir(dirname(filePath))
  writeFileSync(filePath, JSON.stringify(data), 'utf-8')
}

export interface SearchIndexEntry {
  symbol: string
  name: string
  exchange: string
  sector: string | null
  industry: string | null
  market: 'KR' | 'US' | 'UNKNOWN'
}

export function writeSearchIndex(entries: SearchIndexEntry[]): void {
  ensureDir(DATA_DIR)
  const sorted = [...entries].sort((a, b) => a.symbol.localeCompare(b.symbol))
  writeFileSync(join(DATA_DIR, 'search-index.json'), JSON.stringify(sorted), 'utf-8')
}

export interface MetaData {
  updatedAt: string
  tickerCount: number
  successCount: number
  errors: string[]
}

export function writeMeta(meta: MetaData): void {
  ensureDir(DATA_DIR)
  writeFileSync(join(DATA_DIR, 'meta.json'), JSON.stringify(meta, null, 2), 'utf-8')
}
