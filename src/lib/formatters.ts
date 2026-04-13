import type { Language, Market } from '../types'

const localeByLanguage: Record<Language, string> = {
  ko: 'ko-KR',
  en: 'en-US',
}

function getLocale(language: Language): string {
  return localeByLanguage[language]
}

export function formatNumber(value: number | null | undefined, language: Language, maximumFractionDigits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'N/A'
  }

  return new Intl.NumberFormat(getLocale(language), {
    maximumFractionDigits,
  }).format(value)
}

export function formatCurrency(value: number | null | undefined, currencyCode: string | null, language: Language): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'N/A'
  }

  if (!currencyCode) {
    return formatNumber(value, language)
  }

  try {
    return new Intl.NumberFormat(getLocale(language), {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `${formatNumber(value, language)} ${currencyCode}`
  }
}

export function formatPlain(value: number | null | undefined, language: Language, fractionDigits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'N/A'
  }

  return new Intl.NumberFormat(getLocale(language), {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(value)
}

/**
 * Format large monetary values in a human-readable scale.
 * KR market: 억 (1억 = 100,000,000)
 * US market: M (millions)
 */
export function formatLargeValue(
  value: number | null | undefined,
  market: Market,
  language: Language,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'N/A'
  }

  if (market === 'KR') {
    const eok = value / 1_0000_0000
    return `${formatNumber(eok, language, 0)}억`
  }

  // US & others: millions
  const millions = value / 1_000_000
  return `${formatNumber(millions, language, 0)}M`
}

export function formatInputNumberString(input: string): string {
  if (!input) {
    return ''
  }

  let normalized = input.replace(/,/g, '').replace(/[^\d.-]/g, '')
  if (!normalized) {
    return ''
  }

  normalized = normalized.replace(/(?!^)-/g, '')
  const dotIndex = normalized.indexOf('.')
  if (dotIndex !== -1) {
    normalized =
      normalized.slice(0, dotIndex + 1) +
      normalized.slice(dotIndex + 1).replace(/\./g, '')
  }

  const isNegative = normalized.startsWith('-')
  const unsigned = isNegative ? normalized.slice(1) : normalized
  const hasDot = unsigned.includes('.')
  const [intPartRaw = '', fractionPart = ''] = unsigned.split('.')

  if (intPartRaw === '' && !hasDot) {
    return isNegative ? '-' : ''
  }

  const groupedInt = intPartRaw.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const sign = isNegative ? '-' : ''

  if (!hasDot) {
    return `${sign}${groupedInt}`
  }

  return `${sign}${groupedInt}.${fractionPart}`
}

export function formatDateLabel(dateString: string, language: Language): string {
  const d = new Date(dateString)
  if (Number.isNaN(d.getTime())) {
    return dateString
  }

  return new Intl.DateTimeFormat(getLocale(language), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

export function formatDataTimestamp(value: string | null | undefined, language: Language): string {
  if (!value) {
    return language === 'ko' ? '미확인' : 'Unknown'
  }

  const matched = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!matched) {
    return value
  }

  const [, year, month, day, hour, minute] = matched
  if (language === 'ko') {
    return `${year}년 ${month}월 ${day}일 ${hour}:${minute}`
  }

  return `${year}-${month}-${day} ${hour}:${minute}`
}

export function inferMarketFromSymbol(symbol: string): Market {
  const upper = symbol.toUpperCase()
  if (upper.endsWith('.KS') || upper.endsWith('.KQ')) {
    return 'KR'
  }
  if (/^[A-Z]{1,6}$/.test(upper)) {
    return 'US'
  }
  return 'UNKNOWN'
}

export function toQuarter(asOfDate: string): 1 | 2 | 3 | 4 {
  const month = Number.parseInt(asOfDate.slice(5, 7), 10)
  if (month <= 3) return 1
  if (month <= 6) return 2
  if (month <= 9) return 3
  return 4
}

export function parseOptionalNumber(input: string): number | null {
  if (!input.trim()) {
    return null
  }

  const sanitized = input.replace(/,/g, '')
  const value = Number.parseFloat(sanitized)
  if (Number.isNaN(value)) {
    return null
  }
  return value
}
