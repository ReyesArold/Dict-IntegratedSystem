const pesoFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
})

const numberFormatter = new Intl.NumberFormat('en-PH')

const shortDateFormatter = new Intl.DateTimeFormat('en-PH', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

const longDateFormatter = new Intl.DateTimeFormat('en-PH', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('en-PH', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

const timeFormatter = new Intl.DateTimeFormat('en-PH', {
  hour: 'numeric',
  minute: '2-digit',
})

function parseDate(value: string): Date {
  if (!value) return new Date(Number.NaN)
  // Date-only values are anchored at local noon to avoid timezone off-by-one errors.
  return value.length === 10
    ? new Date(`${value}T12:00:00`)
    : new Date(value)
}

export function formatPeso(value: number): string {
  return pesoFormatter.format(Number.isFinite(value) ? value : 0)
}

export function formatNumber(value: number): string {
  return numberFormatter.format(Number.isFinite(value) ? value : 0)
}

export function formatPesoCompact(value: number): string {
  const compact = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number.isFinite(value) ? value : 0)

  return compact.replace('₱', 'PHP ')
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = parseDate(value)
  if (Number.isNaN(date.getTime())) return '—'
  return shortDateFormatter.format(date)
}

export function formatLongDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = parseDate(value)
  if (Number.isNaN(date.getTime())) return '—'
  return longDateFormatter.format(date)
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return dateTimeFormatter.format(date)
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return timeFormatter.format(date)
}

export function formatRelativeTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const differenceInSeconds = Math.round((date.getTime() - Date.now()) / 1000)
  const thresholds: Array<{
    limit: number
    divisor: number
    unit: Intl.RelativeTimeFormatUnit
  }> = [
    { limit: 60, divisor: 1, unit: 'second' },
    { limit: 3600, divisor: 60, unit: 'minute' },
    { limit: 86400, divisor: 3600, unit: 'hour' },
    { limit: 604800, divisor: 86400, unit: 'day' },
    { limit: 2629800, divisor: 604800, unit: 'week' },
    { limit: 31557600, divisor: 2629800, unit: 'month' },
    { limit: Number.POSITIVE_INFINITY, divisor: 31557600, unit: 'year' },
  ]

  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  const threshold = thresholds.find(
    (item) => Math.abs(differenceInSeconds) < item.limit,
  )

  return formatter.format(
    Math.round(differenceInSeconds / (threshold?.divisor ?? 1)),
    threshold?.unit ?? 'second',
  )
}

export function percentage(part: number, whole: number): number {
  if (!whole) return 0
  return Math.round((part / whole) * 100)
}

export function todayIsoDate(): string {
  const date = new Date()
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

export function fileTimestamp(date = new Date()): string {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset)
    .toISOString()
    .slice(0, 10)
    .replaceAll('-', '')
}
