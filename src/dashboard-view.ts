import { loadCoreDashboard } from './services/dashboard'

type Helpers = {
  escapeHtml: (value: unknown) => string
  money: (value: number | string | null | undefined) => string
  dateTime: (value: string | null | undefined) => string
}

const attentionItem = (
  label: string,
  value: number,
  href: string,
  detail: string,
  tone = '',
) =>
  '<a class="attention-item ' + tone + '" href="' + href + '">' +
    '<span><b>' + label + '</b><small>' + detail + '</small></span>' +
    '<strong>' + value + '</strong>' +
  '</a>'

export function dashboardPageMarkup(email: string, escapeHtml: Helpers['escapeHtml']) {
  return '<section class="dashboard-head dashboard-head-compact"><div>' +
    '<span class="eyebrow">CORE COMMAND CENTER</span><h1 class="dashboard-title">Dashboard</h1>' +
    '<p class="copy">Live business status, priority work, money, customers, and fulfillment in one view.</p>' +
    '</div><div class="operator">Signed in as <strong>' + escapeHtml(email) + '</strong></div></section>' +
    '<section class="executive-dashboard" id="executive-dashboard"><div class="loading">Loading dashboard…</div></section>'
}

export async function bindDashboardPage(helpers: Helpers) {
  const root = document.querySelector<HTMLDivElement>('#executive-dashboard')
  if (!root) return

  try {
    const data = await loadCoreDashboard()
    const { attention, business, operations, customers, catalog } = data
    const attentionTotal = Object.values(attention).reduce((sum, value) => sum + value, 0)

    const fulfillmentRows = Object.entries(operations.fulfillment)
      .sort((a, b) => b[1] - a[1])
      .map(([status, count]) =>
        '<div class="dashboard-list-row"><span class="status-copy">' +
          '<strong>' + helpers.escapeHtml((status || 'unknown').replaceAll('_', ' ')) + '</strong>' +
        '</span><strong>' + count + '</strong></div>',
      )
      .join('')

    const paymentRows = operations.payment_mix.length
      ? operations.payment_mix.map(item =>
          '<div class="dashboard-list-row"><span><strong>' + helpers.escapeHtml(item.method) + '</strong>' +
          '<small>' + item.count + ' paid order' + (item.count === 1 ? '' : 's') + '</small></span>' +
          '<strong>' + helpers.money(item.amount) + '</strong></div>',
        ).join('')
      : '<p class="dashboard-muted">No paid payment data yet.</p>'

    const topRows = customers.top_customers.length
      ? customers.top_customers.map(customer =>
          '<div class="dashboard-list-row"><span><strong>' + helpers.escapeHtml(customer.name) + '</strong>' +
          '<small>' + helpers.escapeHtml(customer.customer_number || 'Customer') + ' · ' +
          customer.order_count + ' order' + (customer.order_count === 1 ? '' : 's') + '</small></span>' +
          '<strong>' + helpers.money(customer.paid_spend) + '</strong></div>',
        ).join('')
      : '<p class="dashboard-muted">No customer order history yet.</p>'

    const recentOrders = operations.recent_orders.length
      ? operations.recent_orders.slice(0, 6).map(order =>
          '<a class="dashboard-list-row dashboard-link-row" href="#orders"><span><strong>' +
          helpers.escapeHtml(order.order_number || 'Order') + '</strong><small>' +
          helpers.escapeHtml(order.status.replaceAll('_', ' ')) + ' · ' +
          helpers.escapeHtml(order.payment_status.replaceAll('_', ' ')) + '</small></span><strong>' +
          helpers.money(order.total) + '</strong></a>',
        ).join('')
      : '<p class="dashboard-muted">No recent orders.</p>'

    const quickLink = (href: string, label: string, detail: string) =>
      '<a class="dashboard-quick-link" href="' + href + '"><span><strong>' + label +
      '</strong><small>' + detail + '</small></span><b>→</b></a>'

    root.innerHTML =
      '<section class="dashboard-priority ' + (attentionTotal ? 'has-work' : 'clear') + '">' +
        '<div class="dashboard-priority-copy"><span class="eyebrow">PRIORITY</span><h2>' +
          (attentionTotal ? attentionTotal + ' items need attention' : 'Operations are clear') +
        '</h2><p>' +
          (attentionTotal
            ? 'Work the priority queue first, then move into fulfillment and customer follow-up.'
            : 'No immediate operational actions are waiting right now.') +
        '</p></div>' +
        '<a class="button primary dashboard-priority-action" href="#operations">' +
          (attentionTotal ? 'Open priority queue' : 'Open operations') +
        '</a>' +
      '</section>' +

      '<section class="dashboard-kpi-grid">' +
        '<article class="dashboard-kpi dashboard-kpi-featured"><span>Paid revenue</span><strong>' +
          helpers.money(business.paid_revenue) + '</strong><small>' + business.paid_orders + ' paid orders · all time</small></article>' +
        '<article class="dashboard-kpi"><span>Last 30 days</span><strong>' +
          helpers.money(business.revenue_30d) + '</strong><small>' + business.orders_30d + ' orders</small></article>' +
        '<article class="dashboard-kpi"><span>Average paid order</span><strong>' +
          helpers.money(business.average_paid_order) + '</strong><small>Across paid orders</small></article>' +
        '<article class="dashboard-kpi"><span>Customers</span><strong>' + business.customers +
          '</strong><small>' + business.active_customers + ' active · ' + business.new_customers_30d + ' new / 30d</small></article>' +
      '</section>' +

      '<section class="dashboard-attention-block">' +
        '<div class="dashboard-section-head"><div><span class="eyebrow">ACTION QUEUE</span><h2>Needs attention</h2></div>' +
          '<a href="#operations">View operations →</a></div>' +
        '<div class="attention-grid attention-grid-v2">' +
          attentionItem('Invoice approvals', attention.awaiting_invoice_approval, '#operations', 'Waiting for approval') +
          attentionItem('Ready to send', attention.ready_to_send, '#operations', 'Approved PDFs') +
          attentionItem('Payments to verify', attention.payment_submitted, '#operations', 'Submitted, not verified') +
          attentionItem('Delayed orders', attention.delayed_orders, '#operations', 'Fulfillment exceptions', attention.delayed_orders ? 'warning' : '') +
          attentionItem('Unpaid orders', attention.active_unpaid_orders, '#operations', 'Active, not recorded paid') +
          attentionItem('Catalog issues', attention.missing_coa + attention.uncategorized_products, '#catalog', 'Missing COA or category',
            attention.missing_coa + attention.uncategorized_products ? 'warning' : '') +
        '</div>' +
      '</section>' +

      '<div class="dashboard-primary-grid">' +
        '<section class="dashboard-panel dashboard-panel-tall"><div class="dashboard-section-head"><div><span class="eyebrow">RECENT ACTIVITY</span><h2>Latest orders</h2></div><a href="#orders">All orders →</a></div>' +
          recentOrders + '</section>' +
        '<section class="dashboard-panel"><div class="dashboard-section-head"><div><span class="eyebrow">FULFILLMENT</span><h2>Order stages</h2></div><a href="#operations">Manage →</a></div>' +
          (fulfillmentRows || '<p class="dashboard-muted">No fulfillment data.</p>') + '</section>' +
      '</div>' +

      '<div class="dashboard-secondary-grid">' +
        '<section class="dashboard-panel"><div class="dashboard-section-head"><div><span class="eyebrow">PAYMENTS</span><h2>Paid mix</h2></div><a href="#finance">Finance →</a></div>' +
          paymentRows + '</section>' +
        '<section class="dashboard-panel"><div class="dashboard-section-head"><div><span class="eyebrow">CUSTOMERS</span><h2>Top paid spend</h2></div><a href="#customers">Customers →</a></div>' +
          topRows + '</section>' +
        '<section class="dashboard-panel dashboard-health-panel"><div class="dashboard-section-head"><div><span class="eyebrow">CATALOG</span><h2>Readiness</h2></div><a href="#catalog">Catalog →</a></div>' +
          '<div class="dashboard-health-metrics">' +
            '<div><span>Active</span><strong>' + catalog.active + '</strong></div>' +
            '<div><span>Available</span><strong>' + catalog.available + '</strong></div>' +
            '<div><span>COA coverage</span><strong>' + catalog.with_coa + '/' + catalog.total + '</strong></div>' +
          '</div>' +
          '<p class="dashboard-health-note">' +
            catalog.missing_coa + ' missing COA · ' + catalog.uncategorized + ' uncategorized' +
          '</p>' +
        '</section>' +
      '</div>' +

      '<section class="dashboard-quick-links">' +
        quickLink('#operations', 'Operations', 'Invoices, payments, fulfillment') +
        quickLink('#finance', 'Finance', 'Revenue and receivables') +
        quickLink('#customers', 'Customers', 'Accounts and history') +
        quickLink('#catalog', 'Catalog', 'Products and readiness') +
      '</section>' +

      '<p class="dashboard-generated">Updated ' + helpers.escapeHtml(helpers.dateTime(data.generated_at)) + '</p>'
  } catch (error) {
    root.innerHTML = '<div class="empty-state error-state"><h2>Could not load dashboard.</h2><p>' +
      helpers.escapeHtml(error instanceof Error ? error.message : 'Unknown error') + '</p></div>'
  }
}
