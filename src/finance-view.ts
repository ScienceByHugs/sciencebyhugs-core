import { loadCoreFinance } from './services/finance'

type Helpers = {
  escapeHtml: (value: unknown) => string
  money: (value: number | string | null | undefined) => string
  dateTime: (value: string | null | undefined) => string
}

export function financePageMarkup(email: string, escapeHtml: Helpers['escapeHtml']) {
  return '<section class="dashboard-head"><div>' +
    '<span class="eyebrow">FINANCIAL OPERATIONS</span><h1 class="dashboard-title">Finance</h1>' +
    '<p class="copy">Recorded revenue, receivables, payment review, invoice aging, and fulfillment-linked cash visibility. This is operational reporting, not bank reconciliation.</p>' +
    '</div><div class="operator">Signed in as <strong>' + escapeHtml(email) + '</strong></div></section>' +
    '<section id="finance-root"><div class="loading">Loading finance…</div></section>'
}

const rows = (items: string[]) => items.length ? items.join('') : '<p class="dashboard-muted">Nothing to show.</p>'

export async function bindFinancePage(helpers: Helpers) {
  const root = document.querySelector<HTMLDivElement>('#finance-root')
  if (!root) return

  try {
    const data = await loadCoreFinance()
    const s = data.summary

    root.innerHTML =
      '<section class="finance-kpis">' +
        '<div><span>Paid revenue</span><strong>' + helpers.money(s.paid_revenue) + '</strong><small>' + s.paid_orders + ' paid orders</small></div>' +
        '<div><span>Open order value</span><strong>' + helpers.money(s.open_order_value) + '</strong><small>Not recorded as paid</small></div>' +
        '<div><span>Sent unpaid invoices</span><strong>' + helpers.money(s.sent_unpaid_invoice_value) + '</strong><small>Invoice receivables</small></div>' +
        '<div><span>Payment review</span><strong>' + helpers.money(s.payment_review_value) + '</strong><small>' + s.payment_review_count + ' submissions</small></div>' +
        '<div><span>Paid / unfulfilled</span><strong>' + s.unfulfilled_paid_orders + '</strong><small>' + s.delivered_paid_orders + ' delivered</small></div>' +
        '<div><span>Verified records</span><strong>' + helpers.money(s.verified_payment_total) + '</strong><small>' + s.verified_payment_records + ' payment records</small></div>' +
      '</section>' +

      '<div class="finance-columns">' +
        '<section class="finance-panel"><div class="dashboard-section-head"><div><span class="eyebrow">RECEIVABLES</span><h2>Invoice aging</h2></div><a href="#operations">Operations →</a></div>' +
          rows(data.aging.map(item =>
            '<div class="finance-row"><span><strong>' + helpers.escapeHtml(item.invoice_number) + '</strong><small>' +
            helpers.escapeHtml(item.customer_name) + '</small></span><span>' + helpers.escapeHtml(item.bucket) +
            '<small>' + item.age_days + ' days</small></span><strong>' + helpers.money(item.total) + '</strong></div>'
          )) +
        '</section>' +

        '<section class="finance-panel"><div class="dashboard-section-head"><div><span class="eyebrow">PAYMENT REVIEW</span><h2>Submitted, not verified</h2></div><a href="#operations">Review →</a></div>' +
          rows(data.payment_review.map(item =>
            '<div class="finance-row"><span><strong>' + helpers.escapeHtml(item.customer_name) + '</strong><small>' +
            helpers.escapeHtml(item.provider || 'Unspecified') + '</small></span><span>' +
            helpers.escapeHtml(helpers.dateTime(item.submitted_at)) + '</span><strong>' + helpers.money(item.amount) + '</strong></div>'
          )) +
        '</section>' +
      '</div>' +

      '<div class="finance-columns">' +
        '<section class="finance-panel"><div class="dashboard-section-head"><div><span class="eyebrow">COLLECTIONS</span><h2>Payment method mix</h2></div></div>' +
          rows(data.payment_mix.map(item =>
            '<div class="finance-row"><span><strong>' + helpers.escapeHtml(item.method) + '</strong></span><span>' +
            item.count + ' paid orders</span><strong>' + helpers.money(item.amount) + '</strong></div>'
          )) +
        '</section>' +

        '<section class="finance-panel"><div class="dashboard-section-head"><div><span class="eyebrow">CUSTOMERS</span><h2>Outstanding order value</h2></div><a href="#customers">Customers →</a></div>' +
          rows(data.unpaid_customers.map(item =>
            '<div class="finance-row"><span><strong>' + helpers.escapeHtml(item.name) + '</strong></span><span>' +
            item.count + ' open orders</span><strong>' + helpers.money(item.total) + '</strong></div>'
          )) +
        '</section>' +
      '</div>' +

      '<section class="finance-panel"><div class="dashboard-section-head"><div><span class="eyebrow">HISTORY</span><h2>Monthly paid revenue</h2></div></div>' +
        rows(data.monthly.map(item =>
          '<div class="finance-row"><span><strong>' + helpers.escapeHtml(item.month) + '</strong></span><span>' +
          item.orders + ' paid orders</span><strong>' + helpers.money(item.revenue) + '</strong></div>'
        )) +
      '</section>' +
      '<p class="dashboard-generated">Finance generated ' + helpers.escapeHtml(helpers.dateTime(data.generated_at)) + '</p>'
  } catch (error) {
    root.innerHTML = '<div class="empty-state error-state"><h2>Could not load finance.</h2><p>' +
      helpers.escapeHtml(error instanceof Error ? error.message : 'Unknown error') + '</p></div>'
  }
}
