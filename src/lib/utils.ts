import type { FinancialEntry, PeriodFilter } from '../types'

export const formatCurrency = (amount: number, currency = 'BDT') =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)

export const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))

export const toDateTimeLocal = (iso: string) => {
  const date = new Date(iso)
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 16)
}

export const startForPeriod = (period: PeriodFilter, reference = new Date()) => {
  const start = new Date(reference)
  if (period === 'daily') {
    start.setHours(0, 0, 0, 0)
  } else if (period === 'weekly') {
    const day = start.getDay()
    const distance = day === 0 ? 6 : day - 1
    start.setDate(start.getDate() - distance)
    start.setHours(0, 0, 0, 0)
  } else {
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
  }
  return start
}

export const filterByPeriod = <T extends { occurredAt: string }>(entries: T[], period: PeriodFilter) => {
  const start = startForPeriod(period).getTime()
  return entries.filter((entry) => new Date(entry.occurredAt).getTime() >= start)
}

export const isWithinLast24Hours = (iso: string) => Date.now() - new Date(iso).getTime() <= 24 * 60 * 60 * 1000

export const sortNewest = <T extends { occurredAt: string }>(entries: T[]) =>
  [...entries].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())

export const entryLabel = (entry: FinancialEntry) =>
  entry.kind === 'sale' ? `${entry.paymentMethod} sale` : entry.category

export const randomId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`

export const downloadCsv = (filename: string, rows: Array<Record<string, string | number>>) => {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`
  const csv = [headers.map(escape).join(','), ...rows.map((row) => headers.map((header) => escape(row[header])).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
