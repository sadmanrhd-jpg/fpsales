import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { AppSettings, CostEntry, SalesEntry } from '../types'
import { downloadFinancialReport } from '../lib/pdf'
import { downloadCsv, formatCurrency } from '../lib/utils'

export function ReportsPage({ sales, costs, settings, canExport }: { sales: SalesEntry[]; costs: CostEntry[]; settings: AppSettings; canExport: boolean }) {
  const today = new Date().toISOString().slice(0, 10)
  const monthStart = `${today.slice(0, 8)}01`
  const [startDate, setStartDate] = useState(monthStart)
  const [endDate, setEndDate] = useState(today)
  const filtered = useMemo(() => {
    const start = new Date(`${startDate}T00:00:00`).getTime()
    const end = new Date(`${endDate}T23:59:59`).getTime()
    return {
      sales: sales.filter((entry) => { const time = new Date(entry.occurredAt).getTime(); return time >= start && time <= end }),
      costs: costs.filter((entry) => { const time = new Date(entry.occurredAt).getTime(); return time >= start && time <= end }),
    }
  }, [sales, costs, startDate, endDate])
  const totalSales = filtered.sales.reduce((sum, item) => sum + item.amount, 0)
  const totalCosts = filtered.costs.reduce((sum, item) => sum + item.amount, 0)
  const exportPdf = () => downloadFinancialReport({ title: 'Selected date report', subtitle: `${startDate} to ${endDate}`, sales: filtered.sales, costs: filtered.costs, settings })
  const exportCsv = () => downloadCsv(`food_pavilion_${startDate}_${endDate}.csv`, [
    ...filtered.sales.map((entry) => ({ type: 'Sale', date: entry.occurredAt, category: entry.paymentMethod, description: entry.note, amount: entry.amount })),
    ...filtered.costs.map((entry) => ({ type: 'Cost', date: entry.occurredAt, category: entry.category, description: entry.description, amount: entry.amount })),
  ])
  return (
    <div className="page-stack">
      <section className="page-heading compact-heading"><div><span className="eyebrow">Financial reporting</span><h1>Reports</h1><p>Select a date range, review totals and export the records.</p></div></section>
      <section className="report-builder content-card">
        <div className="date-range-grid">
          <label className="field"><span>Start date</span><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
          <label className="field"><span>End date</span><input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
          <div className="report-export-actions">
            <button className="button secondary" disabled={!canExport} type="button" onClick={exportCsv}><FileSpreadsheet size={17} /> Export CSV</button>
            <button className="button primary" disabled={!canExport} type="button" onClick={exportPdf}><Download size={17} /> Download PDF</button>
          </div>
        </div>
        {!canExport && <p className="permission-note">Manager access can review reports. Admin access is required for exports.</p>}
      </section>
      <section className="summary-grid report-summary">
        <article className="summary-card sales-card"><span className="summary-icon"><FileText size={21} /></span><div><p>Selected sales</p><h2>{formatCurrency(totalSales, settings.currencyCode)}</h2><span>{filtered.sales.length} sales entries</span></div></article>
        <article className="summary-card costs-card"><span className="summary-icon"><FileText size={21} /></span><div><p>Selected costs</p><h2>{formatCurrency(totalCosts, settings.currencyCode)}</h2><span>{filtered.costs.length} cost entries</span></div></article>
        <article className="summary-card profit-card"><span className="summary-icon"><FileText size={21} /></span><div><p>Selected profit</p><h2>{formatCurrency(totalSales - totalCosts, settings.currencyCode)}</h2><span>Sales minus costs</span></div></article>
      </section>
    </div>
  )
}
