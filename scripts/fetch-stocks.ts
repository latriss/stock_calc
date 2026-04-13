/**
 * Main data fetch orchestrator.
 * Runs in GitHub Actions (Node.js) to collect stock data from Yahoo Finance
 * and write static JSON files for the frontend.
 *
 * Usage: npx tsx scripts/fetch-stocks.ts
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { writeMeta, writeSearchIndex, writeStockJson } from './lib/writer'
import type { SearchIndexEntry } from './lib/writer'
import { fetchStockData, type TickerEntry } from './lib/yahoo'

// ---------- Config ----------

const CONCURRENCY = 5
const DELAY_BETWEEN_MS = 300
const FAIL_THRESHOLD = 0.5 // exit 1 if >50% fail

// ---------- Helpers ----------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function loadTickers(filePath: string): TickerEntry[] {
  const raw = readFileSync(filePath, 'utf-8')
  return JSON.parse(raw) as TickerEntry[]
}

function deduplicateTickers(lists: TickerEntry[][]): TickerEntry[] {
  const seen = new Set<string>()
  const result: TickerEntry[] = []
  for (const list of lists) {
    for (const entry of list) {
      if (!seen.has(entry.symbol)) {
        seen.add(entry.symbol)
        result.push(entry)
      }
    }
  }
  return result
}

/**
 * Run tasks with concurrency limit.
 */
async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let nextIndex = 0

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex++
      await fn(items[index], index)
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  await Promise.all(workers)
}

// ---------- Main ----------

async function main(): Promise<void> {
  const startTime = Date.now()
  console.log('=== Stock Data Fetch Script ===')

  // 1. Load ticker lists
  const usTickers = loadTickers(join(process.cwd(), 'scripts', 'tickers', 'us.json'))
  const krTickers = loadTickers(join(process.cwd(), 'scripts', 'tickers', 'kr.json'))
  console.log(`Loaded tickers: US=${usTickers.length}, KR=${krTickers.length}`)

  // 2. Merge and deduplicate
  const allTickers = deduplicateTickers([usTickers, krTickers])
  console.log(`Total unique tickers: ${allTickers.length}`)

  // 3. Fetch all stock data
  const searchIndex: SearchIndexEntry[] = []
  const errors: string[] = []
  let successCount = 0

  await runWithConcurrency(allTickers, CONCURRENCY, async (ticker, index) => {
    try {
      const data = await fetchStockData(ticker)
      writeStockJson(data)

      searchIndex.push({
        symbol: data.symbol,
        name: data.name,
        exchange: data.exchange,
        sector: data.sector,
        industry: data.industry,
        market: data.market,
      })

      successCount++

      if ((index + 1) % 20 === 0) {
        console.log(`  Progress: ${index + 1}/${allTickers.length} (${successCount} ok, ${errors.length} err)`)
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error(`  FAIL [${ticker.symbol}]: ${msg}`)
      errors.push(ticker.symbol)
    }

    // Rate limiting delay
    await sleep(DELAY_BETWEEN_MS)
  })

  console.log(`\nFetch complete: ${successCount} success, ${errors.length} errors`)

  // 4. Write search index
  writeSearchIndex(searchIndex)
  console.log(`Search index written: ${searchIndex.length} entries`)

  // 5. Write metadata
  writeMeta({
    updatedAt: new Date().toISOString(),
    tickerCount: allTickers.length,
    successCount,
    errors,
  })

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`\nDone in ${elapsed}s`)

  // Exit with error if too many failures
  const failRate = errors.length / allTickers.length
  if (failRate > FAIL_THRESHOLD) {
    console.error(`\nFAIL: ${(failRate * 100).toFixed(1)}% failure rate exceeds threshold (${FAIL_THRESHOLD * 100}%)`)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
