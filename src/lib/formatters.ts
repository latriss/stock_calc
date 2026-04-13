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

