import {
  CakeSlice,
  CupSoda,
  Drumstick,
  Minus,
  Pizza,
  Plus,
  Printer,
  ReceiptText,
  Search,
  ShoppingBag,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatCurrency } from '../lib/utils'
import type { MenuCategory, MenuItem, PaymentMethod, SalesEntry } from '../types'

interface SalesOrderPageProps {
  categories: MenuCategory[]
  items: MenuItem[]
  currency: string
  restaurantName: string
  branchName: string
  recentSales: SalesEntry[]
  canCreate: boolean
  onCompleteSale: (sale: Pick<SalesEntry, 'amount' | 'paymentMethod' | 'note' | 'occurredAt'>) => void
  onNotify: (message: string) => void
}

interface CartLine {
  item: MenuItem
  quantity: number
}

const categoryIcons = [Pizza, ShoppingBag, Drumstick, CakeSlice, CupSoda, UtensilsCrossed]

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;')

function openPrintWindow(title: string, body: string) {
  const printWindow = window.open('', '_blank', 'width=460,height=720')
  if (!printWindow) return false
  printWindow.document.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title><style>
    body{font-family:Arial,sans-serif;color:#111;padding:22px;margin:0}.receipt{max-width:360px;margin:0 auto}
    h1{font-size:20px;margin:0 0 4px;text-align:center}h2{font-size:14px;margin:0 0 18px;text-align:center;font-weight:400}
    .meta{font-size:11px;line-height:1.6;border-top:1px dashed #777;border-bottom:1px dashed #777;padding:9px 0;margin-bottom:10px}
    table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:7px 0;text-align:left;border-bottom:1px dotted #bbb}th:last-child,td:last-child{text-align:right}
    .totals{margin-top:12px;font-size:12px}.totals div{display:flex;justify-content:space-between;padding:4px 0}.totals .grand{font-size:15px;font-weight:700;border-top:1px dashed #777;margin-top:5px;padding-top:9px}
    .footer{text-align:center;font-size:10px;margin-top:22px;color:#555}@media print{body{padding:0}}
  </style></head><body><div class="receipt">${body}</div><script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}</script></body></html>`)
  printWindow.document.close()
  return true
}

export function SalesOrderPage({ categories, items, currency, restaurantName, branchName, recentSales, canCreate, onCompleteSale, onNotify }: SalesOrderPageProps) {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [cart, setCart] = useState<CartLine[]>([])
  const [discountInput, setDiscountInput] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash')

  const activeCategories = useMemo(() => categories.filter((category) => category.active), [categories])
  const availableItems = useMemo(() => items.filter((item) => item.available), [items])
  const filteredItems = useMemo(() => availableItems.filter((item) => {
    const categoryMatch = selectedCategory === 'all' || item.categoryId === selectedCategory
    const queryMatch = `${item.name} ${item.description}`.toLowerCase().includes(query.trim().toLowerCase())
    return categoryMatch && queryMatch
  }), [availableItems, selectedCategory, query])

  const subtotal = useMemo(() => cart.reduce((sum, line) => sum + line.item.price * line.quantity, 0), [cart])
  const numericDiscount = Number(discountInput)
  const discount = Number.isFinite(numericDiscount) ? Math.max(0, Math.min(numericDiscount, subtotal)) : 0
  const total = Math.max(0, subtotal - discount)

  const addItem = (item: MenuItem) => {
    setCart((current) => {
      const existing = current.find((line) => line.item.id === item.id)
      if (existing) return current.map((line) => line.item.id === item.id ? { ...line, quantity: line.quantity + 1 } : line)
      return [...current, { item, quantity: 1 }]
    })
  }

  const changeQuantity = (itemId: string, change: number) => {
    setCart((current) => current
      .map((line) => line.item.id === itemId ? { ...line, quantity: line.quantity + change } : line)
      .filter((line) => line.quantity > 0))
  }

  const clearOrder = () => {
    setCart([])
    setDiscountInput('')
    setPaymentMethod('Cash')
  }

  const orderRows = cart.map((line) => `<tr><td>${escapeHtml(line.item.name)} × ${line.quantity}</td><td>${escapeHtml(formatCurrency(line.item.price * line.quantity, currency))}</td></tr>`).join('')
  const kotRows = cart.map((line) => `<tr><td>${escapeHtml(line.item.name)}</td><td>${line.quantity}</td></tr>`).join('')

  const printKot = () => {
    if (!cart.length) return onNotify('Add at least one food item before printing the KOT.')
    const printed = openPrintWindow('Kitchen Order Ticket', `
      <h1>${escapeHtml(restaurantName)}</h1><h2>${escapeHtml(branchName)} · Kitchen Order Ticket</h2>
      <div class="meta"><strong>Order time:</strong> ${escapeHtml(new Date().toLocaleString('en-GB'))}</div>
      <table><thead><tr><th>Food item</th><th>Quantity</th></tr></thead><tbody>${kotRows}</tbody></table>
      <p class="footer">Kitchen copy</p>`)
    if (printed) onNotify('KOT opened for printing.')
    else onNotify('The print window was blocked by the browser.')
  }

  const printBill = () => {
    if (!canCreate) return onNotify('You do not have permission to create a sale.')
    if (!cart.length) return onNotify('Add at least one food item before printing the bill.')
    const printed = openPrintWindow('Customer Bill', `
      <h1>${escapeHtml(restaurantName)}</h1><h2>${escapeHtml(branchName)} · Customer Bill</h2>
      <div class="meta"><strong>Date:</strong> ${escapeHtml(new Date().toLocaleString('en-GB'))}<br><strong>Payment:</strong> ${escapeHtml(paymentMethod)}</div>
      <table><thead><tr><th>Food item</th><th>Amount</th></tr></thead><tbody>${orderRows}</tbody></table>
      <div class="totals"><div><span>Subtotal</span><strong>${escapeHtml(formatCurrency(subtotal, currency))}</strong></div><div><span>Discount</span><strong>${escapeHtml(formatCurrency(discount, currency))}</strong></div><div class="grand"><span>Total</span><span>${escapeHtml(formatCurrency(total, currency))}</span></div></div>
      <p class="footer">Thank you for visiting ${escapeHtml(restaurantName)}</p>`)
    if (!printed) return onNotify('The print window was blocked by the browser.')

    const itemSummary = cart.map((line) => `${line.item.name} x ${line.quantity}`).join(', ')
    onCompleteSale({
      amount: total,
      paymentMethod,
      note: `${itemSummary}. Subtotal ${formatCurrency(subtotal, currency)}. Discount ${formatCurrency(discount, currency)}.`,
      occurredAt: new Date().toISOString(),
    })
    clearOrder()
  }

  return (
    <div className="page-stack sales-order-page">
      <section className="page-heading compact-heading sales-order-heading">
        <div><span className="eyebrow">Point of sale</span><h1>Sales</h1><p>Select foods, review the bill summary, apply a discount and print the kitchen or customer copy.</p></div>
        <div className="sales-order-stats"><span>Available foods</span><strong>{availableItems.length}</strong></div>
      </section>

      <section className="sales-pos-layout">
        <div className="sales-food-panel">
          <div className="sales-category-grid">
            <button type="button" className={`sales-category-card ${selectedCategory === 'all' ? 'active' : ''}`} onClick={() => setSelectedCategory('all')}>
              <span className="sales-category-icon"><UtensilsCrossed size={23} /></span><strong>All foods</strong><small>{availableItems.length} items</small>
            </button>
            {activeCategories.map((category, index) => {
              const Icon = categoryIcons[index % categoryIcons.length]
              const count = availableItems.filter((item) => item.categoryId === category.id).length
              return <button type="button" className={`sales-category-card ${selectedCategory === category.id ? 'active' : ''}`} onClick={() => setSelectedCategory(category.id)} key={category.id}><span className="sales-category-icon"><Icon size={24} /></span><strong>{category.name}</strong><small>{count} items</small></button>
            })}
          </div>

          <div className="sales-food-toolbar">
            <div><span className="eyebrow">Food selection</span><h2>{selectedCategory === 'all' ? 'All menu items' : activeCategories.find((category) => category.id === selectedCategory)?.name}</h2></div>
            <div className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search foods" /></div>
          </div>

          <div className="sales-food-grid">
            {filteredItems.map((item) => {
              const quantity = cart.find((line) => line.item.id === item.id)?.quantity ?? 0
              return <article className={`sales-food-card ${quantity ? 'selected' : ''}`} key={item.id}>
                <button className="sales-food-card-main" type="button" onClick={() => addItem(item)}>
                  <span className="sales-food-illustration"><UtensilsCrossed size={24} /></span>
                  <span className="sales-food-copy"><small>{activeCategories.find((category) => category.id === item.categoryId)?.name ?? 'Food'}</small><strong>{item.name}</strong><em>{formatCurrency(item.price, currency)}</em></span>
                  <Plus size={18} />
                </button>
                {quantity > 0 && <div className="sales-food-quantity"><button type="button" onClick={() => changeQuantity(item.id, -1)} aria-label={`Remove one ${item.name}`}><Minus size={15} /></button><span>{quantity}</span><button type="button" onClick={() => changeQuantity(item.id, 1)} aria-label={`Add one ${item.name}`}><Plus size={15} /></button></div>}
              </article>
            })}
            {!filteredItems.length && <div className="sales-food-empty"><UtensilsCrossed size={30} /><strong>No foods found</strong><span>Try another category or search term.</span></div>}
          </div>
        </div>

        <aside className="sales-summary-card">
          <div className="sales-summary-header"><div><span className="eyebrow">Current order</span><h2>Bill summary</h2></div><button className="icon-button" type="button" onClick={clearOrder} disabled={!cart.length} title="Clear order"><Trash2 size={18} /></button></div>

          <div className="sales-cart-lines">
            {!cart.length ? <div className="sales-cart-empty"><ShoppingBag size={27} /><strong>No food selected</strong><span>Choose an item from the menu to start an order.</span></div> : cart.map((line, index) => <div className="sales-cart-line" key={line.item.id}>
              <span className="sales-cart-number">{String(index + 1).padStart(2, '0')}</span>
              <div><strong>{line.item.name}</strong><small>{formatCurrency(line.item.price, currency)} × {line.quantity}</small></div>
              <strong>{formatCurrency(line.item.price * line.quantity, currency)}</strong>
              <div className="sales-cart-controls"><button type="button" onClick={() => changeQuantity(line.item.id, -1)}><Minus size={13} /></button><span>{line.quantity}</span><button type="button" onClick={() => changeQuantity(line.item.id, 1)}><Plus size={13} /></button></div>
            </div>)}
          </div>

          <div className="sales-bill-fields">
            <label className="field"><span>Discount amount</span><input type="number" min="0" max={subtotal} step="1" value={discountInput} onChange={(event) => setDiscountInput(event.target.value)} placeholder="0" /></label>
            <label className="field"><span>Payment method</span><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}><option>Cash</option><option>Card</option><option>Mobile Banking</option><option>Other</option></select></label>
          </div>

          <div className="sales-total-box">
            <div><span>Subtotal</span><strong>{formatCurrency(subtotal, currency)}</strong></div>
            <div><span>Discount</span><strong>{formatCurrency(discount, currency)}</strong></div>
            <div className="sales-grand-total"><span>Total</span><strong>{formatCurrency(total, currency)}</strong></div>
          </div>

          <div className="sales-print-actions">
            <button className="button secondary" type="button" onClick={printKot} disabled={!cart.length}><Printer size={18} /> Print KOT</button>
            <button className="button primary" type="button" onClick={printBill} disabled={!cart.length || !canCreate}><ReceiptText size={18} /> Print bill</button>
          </div>
        </aside>
      </section>

      <section className="content-card sales-recent-card">
        <div className="section-heading"><div><span className="eyebrow">Recorded sales</span><h2>Recent completed bills</h2></div><span className="section-count">{recentSales.length} entries</span></div>
        {!recentSales.length ? <p className="sales-recent-empty">Printed bills will appear here after the sale is recorded.</p> : <div className="sales-recent-list">{recentSales.slice(0, 8).map((sale) => <div key={sale.id}><span>{new Date(sale.occurredAt).toLocaleString('en-GB')}</span><strong>{sale.paymentMethod}</strong><em>{formatCurrency(sale.amount, currency)}</em></div>)}</div>}
      </section>
    </div>
  )
}
