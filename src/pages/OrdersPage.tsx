import { ClipboardCheck, Clock3, Minus, Plus, Printer, ReceiptText, ShoppingBag } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { printBillReceipt, printKotReceipt } from '../lib/receipt'
import { formatCurrency } from '../lib/utils'
import type { OngoingOrder, PaymentMethod, SalesEntry } from '../types'

interface OrdersPageProps {
  orders: OngoingOrder[]
  currency: string
  restaurantName: string
  branchName: string
  canCreate: boolean
  onUpdateOrder: (order: OngoingOrder) => void
  onCompleteOrder: (orderId: string, sale: Pick<SalesEntry, 'amount' | 'paymentMethod' | 'note' | 'occurredAt'>) => void
  onNotify: (message: string) => void
}

const tableOptions = Array.from({ length: 20 }, (_, index) => `Table ${String(index + 1).padStart(2, '0')}`)

export function OrdersPage({ orders, currency, restaurantName, branchName, canCreate, onUpdateOrder, onCompleteOrder, onNotify }: OrdersPageProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(() => orders[0]?.id ?? null)
  const selectedOrder = useMemo(() => orders.find((order) => order.id === selectedOrderId) ?? null, [orders, selectedOrderId])

  useEffect(() => {
    if (!orders.length) {
      setSelectedOrderId(null)
      return
    }
    if (!orders.some((order) => order.id === selectedOrderId)) setSelectedOrderId(orders[0].id)
  }, [orders, selectedOrderId])

  const updateOrder = (changes: Partial<OngoingOrder>) => {
    if (!selectedOrder) return
    const lines = changes.lines ?? selectedOrder.lines
    const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0)
    const requestedDiscount = changes.discount ?? selectedOrder.discount
    const discount = Math.max(0, Math.min(requestedDiscount, subtotal))
    onUpdateOrder({
      ...selectedOrder,
      ...changes,
      lines,
      subtotal,
      discount,
      total: Math.max(0, subtotal - discount),
      updatedAt: new Date().toISOString(),
    })
  }

  const changeQuantity = (itemId: string, change: number) => {
    if (!selectedOrder) return
    const lines = selectedOrder.lines
      .map((line) => line.itemId === itemId ? { ...line, quantity: line.quantity + change } : line)
      .filter((line) => line.quantity > 0)
    updateOrder({ lines })
  }

  const printKot = () => {
    if (!selectedOrder?.lines.length) return onNotify('This order has no food items.')
    const printed = printKotReceipt({
      restaurantName,
      branchName,
      orderNumber: selectedOrder.orderNumber,
      tableNumber: selectedOrder.tableNumber,
      lines: selectedOrder.lines,
    })
    if (!printed) return onNotify('The print window was blocked by the browser.')
    updateOrder({ status: 'KOT sent' })
    onNotify(`KOT for order #${String(selectedOrder.orderNumber).padStart(4, '0')} opened for printing.`)
  }

  const printBill = () => {
    if (!canCreate) return onNotify('You do not have permission to create a sale.')
    if (!selectedOrder?.lines.length) return onNotify('This order has no food items.')
    const printed = printBillReceipt({
      restaurantName,
      branchName,
      orderNumber: selectedOrder.orderNumber,
      tableNumber: selectedOrder.tableNumber,
      lines: selectedOrder.lines,
      currency,
      paymentMethod: selectedOrder.paymentMethod,
      subtotal: selectedOrder.subtotal,
      discount: selectedOrder.discount,
      total: selectedOrder.total,
    })
    if (!printed) return onNotify('The print window was blocked by the browser.')

    const itemSummary = selectedOrder.lines.map((line) => `${line.name} x ${line.quantity}`).join(', ')
    onCompleteOrder(selectedOrder.id, {
      amount: selectedOrder.total,
      paymentMethod: selectedOrder.paymentMethod,
      note: `Order #${String(selectedOrder.orderNumber).padStart(4, '0')}. ${selectedOrder.tableNumber}. ${itemSummary}. Subtotal ${formatCurrency(selectedOrder.subtotal, currency)}. Discount ${formatCurrency(selectedOrder.discount, currency)}.`,
      occurredAt: new Date().toISOString(),
    })
  }

  return (
    <div className="page-stack orders-page">
      <section className="page-heading compact-heading orders-heading">
        <div><span className="eyebrow">Kitchen orders</span><h1>Orders</h1><p>Review every KOT sent order that is still unpaid. Printing its bill completes the sale and removes the card from this page.</p></div>
        <div className="sales-order-stats"><span>Ongoing orders</span><strong>{orders.length}</strong></div>
      </section>

      {!orders.length ? <section className="content-card orders-empty-state"><ShoppingBag size={34} /><h2>No ongoing orders</h2><p>Orders appear here after Print KOT is used on the Sales page.</p></section> : <section className="orders-layout">
        <div className="orders-card-panel">
          <div className="orders-card-grid">
            {orders.map((order) => <button type="button" className={`ongoing-order-card ${selectedOrderId === order.id ? 'active' : ''}`} key={order.id} onClick={() => setSelectedOrderId(order.id)}>
              <div className="ongoing-order-card-top"><span>Order #{String(order.orderNumber).padStart(4, '0')}</span><strong>{order.tableNumber}</strong></div>
              <div className="ongoing-order-bill"><small>Bill</small><strong>{formatCurrency(order.total, currency)}</strong></div>
              <div className="ongoing-order-card-bottom"><span><ClipboardCheck size={15} /> {order.status}</span><time><Clock3 size={14} /> {new Date(order.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</time></div>
            </button>)}
          </div>
        </div>

        {selectedOrder && <aside className="sales-summary-card orders-summary-card">
          <div className="sales-summary-header"><div><span className="eyebrow">Order #{String(selectedOrder.orderNumber).padStart(4, '0')}</span><h2>Bill summary</h2></div><span className="order-status-pill"><ClipboardCheck size={14} /> {selectedOrder.status}</span></div>

          <label className="field sales-table-selector"><span>Table</span><select value={selectedOrder.tableNumber} onChange={(event) => updateOrder({ tableNumber: event.target.value })}>{tableOptions.map((table) => <option value={table} key={table}>{table}</option>)}</select></label>

          <div className="sales-cart-lines">
            {selectedOrder.lines.map((line, index) => <div className="sales-cart-line" key={line.itemId}>
              <span className="sales-cart-number">{String(index + 1).padStart(2, '0')}</span>
              <div><strong>{line.name}</strong><small>{formatCurrency(line.price, currency)} × {line.quantity}</small></div>
              <strong>{formatCurrency(line.price * line.quantity, currency)}</strong>
              <div className="sales-cart-controls"><button type="button" onClick={() => changeQuantity(line.itemId, -1)}><Minus size={13} /></button><span>{line.quantity}</span><button type="button" onClick={() => changeQuantity(line.itemId, 1)}><Plus size={13} /></button></div>
            </div>)}
          </div>

          <div className="sales-bill-fields">
            <label className="field"><span>Discount amount</span><input type="number" min="0" max={selectedOrder.subtotal} step="1" value={selectedOrder.discount || ''} onChange={(event) => updateOrder({ discount: Number(event.target.value) || 0 })} placeholder="0" /></label>
            <label className="field"><span>Payment method</span><select value={selectedOrder.paymentMethod} onChange={(event) => updateOrder({ paymentMethod: event.target.value as PaymentMethod })}><option>Cash</option><option>Card</option><option>Mobile Banking</option><option>Other</option></select></label>
          </div>

          <div className="sales-total-box">
            <div><span>Subtotal</span><strong>{formatCurrency(selectedOrder.subtotal, currency)}</strong></div>
            <div><span>Discount</span><strong>{formatCurrency(selectedOrder.discount, currency)}</strong></div>
            <div className="sales-grand-total"><span>Total</span><strong>{formatCurrency(selectedOrder.total, currency)}</strong></div>
          </div>

          <div className="sales-print-actions">
            <button className="button secondary" type="button" onClick={printKot} disabled={!selectedOrder.lines.length}><Printer size={18} /> Print KOT</button>
            <button className="button primary" type="button" onClick={printBill} disabled={!selectedOrder.lines.length || !canCreate}><ReceiptText size={18} /> Print bill</button>
          </div>
        </aside>}
      </section>}
    </div>
  )
}
