import { useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import './App.css'
import { t } from './i18n'
import { buildQuarterGrid, calculateCombinedMetrics } from './lib/calculations'
import {
  formatCurrency,
  formatDataTimestamp,
  formatDateLabel,
  formatInputNumberString,
  formatLargeValue,
  formatNumber,
  formatPlain,
} from './lib/formatters'
import {
  createInitialManualState,
  estimateMissingNetIncome,
  manualToQuarterRecords,
  manualToValuationInputs,
  populateManualQuarters,
} from './lib/manual'
import { fetchStockDetail, loadMeta, searchStocks } from './lib/staticData'
import type {
  CalculatedMetrics,
  Language,
  ManualInputState,
  Market,
  QuarterRecord,
  StockDetailData,
  StockSearchResult,
} from './types'

type Mode = 'search' | 'manual'

type ManualOutput = {
  metrics: CalculatedMetrics
  quarters: QuarterRecord[]
}

const GUIDE_URL = 'https://blog.naver.com/latriss/224251323952'

function App() {
  const [language, setLanguage] = useState<Language>('ko')
  const [mode, setMode] = useState<Mode>('search')

  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedStock, setSelectedStock] = useState<StockSearchResult | null>(null)
  const [stockDetail, setStockDetail] = useState<StockDetailData | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [manualState, setManualState] = useState<ManualInputState>(() => createInitialManualState())
  const [manualOutput, setManualOutput] = useState<ManualOutput | null>(null)
  const [dataUpdatedAt, setDataUpdatedAt] = useState<string | null>(null)

  const currentYear = new Date().getFullYear()

  useEffect(() => {
    void loadMeta().then((meta) => {
      if (meta?.updatedAt) {
        setDataUpdatedAt(meta.updatedAt)
      }
    })
  }, [])

  const stockMetrics = useMemo(() => {
    if (!stockDetail) {
      return null
    }
    return calculateCombinedMetrics({
      quarters: stockDetail.quarters,
      valuationInputs: stockDetail.valuationInputs,
      referenceYear: currentYear,
    })
  }, [stockDetail, currentYear])

  const stockQuarterGrid = useMemo(() => {
    if (!stockDetail) {
      return []
    }
    return buildQuarterGrid(stockDetail.quarters, currentYear - 1)
  }, [stockDetail, currentYear])

  async function handleSearch(): Promise<void> {
    const trimmed = query.trim()
    if (!trimmed) {
      setSearchResults([])
      return
    }

    setSearching(true)
    setErrorMessage(null)
    try {
      const results = await searchStocks(trimmed)
      setSearchResults(results)
    } catch {
      setErrorMessage(t(language, 'apiWarning'))
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  async function handleSelectStock(stock: StockSearchResult): Promise<void> {
    setSelectedStock(stock)
    setLoadingDetail(true)
    setStockDetail(null)
    setErrorMessage(null)

    try {
      const detail = await fetchStockDetail(stock)
      setStockDetail(detail)
    } catch (error) {
      const msg = error instanceof Error ? error.message : ''
      if (msg.startsWith('notInUniverse')) {
        setErrorMessage(t(language, 'notInUniverse'))
      } else {
        setErrorMessage(t(language, 'apiWarning'))
      }
      setStockDetail(null)
    } finally {
      setLoadingDetail(false)
    }
  }

  function updateManualField(
    field: keyof Omit<ManualInputState, 'quarters' | 'advancedEnabled'>,
    value: string,
  ): void {
    setManualState((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  function updateManualQuarter(
    index: number,
    field: keyof ManualInputState['quarters'][number],
    value: string,
  ): void {
    setManualState((prev) => {
      const next = [...prev.quarters]
      next[index] = {
        ...next[index],
        [field]: value,
      }
      return {
        ...prev,
        quarters: next,
      }
    })
  }

  function copyToManualInput(): void {
    if (!stockDetail) return

    const market = stockDetail.market
    const divisor = market === 'KR' ? 1_0000_0000 : market === 'US' ? 1_000_000 : 1

    const numToStr = (v: number | null | undefined): string =>
      v !== null && v !== undefined && Number.isFinite(v)
        ? formatInputNumberString(String(v))
        : ''

    /** Convert large monetary value to display unit (억 or M) */
    const toUnit = (v: number | null | undefined): string =>
      v !== null && v !== undefined && Number.isFinite(v)
        ? formatInputNumberString(String(Math.round(v / divisor)))
        : ''

    const vi = stockDetail.valuationInputs
    const quarters = populateManualQuarters(stockDetail.quarters, market, currentYear)
    const baseState = createInitialManualState(currentYear)

    setManualState({
      ...baseState,
      price: numToStr(vi.price),
      marketCap: toUnit(vi.marketCap),
      shares: toUnit(vi.shares),
      equity: toUnit(vi.equity),
      debt: toUnit(vi.debt),
      cash: toUnit(vi.cash),
      advancedEnabled: true,
      market,
      quarters,
    })
    setManualOutput(null)
    setMode('manual')
  }

  function handleManualCalculate(): void {
    const quarters = manualToQuarterRecords(manualState)
    const valuations = manualToValuationInputs(manualState)

    const metrics = calculateCombinedMetrics({
      quarters,
      valuationInputs: valuations,
      referenceYear: currentYear,
    })

    const baseYear = manualState.quarters[0]?.year ?? currentYear - 1
    const quarterGrid = buildQuarterGrid(quarters, baseYear)

    setManualOutput({
      metrics,
      quarters: quarterGrid,
    })
  }

  function resetManual(): void {
    setManualState(createInitialManualState(currentYear))
    setManualOutput(null)
  }

  function estimateManualNetIncome(): void {
    setManualState((prev) => ({
      ...prev,
      quarters: estimateMissingNetIncome(prev.quarters),
    }))
    setManualOutput(null)
  }

  const marketLabel = stockDetail?.market ?? selectedStock?.market ?? 'UNKNOWN'

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <div className="title-row">
            <h1>{t(language, 'appTitle')}</h1>
            <a className="guide-link" href={GUIDE_URL} target="_blank" rel="noreferrer">
              {t(language, 'guideButton')}
            </a>
          </div>
          <p>{t(language, 'appSubtitle')}</p>
        </div>
        <div className="language-switch" role="group" aria-label={t(language, 'languageLabel')}>
          <button
            type="button"
            className={language === 'ko' ? 'active' : ''}
            onClick={() => setLanguage('ko')}
          >
            한국어
          </button>
          <button
            type="button"
            className={language === 'en' ? 'active' : ''}
            onClick={() => setLanguage('en')}
          >
            English
          </button>
        </div>
      </header>

      <nav className="mode-tabs" aria-label="mode tabs">
        <button
          type="button"
          className={mode === 'search' ? 'active' : ''}
          onClick={() => setMode('search')}
        >
          {t(language, 'tabSearch')}
        </button>
        <button
          type="button"
          className={mode === 'manual' ? 'active' : ''}
          onClick={() => setMode('manual')}
        >
          {t(language, 'tabManual')}
        </button>
      </nav>

      {errorMessage && <div className="error-banner">{errorMessage}</div>}

      {mode === 'search' ? (
        <section className="content-stack">
          <div className="search-card">
            <div className="search-info">
              <p>{t(language, 'searchUniverseNotice')}</p>
              <p>
                {t(language, 'dataAsOf')} : {formatDataTimestamp(dataUpdatedAt, language)}
              </p>
            </div>
            <div className="search-row">
              <input
                value={query}
                placeholder={t(language, 'searchPlaceholder')}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void handleSearch()
                  }
                }}
              />
              <button type="button" onClick={() => void handleSearch()} disabled={searching}>
                {searching ? t(language, 'searching') : t(language, 'searchButton')}
              </button>
            </div>

            <div className="search-results" aria-live="polite">
              {searchResults.length === 0 && !searching ? (
                <p className="hint-text">{t(language, 'pickStock')}</p>
              ) : null}
              {searchResults.map((stock) => (
                <button
                  key={stock.symbol}
                  type="button"
                  className={`result-item ${selectedStock?.symbol === stock.symbol ? 'selected' : ''}`}
                  onClick={() => void handleSelectStock(stock)}
                >
                  <span className="symbol">{stock.symbol}</span>
                  <span className="name">{stock.alias ? `${stock.alias} (${stock.name})` : stock.name}</span>
                  <span className="meta">{stock.exchange}</span>
                </button>
              ))}
            </div>
          </div>

          {loadingDetail ? <p className="hint-text">{t(language, 'loadingDetail')}</p> : null}

          {stockDetail && stockMetrics ? (
            <>
              <article className="panel detail-panel">
                <div className="panel-head">
                  <h2>{t(language, 'selectedStock')}</h2>
                  <div className="tag-row">
                    <span>{stockDetail.symbol}</span>
                    <span>{t(language, 'market')}: {marketLabel}</span>
                    <span>{t(language, 'currency')}: {stockDetail.currency}</span>
                  </div>
                </div>
                <h3 className="stock-name">{stockDetail.name}</h3>
                <p className="price-line">
                  {t(language, 'currentPrice')}:{' '}
                  <strong>{formatCurrency(stockDetail.price, stockDetail.currency, language)}</strong>
                </p>
                <p className="sub-info">
                  {t(language, 'sector')}: {stockDetail.sector ?? t(language, 'unknown')} / {t(language, 'industry')}:{' '}
                  {stockDetail.industry ?? t(language, 'unknown')}
                </p>
              </article>

              <article className="panel chart-panel">
                <h2>{t(language, 'chartTitle')}</h2>
                {stockDetail.priceSeries.length === 0 ? (
                  <p className="hint-text">{t(language, 'noChartData')}</p>
                ) : (
                  <div className="chart-wrap">
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={stockDetail.priceSeries}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#d7ddd9" />
                        <XAxis dataKey="date" tickFormatter={(value: string) => value.slice(5)} minTickGap={20} />
                        <YAxis tickFormatter={(value: number) => formatNumber(value, language, 0)} width={72} />
                        <Tooltip
                          formatter={(value: unknown) =>
                            formatCurrency(typeof value === 'number' ? value : null, stockDetail.currency, language)
                          }
                          labelFormatter={(label: unknown) => formatDateLabel(String(label), language)}
                        />
                        <Line type="monotone" dataKey="close" stroke="#0e8f7f" dot={false} strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </article>

              <article className="panel">
                <h2>{t(language, 'metricsTitle')}</h2>
                <div className="metric-grid">
                  <MetricCard
                    label={t(language, 'eps')}
                    value={formatPlain(stockMetrics.eps.ttm ?? stockMetrics.eps.annualized, language, 2)}
                  />
                  <MetricCard label={t(language, 'bps')} value={formatPlain(stockMetrics.bps, language, 2)} />
                  <MetricCard
                    label={t(language, 'per')}
                    value={formatPlain(stockMetrics.per.ttm ?? stockMetrics.per.annualized, language, 2)}
                  />
                  <MetricCard
                    label={t(language, 'pbr')}
                    value={formatPlain(stockMetrics.pbr.annualized ?? stockMetrics.pbr.ttm, language, 2)}
                  />
                  <MetricCard
                    label={t(language, 'evEbitda')}
                    value={formatPlain(stockMetrics.evEbitda.ttm ?? stockMetrics.evEbitda.annualized, language, 2)}
                  />
                </div>
              </article>

              <article className="panel">
                <h2>{t(language, 'methodTitle')}</h2>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Metric</th>
                        <th>{t(language, 'annualized')}</th>
                        <th>{t(language, 'ttm')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{t(language, 'eps')}</td>
                        <td>{formatPlain(stockMetrics.eps.annualized, language, 2)}</td>
                        <td>{formatPlain(stockMetrics.eps.ttm, language, 2)}</td>
                      </tr>
                      <tr>
                        <td>{t(language, 'per')}</td>
                        <td>{formatPlain(stockMetrics.per.annualized, language, 2)}</td>
                        <td>{formatPlain(stockMetrics.per.ttm, language, 2)}</td>
                      </tr>
                      <tr>
                        <td>{t(language, 'pbr')}</td>
                        <td>{formatPlain(stockMetrics.pbr.annualized, language, 2)}</td>
                        <td>{formatPlain(stockMetrics.pbr.ttm, language, 2)}</td>
                      </tr>
                      <tr>
                        <td>{t(language, 'evEbitda')}</td>
                        <td>{formatPlain(stockMetrics.evEbitda.annualized, language, 2)}</td>
                        <td>{formatPlain(stockMetrics.evEbitda.ttm, language, 2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="hint-text">{t(language, 'sameValueNote')}</p>
              </article>

              <article className="panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2>{t(language, 'quarterTitle')}</h2>
                  <button type="button" className="link-button" onClick={copyToManualInput}>
                    {t(language, 'copyToManual')} &rsaquo;
                  </button>
                </div>
                {stockQuarterGrid.length === 0 ? (
                  <p className="hint-text">{t(language, 'noQuarterData')}</p>
                ) : (
                  <QuarterTable rows={stockQuarterGrid} language={language} currency={stockDetail.currency} market={stockDetail.market} />
                )}
              </article>
            </>
          ) : null}

          {!stockDetail && !loadingDetail && selectedStock && searchResults.length === 0 ? (
            <p className="hint-text">{t(language, 'noSearchResult')}</p>
          ) : null}
        </section>
      ) : (
        <section className="content-stack">
          <article className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>{t(language, 'sectionManualPrice')}</h2>
              <label style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                {t(language, 'market')}
                <select
                  value={manualState.market}
                  onChange={(e) => setManualState((prev) => ({ ...prev, market: e.target.value as Market }))}
                  style={{ padding: '0.3rem 0.4rem', borderRadius: '0.5rem', border: '1px solid #c7d7d2' }}
                >
                  <option value="KR">KR (억)</option>
                  <option value="US">US (M)</option>
                </select>
              </label>
            </div>
            <div className="manual-grid two-col">
              <LabeledInput
                label={t(language, 'currentPrice')}
                value={manualState.price}
                onChange={(value) => updateManualField('price', value)}
              />
              <LabeledInput
                label={`${t(language, 'marketCap')} (${manualState.market === 'KR' ? '억' : 'M'})`}
                value={manualState.marketCap}
                onChange={(value) => updateManualField('marketCap', value)}
              />
            </div>

            <button
              type="button"
              className="link-button"
              onClick={() =>
                setManualState((prev) => ({
                  ...prev,
                  advancedEnabled: !prev.advancedEnabled,
                }))
              }
            >
              {manualState.advancedEnabled ? `- ${t(language, 'advancedInput')}` : `+ ${t(language, 'advancedInput')}`}
            </button>

            {manualState.advancedEnabled ? (
              <>
                <p className="hint-text">{t(language, 'advancedHelp')}</p>
                <div className="manual-grid three-col">
                  <LabeledInput
                    label={`${t(language, 'shares')} (${manualState.market === 'KR' ? '억' : 'M'})`}
                    value={manualState.shares}
                    onChange={(value) => updateManualField('shares', value)}
                  />
                  <LabeledInput
                    label={`${t(language, 'equity')} (${manualState.market === 'KR' ? '억' : 'M'})`}
                    value={manualState.equity}
                    onChange={(value) => updateManualField('equity', value)}
                  />
                  <LabeledInput
                    label={`${t(language, 'debt')} (${manualState.market === 'KR' ? '억' : 'M'})`}
                    value={manualState.debt}
                    onChange={(value) => updateManualField('debt', value)}
                  />
                  <LabeledInput
                    label={`${t(language, 'cash')} (${manualState.market === 'KR' ? '억' : 'M'})`}
                    value={manualState.cash}
                    onChange={(value) => updateManualField('cash', value)}
                  />
                </div>
                <p className="hint-text">{t(language, 'manualMetricHelp')}</p>
              </>
            ) : null}
          </article>

          <article className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
              <h2>{t(language, 'sectionManualQuarter')}</h2>
              <button type="button" className="link-button link-button-inline" onClick={estimateManualNetIncome}>
                {t(language, 'estimateNetIncome')}
              </button>
            </div>
            <p className="hint-text">{t(language, 'estimateNetIncomeHelp')}</p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t(language, 'year')}</th>
                    <th>{t(language, 'quarter')}</th>
                    <th>{t(language, 'revenue')} ({manualState.market === 'KR' ? '억' : 'M'})</th>
                    <th>{t(language, 'operatingIncome')} ({manualState.market === 'KR' ? '억' : 'M'})</th>
                    <th>{t(language, 'netIncome')} ({manualState.market === 'KR' ? '억' : 'M'})</th>
                    {manualState.advancedEnabled ? <th>{t(language, 'ebitdaInput')} ({manualState.market === 'KR' ? '억' : 'M'})</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {manualState.quarters.map((row, index) => (
                    <tr key={`${row.year}-${row.quarter}`}>
                      <td>{row.year}</td>
                      <td>Q{row.quarter}</td>
                      <td>
                        <input
                          value={row.revenue}
                          inputMode="decimal"
                          onChange={(event) =>
                            updateManualQuarter(index, 'revenue', formatInputNumberString(event.target.value))
                          }
                        />
                      </td>
                      <td>
                        <input
                          value={row.operatingIncome}
                          inputMode="decimal"
                          onChange={(event) =>
                            updateManualQuarter(index, 'operatingIncome', formatInputNumberString(event.target.value))
                          }
                        />
                      </td>
                      <td>
                        <input
                          value={row.netIncome}
                          inputMode="decimal"
                          onChange={(event) =>
                            updateManualQuarter(index, 'netIncome', formatInputNumberString(event.target.value))
                          }
                        />
                      </td>
                      {manualState.advancedEnabled ? (
                        <td>
                          <input
                            value={row.ebitda}
                            inputMode="decimal"
                            onChange={(event) =>
                              updateManualQuarter(
                                index,
                                'ebitda',
                                formatInputNumberString(event.target.value),
                              )
                            }
                          />
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="button-row">
              <button type="button" onClick={handleManualCalculate}>
                {t(language, 'calculate')}
              </button>
              <button type="button" className="secondary" onClick={resetManual}>
                {t(language, 'reset')}
              </button>
            </div>
          </article>

          {manualOutput ? (
            <>
              <article className="panel">
                <h2>{t(language, 'metricsTitle')}</h2>
                <div className="metric-grid">
                  <MetricCard
                    label={t(language, 'eps')}
                    value={formatPlain(manualOutput.metrics.eps.ttm ?? manualOutput.metrics.eps.annualized, language, 2)}
                  />
                  <MetricCard label={t(language, 'bps')} value={formatPlain(manualOutput.metrics.bps, language, 2)} />
                  <MetricCard
                    label={t(language, 'per')}
                    value={formatPlain(manualOutput.metrics.per.ttm ?? manualOutput.metrics.per.annualized, language, 2)}
                  />
                  <MetricCard
                    label={t(language, 'pbr')}
                    value={formatPlain(manualOutput.metrics.pbr.annualized ?? manualOutput.metrics.pbr.ttm, language, 2)}
                  />
                  <MetricCard
                    label={t(language, 'evEbitda')}
                    value={formatPlain(
                      manualOutput.metrics.evEbitda.ttm ?? manualOutput.metrics.evEbitda.annualized,
                      language,
                      2,
                    )}
                  />
                </div>
              </article>

              <article className="panel">
                <h2>{t(language, 'methodTitle')}</h2>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Metric</th>
                        <th>{t(language, 'annualized')}</th>
                        <th>{t(language, 'ttm')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{t(language, 'eps')}</td>
                        <td>{formatPlain(manualOutput.metrics.eps.annualized, language, 2)}</td>
                        <td>{formatPlain(manualOutput.metrics.eps.ttm, language, 2)}</td>
                      </tr>
                      <tr>
                        <td>{t(language, 'per')}</td>
                        <td>{formatPlain(manualOutput.metrics.per.annualized, language, 2)}</td>
                        <td>{formatPlain(manualOutput.metrics.per.ttm, language, 2)}</td>
                      </tr>
                      <tr>
                        <td>{t(language, 'pbr')}</td>
                        <td>{formatPlain(manualOutput.metrics.pbr.annualized, language, 2)}</td>
                        <td>{formatPlain(manualOutput.metrics.pbr.ttm, language, 2)}</td>
                      </tr>
                      <tr>
                        <td>{t(language, 'evEbitda')}</td>
                        <td>{formatPlain(manualOutput.metrics.evEbitda.annualized, language, 2)}</td>
                        <td>{formatPlain(manualOutput.metrics.evEbitda.ttm, language, 2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="panel">
                <h2>{t(language, 'quarterTitle')}</h2>
                <QuarterTable rows={manualOutput.quarters} language={language} currency={null} market={selectedStock?.market ?? 'US'} />
              </article>
            </>
          ) : null}
        </section>
      )}
    </div>
  )
}

type MetricCardProps = {
  label: string
  value: string
}

function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div className="metric-card">
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  )
}

type QuarterTableProps = {
  rows: QuarterRecord[]
  language: Language
  currency: string | null
  market: Market
}

function QuarterTable({ rows, language, market }: QuarterTableProps) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{t(language, 'year')}</th>
            <th>{t(language, 'quarter')}</th>
            <th>{t(language, 'revenue')} ({market === 'KR' ? '억' : 'M'})</th>
            <th>{t(language, 'operatingIncome')} ({market === 'KR' ? '억' : 'M'})</th>
            <th>{t(language, 'netIncome')} ({market === 'KR' ? '억' : 'M'})</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((record) => (
            <tr key={`${record.year}-${record.quarter}`}>
              <td>{record.year}</td>
              <td>Q{record.quarter}</td>
              <td>{formatLargeValue(record.revenue, market, language)}</td>
              <td>{formatLargeValue(record.operatingIncome, market, language)}</td>
              <td>{formatLargeValue(record.netIncome, market, language)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

type LabeledInputProps = {
  label: string
  value: string
  onChange: (value: string) => void
}

function LabeledInput({ label, value, onChange }: LabeledInputProps) {
  return (
    <label className="labeled-input">
      <span>{label}</span>
      <input
        value={value}
        inputMode="decimal"
        onChange={(event) => onChange(formatInputNumberString(event.target.value))}
      />
    </label>
  )
}

export default App
