import { ArrowDownRight, ArrowUpRight, CircleDollarSign, Download, Plus, ReceiptText, TrendingUp } from 'lucide-react'
import type { AppUser, CostEntry, FinancialEntry, PeriodFilter, SalesEntry } from '../types'
import { filterByPeriod, formatCurrency, sortNewest } from '../lib/utils'
import { PeriodTabs } from '../components/PeriodTabs'
import { EntryTable } from '../components/EntryTable'

interface DashboardProps {
  period: PeriodFilter
  onPeriodChange: (period: PeriodFilter) => void
  sales: SalesEntry[]
  costs: CostEntry[]
  users: AppUser[]
  currency: string
  receptionMode: boolean
  canExport: boolean
  canEdit: (entry: FinancialEntry) => boolean
  onAddSale: () => void
  onAddCost: () => void
  onEdit: (entry: FinancialEntry) => void
  onView: (entry: FinancialEntry) => void
  onExport: () => void
}

export function DashboardPage(props: DashboardProps) {
  const { period, onPeriodChange, sales, costs, users, currency, receptionMode, canExport, canEdit, onAddSale, onAddCost, onEdit, onView, onExport } = props
  const periodSales = filterByPeriod(sales, period)
  const periodCosts = filterByPeriod(costs, period)
  const totalSales = periodSales.reduce((sum, item) => sum + item.amount, 0)
  const totalCosts = periodCosts.reduce((sum, item) => sum + item.amount, 0)
  const profit = totalSales - totalCosts
  const activity = sortNewest<FinancialEntry>([...periodSales, ...periodCosts]).slice(0, 8)
  const label = period === 'daily' ? 'today' : period === 'weekly' ? 'this week' : 'this month'

  return (
    <div className="page-stack">
      <section className="page-heading dashboard-heading">
        <div>
          <span className="eyebrow">Financial overview</span>
          <h1>Good day, here is your restaurant summary.</h1>
          <p>Track every sale, cost and correction from one clear workspace.</p>
        </div>
        <div className="heading-actions">
          {canExport && <button className="button secondary" type="button" onClick={onExport}><Download size={17} /> Download PDF</button>}
          <PeriodTabs value={period} onChange={onPeriodChange} disabledHistory={receptionMode} />
        </div>
      </section>

      <section className="summary-grid">
        <article className="summary-card sales-card">
          <span className="summary-icon"><ArrowUpRight size={22} /></span>
          <div><p>Total sales {label}</p><h2>{formatCurrency(totalSales, currency)}</h2><span>{periodSales.length} entries recorded</span></div>
        </article>
        <article className="summary-card costs-card">
          <span className="summary-icon"><ArrowDownRight size={22} /></span>
          <div><p>Total costs {label}</p><h2>{formatCurrency(totalCosts, currency)}</h2><span>{periodCosts.length} expenses recorded</span></div>
        </article>
        <article className={`summary-card profit-card ${profit < 0 ? 'negative' : ''}`}>
          <span className="summary-icon"><TrendingUp size={22} /></span>
          <div><p>Profit {label}</p><h2>{formatCurrency(profit, currency)}</h2><span>Sales minus total costs</span></div>
        </article>
      </section>

      <section className="quick-actions-card">
        <div>
          <span className="eyebrow">Quick entry</span>
          <h2>Add today’s transaction</h2>
          <p>Choose the entry type and complete one short form.</p>
        </div>
        <div className="quick-action-buttons">
          <button className="quick-action sale" type="button" onClick={onAddSale}><span><CircleDollarSign size={22} /></span><div><strong>Add sale</strong><small>Cash, card or mobile banking</small></div><Plus size={20} /></button>
          <button className="quick-action cost" type="button" onClick={onAddCost}><span><ReceiptText size={22} /></span><div><strong>Add cost</strong><small>Bills, purchases and expenses</small></div><Plus size={20} /></button>
        </div>
      </section>

      <section className="content-card">
        <div className="section-heading"><div><span className="eyebrow">Latest activity</span><h2>Recent sales and costs</h2></div><span className="section-count">{activity.length} shown</span></div>
        <EntryTable entries={activity} users={users} currency={currency} canEdit={canEdit} onEdit={onEdit} onView={onView} />
      </section>
    </div>
  )
}
