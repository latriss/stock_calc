const TIMESERIES_ENDPOINT = 'https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries'
const TYPES = [
  'quarterlyTotalRevenue',
  'quarterlyNetIncome',
  'quarterlyBasicEPS',
]
const symbol = '005930.KS'
const period1 = 946684800
const period2 = Math.floor(Date.now() / 1000)
const url = `${TIMESERIES_ENDPOINT}/${encodeURIComponent(symbol)}?type=${TYPES.join(',')}&period1=${period1}&period2=${period2}`

type TimeseriesValue = {
  asOfDate?: string
  reportedValue?: {
    raw?: number
  }
}

type TimeseriesNode = {
  meta?: {
    type?: string[]
  }
  [key: string]: unknown
}

type TimeseriesResponse = {
  timeseries?: {
    result?: TimeseriesNode[]
  }
}

async function main(): Promise<void> {
  const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'stock-calc/1.0' } })
  if (!res.ok) { console.error('HTTP', res.status); return }
  const data = await res.json() as TimeseriesResponse
  for (const node of data.timeseries?.result ?? []) {
    const typeName = node.meta?.type?.[0]
    if (!typeName) continue
    const values = node[typeName]
    if (!Array.isArray(values)) continue
    console.log(`\n=== ${typeName} (${values.length} entries) ===`)
    // Show last 8 entries
    for (const v of values.slice(-8) as TimeseriesValue[]) {
      console.log(`  ${v.asOfDate}  ${v.reportedValue?.raw}`)
    }
  }
}
void main()
