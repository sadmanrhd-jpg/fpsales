import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { AppSettings, CostEntry, SalesEntry } from '../types'
import { formatCurrency, formatDateTime } from './utils'

interface ReportInput {
  title: string
  subtitle: string
  sales: SalesEntry[]
  costs: CostEntry[]
  settings: AppSettings
}

export function downloadFinancialReport({ title, subtitle, sales, costs, settings }: ReportInput) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const totalSales = sales.reduce((sum, entry) => sum + entry.amount, 0)
  const totalCosts = costs.reduce((sum, entry) => sum + entry.amount, 0)
  const profit = totalSales - totalCosts

  doc.setFillColor(67, 88, 79)
  doc.rect(0, 0, 595, 92, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.text(settings.restaurantName, 40, 42)
  doc.setFontSize(11)
  doc.text(`${settings.branchName} | ${title}`, 40, 65)

  doc.setTextColor(38, 45, 42)
  doc.setFontSize(10)
  doc.text(subtitle, 40, 118)

  const cards = [
    ['Total sales', formatCurrency(totalSales, settings.currencyCode)],
    ['Total costs', formatCurrency(totalCosts, settings.currencyCode)],
    ['Profit', formatCurrency(profit, settings.currencyCode)],
  ]
  cards.forEach(([label, value], index) => {
    const x = 40 + index * 175
    doc.setFillColor(246, 244, 239)
    doc.roundedRect(x, 138, 160, 62, 6, 6, 'F')
    doc.setFontSize(9)
    doc.setTextColor(97, 104, 100)
    doc.text(label, x + 12, 160)
    doc.setFontSize(13)
    doc.setTextColor(35, 43, 39)
    doc.text(value, x + 12, 184)
  })

  doc.setFontSize(13)
  doc.text('Sales', 40, 232)
  autoTable(doc, {
    startY: 244,
    head: [['Date and time', 'Payment method', 'Note', 'Amount']],
    body: sales.map((entry) => [formatDateTime(entry.occurredAt), entry.paymentMethod, entry.note || 'None', formatCurrency(entry.amount, settings.currencyCode)]),
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 5 },
    headStyles: { fillColor: [67, 88, 79] },
    columnStyles: { 3: { halign: 'right' } },
  })

  const salesTableEnd = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 270
  doc.setFontSize(13)
  doc.text('Costs', 40, salesTableEnd + 30)
  autoTable(doc, {
    startY: salesTableEnd + 42,
    head: [['Date and time', 'Category', 'Description', 'Amount']],
    body: costs.map((entry) => [formatDateTime(entry.occurredAt), entry.category, entry.description, formatCurrency(entry.amount, settings.currencyCode)]),
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 5 },
    headStyles: { fillColor: [187, 151, 96] },
    columnStyles: { 3: { halign: 'right' } },
  })

  const safeTitle = title.toLowerCase().replaceAll(/[^a-z0-9]+/g, '_').replaceAll(/^_|_$/g, '')
  doc.save(`food_pavilion_${safeTitle}_report.pdf`)
}
