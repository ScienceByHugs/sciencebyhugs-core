import { loadCoreDashboard } from './services/dashboard'

type Helpers = {
  escapeHtml: (value: unknown) => string
  money: (value: number | string | null | undefined) => string
  dateTime: (value: string | null | undefined) => string
}

const attentionItem = (label: string, value: number, href: string, tone = '') =>
  '<a class="attention-item ' + tone + '" href="' + href + '"><span>' + label + '</span><strong>' + value + '</strong></a>'

export function dashboardPageMarkup(email: string, escapeHtml: Helpers['escapeHtml']) {
  return '<section class="dashboard-head"><div>' +
    '<span class="eyebrow">EXECUTIVE COMMAND CENTER</span><h1 class="dashboard-title">Business Dashboard</h1>' +
    '<p class="copy">The operational truth: money, customers, fulfillment, referrals, catalog health, and anything that needs attention.</p>' +
    '</div><div class="operator">Signed in as <strong>' + escapeHtml(email) + '</strong></div></section>' +
    '<section class="executive-dashboard" id="executive-dashboard"><div class="loading">Loading business dashboard…</div></section>'
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
      .map(([status, count]) => '<div class="dashboard-list-row"><span>' + helpers.escapeHtml(status || 'unknown') + '</span><strong>' + count + '</strong></div>')
      .join('')
    const paymentRows = operations.payment_mix.length
      ? operations.payment_mix.map(item => '<div class="dashboard-list-row"><span>' + helpers.escapeHtml(item.method) + '</span><span>' + item.count + ' orders</span><strong>' + helpers.money(item.amount) + '</strong></div>').join('')
      : '<p class="dashboard-muted">No paid payment data yet.</p>'
    const membershipRows = customers.membership_mix
      .map(item => '<div class="dashboard-list-row"><span>' + helpers.escapeHtml(item.membership) + '</span><strong>' + item.count + '</strong></div>')
      .join('')
    const topRows = customers.top_customers.length
      ? customers.top_customers.map(customer => '<div class="dashboard-list-row"><span>' + helpers.escapeHtml(customer.name) +
          (customer.customer_number ? ' <small>' + helpers.escapeHtml(customer.customer_number) + '</small>' : '') +
          '</span><span>' + customer.order_count + ' orders</span><strong>' + helpers.money(customer.paid_spend) + '</strong></div>').join('')
      : '<p class="dashboard-muted">No customer order history yet.</p>'
    const recentOrders = operations.recent_orders.length
      ? operations.recent_orders.map(order => '<a class="dashboard-list-row dashboard-link-row" href="#orders"><span>' +
          helpers.escapeHtml(order.order_number || 'Order') + '</span><span>' +
          helpers.escapeHtml(order.status) + ' · ' + helpers.escapeHtml(order.payment_status) +
          '</span><strong>' + helpers.money(order.total) + '</strong></a>').join('')
      : '<p class="dashboard-muted">No recent orders.</p>'

    root.innerHTML =
      '<section class="dashboard-attention ' + (attentionTotal ? 'has-work' : 'clear') + '">' +
        '<div class="dashboard-section-head"><div><span class="eyebrow">NEEDS ATTENTION</span><h2>' +
          (attentionTotal ? attentionTotal + ' operational signals' : 'Queue clear') + '</h2></div>' +
          '<a href="#operations">Open Operations →</a></div>' +
        '<div class="attention-grid">' +
          attentionItem('Invoice approvals', attention.awaiting_invoice_approval, '#operations') +
          attentionItem('Ready to send', attention.ready_to_send, '#operations') +
          attentionItem('Payments to verify', attention.payment_submitted, '#operations') +
          attentionItem('Delayed orders', attention.delayed_orders, '#operations', attention.delayed_orders ? 'warning' : '') +
          attentionItem('Unpaid orders', attention.active_unpaid_orders, '#operations') +
          attentionItem('Missing COAs', attention.missing_coa, '#catalog', attention.missing_coa ? 'warning' : '') +
          attentionItem('Uncategorized', attention.uncategorized_products, '#catalog') +
        '</div>' +
      '</section>' +

      '<section class="executive-kpis">' +
        '<div><span>Paid revenue</span><strong>' + helpers.money(business.paid_revenue) + '</strong><small>All time</small></div>' +
        '<div><span>30-day revenue</span><strong>' + helpers.money(business.revenue_30d) + '</strong><small>' + business.orders_30d + ' orders</small></div>' +
        '<div><span>Average paid order</span><strong>' + helpers.money(business.average_paid_order) + '</strong><small>' + business.paid_orders + ' paid orders</small></div>' +
        '<div><span>Customers</span><strong>' + business.customers + '</strong><small>' + business.active_customers + ' active</small></div>' +
        '<div><span>Repeat customers</span><strong>' + business.repeat_customers + '</strong><small>' + business.new_customers_30d + ' new / 30d</small></div>' +
        '<div><span>7-day revenue</span><strong>' + helpers.money(business.revenue_7d) + '</strong><small>' + business.orders_7d + ' orders</small></div>' +
      '</section>' +

      '<div class="dashboard-columns">' +
        '<section class="dashboard-panel"><div class="dashboard-section-head"><div><span class="eyebrow">OPERATIONS</span><h2>Fulfillment</h2></div><a href="#orders">Orders →</a></div>' +
          (fulfillmentRows || '<p class="dashboard-muted">No fulfillment data.</p>') + '</section>' +
        '<section class="dashboard-panel"><div class="dashboard-section-head"><div><span class="eyebrow">PAYMENTS</span><h2>Payment mix</h2></div></div>' + paymentRows + '</section>' +
      '</div>' +

      '<div class="dashboard-columns">' +
        '<section class="dashboard-panel"><div class="dashboard-section-head"><div><span class="eyebrow">CUSTOMERS</span><h2>Membership mix</h2></div><a href="#customers">Customers →</a></div>' +
          membershipRows +
          '<div class="dashboard-mini-kpis"><span>Referrals <strong>' + customers.referrals_total + '</strong></span><span>Qualified <strong>' + customers.qualified_referrals + '</strong></span><span>Available rewards <strong>' + customers.available_rewards + '</strong></span></div></section>' +
        '<section class="dashboard-panel"><div class="dashboard-section-head"><div><span class="eyebrow">CUSTOMER VALUE</span><h2>Top paid spend</h2></div></div>' + topRows + '</section>' +
      '</div>' +

      '<section class="dashboard-panel"><div class="dashboard-section-head"><div><span class="eyebrow">CATALOG HEALTH</span><h2>Product readiness</h2></div><a href="#catalog">Catalog →</a></div>' +
        '<div class="catalog-health-grid">' +
          '<div><span>Products</span><strong>' + catalog.total + '</strong></div>' +
          '<div><span>Active</span><strong>' + catalog.active + '</strong></div>' +
          '<div><span>Available</span><strong>' + catalog.available + '</strong></div>' +
          '<div><span>COA coverage</span><strong>' + catalog.with_coa + '/' + catalog.total + '</strong></div>' +
          '<div><span>Missing COA</span><strong>' + catalog.missing_coa + '</strong></div>' +
          '<div><span>Uncategorized</span><strong>' + catalog.uncategorized + '</strong></div>' +
        '</div>' +
        (catalog.latest_sync ? '<div class="dashboard-sync-line">Latest sync: <strong>' + helpers.escapeHtml(catalog.latest_sync.status) + '</strong> · ' +
          (catalog.latest_sync.received_count ?? 0) + ' received · ' + (catalog.latest_sync.upserted_count ?? 0) + ' upserted · ' +
          helpers.escapeHtml(helpers.dateTime(catalog.latest_sync.completed_at || catalog.latest_sync.started_at)) + '</div>' : '') +
      '</section>' +

      '<section class="dashboard-panel"><div class="dashboard-section-head"><div><span class="eyebrow">RECENT ACTIVITY</span><h2>Latest orders</h2></div><a href="#orders">View all →</a></div>' +
        recentOrders + '</section>' +
      '<p class="dashboard-generated">Dashboard generated ' + helpers.escapeHtml(helpers.dateTime(data.generated_at)) + '</p>'
  } catch (error) {
    root.innerHTML = '<div class="empty-state error-state"><h2>Could not load dashboard.</h2><p>' +
      helpers.escapeHtml(error instanceof Error ? error.message : 'Unknown error') + '</p></div>'
  }
}
