import { formatCurrency } from './utils'
import type { OrderLine, PaymentMethod } from '../types'

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;')

export function preparePrintWindow() {
  return window.open('', '_blank', 'width=460,height=720')
}

function renderPrintWindow(printWindow: Window | null, title: string, body: string) {
  if (!printWindow) return false
  printWindow.document.open()
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

interface KotReceiptInput {
  restaurantName: string
  branchName: string
  orderNumber: number
  tableNumber: string
  lines: OrderLine[]
}

export function printKotReceipt({ restaurantName, branchName, orderNumber, tableNumber, lines }: KotReceiptInput, preparedWindow?: Window | null): boolean {
  const rows = lines.map((line) => `<tr><td>${escapeHtml(line.name)}</td><td>${line.quantity}</td></tr>`).join('')
  return renderPrintWindow(preparedWindow ?? preparePrintWindow(), 'Kitchen Order Ticket', `
    <h1>${escapeHtml(restaurantName)}</h1><h2>${escapeHtml(branchName)} · Kitchen Order Ticket</h2>
    <div class="meta"><strong>Order:</strong> #${String(orderNumber).padStart(4, '0')}<br><strong>Table:</strong> ${escapeHtml(tableNumber)}<br><strong>Order time:</strong> ${escapeHtml(new Date().toLocaleString('en-GB'))}</div>
    <table><thead><tr><th>Food item</th><th>Quantity</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="footer">Kitchen copy</p>`)
}

interface BillReceiptInput {
  restaurantName: string
  branchName: string
  orderNumber?: number
  tableNumber: string
  lines: OrderLine[]
  currency: string
  paymentMethod: PaymentMethod
  subtotal: number
  discount: number
  total: number
}

export function printBillReceipt({ restaurantName, branchName, orderNumber, tableNumber, lines, currency, paymentMethod, subtotal, discount, total }: BillReceiptInput, preparedWindow?: Window | null): boolean {
  const rows = lines.map((line) => `<tr><td>${escapeHtml(line.name)} × ${line.quantity}</td><td>${escapeHtml(formatCurrency(line.price * line.quantity, currency))}</td></tr>`).join('')
  const orderMeta = orderNumber ? `<strong>Order:</strong> #${String(orderNumber).padStart(4, '0')}<br>` : ''
  return renderPrintWindow(preparedWindow ?? preparePrintWindow(), 'Customer Bill', `
    <h1>${escapeHtml(restaurantName)}</h1><h2>${escapeHtml(branchName)} · Customer Bill</h2>
    <div class="meta">${orderMeta}<strong>Table:</strong> ${escapeHtml(tableNumber)}<br><strong>Date:</strong> ${escapeHtml(new Date().toLocaleString('en-GB'))}<br><strong>Payment:</strong> ${escapeHtml(paymentMethod)}</div>
    <table><thead><tr><th>Food item</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="totals"><div><span>Subtotal</span><strong>${escapeHtml(formatCurrency(subtotal, currency))}</strong></div><div><span>Discount</span><strong>${escapeHtml(formatCurrency(discount, currency))}</strong></div><div class="grand"><span>Total</span><span>${escapeHtml(formatCurrency(total, currency))}</span></div></div>
    <p class="footer">Thank you for visiting ${escapeHtml(restaurantName)}</p>`)
}
