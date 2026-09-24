import { listCoreCustomers, type CoreCustomer } from './services/customers'

type Helpers = {
  escapeHtml: (value: unknown) => string
  money: (value: number | string | null | undefined) => string
  dateTime: (value: string | null | undefined) => string
}

function nameFor(customer: CoreCustomer) {
  return [customer.first_name, customer.last_name].filter(Boolean).join(' ') || 'Customer'
}

function customerCard(customer: CoreCustomer, helpers: Helpers) {
  const { escapeHtml, money, dateTime } = helpers
  const recentOrders = customer.orders.slice(0, 3)
  return '<article class="customer-card" data-customer-id="' + escapeHtml(customer.id) + '">' +
    '<div class="customer-card-head">' +
      '<div><span class="eyebrow">' + escapeHtml(customer.customer_number || 'CUSTOMER') + '</span>' +
      '<h2>' + escapeHtml(nameFor(customer)) + '</h2>' +
      '<p>' + escapeHtml(customer.email) + (customer.phone ? ' · ' + escapeHtml(customer.phone) : '') + '</p></div>' +
      '<div class="customer-tags">' +
        '<span class="membership-pill">' + escapeHtml(customer.membership?.name || 'No membership') + '</span>' +
        '<span class="account-pill">' + escapeHtml(customer.account_status) + '</span>' +
      '</div>' +
    '</div>' +
    '<div class="customer-metrics">' +
      '<div><span>Orders</span><strong>' + customer.metrics.order_count + '</strong></div>' +
      '<div><span>Lifetime spend</span><strong>' + money(customer.metrics.lifetime_spend) + '</strong></div>' +
      '<div><span>Referrals</span><strong>' + customer.metrics.referral_count + '</strong></div>' +
      '<div><span>Rewards</span><strong>' + customer.metrics.available_reward_count + '</strong></div>' +
    '</div>' +
    '<div class="customer-details">' +
      '<div><span>Preferred contact</span><strong>' + escapeHtml(customer.preferred_contact_method || '—') + '</strong></div>' +
      '<div><span>Last login</span><strong>' + escapeHtml(dateTime(customer.last_login_at)) + '</strong></div>' +
      '<div><span>Latest order</span><strong>' + escapeHtml(dateTime(customer.metrics.latest_order_at)) + '</strong></div>' +
      '<div><span>Referral code</span><strong>' + escapeHtml(customer.referral_code || '—') + '</strong></div>' +
    '</div>' +
    (recentOrders.length
      ? '<div class="customer-orders"><span class="section-label">Recent orders</span>' +
        recentOrders.map(order =>
          '<a href="#orders" class="customer-order-row"><span>' +
            escapeHtml(order.order_number || 'Order') + '</span><span>' +
            escapeHtml(order.status) + '</span><strong>' + money(order.total) + '</strong></a>'
        ).join('') + '</div>'
      : '') +
    (customer.notes ? '<div class="order-note"><span>Internal notes</span><p>' + escapeHtml(customer.notes) + '</p></div>' : '') +
  '</article>'
}

export function customersPageMarkup(email: string, escapeHtml: Helpers['escapeHtml']) {
  return '<section class="dashboard-head"><div>' +
    '<span class="eyebrow">CUSTOMER OPERATIONS</span><h1 class="dashboard-title">Customers</h1>' +
    '<p class="copy">Customer relationships, memberships, order value, referrals, rewards, and internal context.</p>' +
    '</div><div class="operator">Signed in as <strong>' + escapeHtml(email) + '</strong></div></section>' +
    '<section class="customers-toolbar"><label class="queue-search"><span class="sr-only">Search customers</span>' +
    '<input id="customers-search" type="search" placeholder="Search name, email, phone, customer number…" autocomplete="off"></label>' +
    '<select id="customers-membership" aria-label="Filter customers by membership"><option value="all">All memberships</option></select></section>' +
    '<p class="queue-summary" id="customers-summary" aria-live="polite"></p>' +
    '<section class="customers-list" id="customers-list"><div class="loading">Loading customers…</div></section>'
}

export async function bindCustomersPage(helpers: Helpers) {
  const list = document.querySelector<HTMLDivElement>('#customers-list')
  if (!list) return

  try {
    const customers = await listCoreCustomers()
    list.innerHTML = customers.length
      ? customers.map(customer => customerCard(customer, helpers)).join('')
      : '<div class="empty-state"><h2>No customers yet.</h2><p>Customer profiles will appear here.</p></div>'

    const membershipSelect = document.querySelector<HTMLSelectElement>('#customers-membership')
    const memberships = [...new Map(customers.filter(c => c.membership).map(c => [c.membership!.slug, c.membership!.name])).entries()]
    if (membershipSelect) {
      membershipSelect.insertAdjacentHTML('beforeend', memberships.map(([slug, name]) =>
        '<option value="' + helpers.escapeHtml(slug) + '">' + helpers.escapeHtml(name) + '</option>'
      ).join(''))
    }

    let search = ''
    let membership = 'all'

    const apply = () => {
      let shown = 0
      document.querySelectorAll<HTMLElement>('.customer-card').forEach(card => {
        const customer = customers.find(item => item.id === card.dataset.customerId)
        if (!customer) return
        const haystack = [
          nameFor(customer), customer.customer_number, customer.email, customer.phone,
          customer.referral_code, customer.membership?.name
        ].filter(Boolean).join(' ').toLowerCase()
        const visible =
          (membership === 'all' || customer.membership?.slug === membership) &&
          (!search || haystack.includes(search))
        card.hidden = !visible
        if (visible) shown += 1
      })
      const summary = document.querySelector<HTMLParagraphElement>('#customers-summary')
      if (summary) summary.textContent = shown + ' of ' + customers.length + ' customers shown.'
    }

    document.querySelector<HTMLInputElement>('#customers-search')?.addEventListener('input', event => {
      search = (event.currentTarget as HTMLInputElement).value.trim().toLowerCase()
      apply()
    })
    membershipSelect?.addEventListener('change', event => {
      membership = (event.currentTarget as HTMLSelectElement).value
      apply()
    })
    apply()
  } catch (error) {
    list.innerHTML = '<div class="empty-state error-state"><h2>Could not load customers.</h2><p>' +
      helpers.escapeHtml(error instanceof Error ? error.message : 'Unknown error') + '</p></div>'
  }
}
