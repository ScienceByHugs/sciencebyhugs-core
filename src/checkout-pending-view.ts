import { clearCheckoutPending, listCoreOrders, type CoreOrder } from './services/orders'

type Helpers = {
  escapeHtml: (value: unknown) => string
  money: (value: number | string | null | undefined) => string
  dateTime: (value: string | null | undefined) => string
}

function pendingCard(order: CoreOrder, helpers: Helpers) {
  const name = [order.customer?.first_name, order.customer?.last_name].filter(Boolean).join(' ') || 'Customer'
  return '<article class="pending-checkout-card" data-order-id="' + helpers.escapeHtml(order.id) + '">' +
    '<div class="pending-checkout-head">' +
      '<div><span class="eyebrow">CHECKOUT PENDING</span><h2>' + helpers.escapeHtml(name) + '</h2>' +
      '<p>' + helpers.escapeHtml(order.customer?.email || '') + '</p></div>' +
      '<span class="payment-badge">' + helpers.escapeHtml(order.payment_status || 'pending') + '</span>' +
    '</div>' +
    '<div class="pending-checkout-grid">' +
      '<div><span>Total</span><strong>' + helpers.money(order.total) + '</strong></div>' +
      '<div><span>Payment</span><strong>' + helpers.escapeHtml(order.payment_method || '—') + '</strong></div>' +
      '<div><span>Created</span><strong>' + helpers.escapeHtml(helpers.dateTime(order.created_at)) + '</strong></div>' +
      '<div><span>Order #</span><strong>' + helpers.escapeHtml(order.order_number || 'Not assigned') + '</strong></div>' +
    '</div>' +
    '<div class="pending-checkout-actions">' +
      '<button type="button" class="danger clear-pending-checkout" data-order-id="' + helpers.escapeHtml(order.id) + '">Clear Pending Checkout</button>' +
      '<p class="card-message"></p>' +
    '</div>' +
  '</article>'
}

export function checkoutPendingPageMarkup(email: string, escapeHtml: Helpers['escapeHtml']) {
  return '<section class="dashboard-head dashboard-head-compact"><div>' +
    '<span class="eyebrow">ORDER MANAGEMENT</span><h1 class="dashboard-title">Checkout Pending</h1>' +
    '<p class="copy">Review abandoned or incomplete Pay Now checkout records before clearing them.</p>' +
    '</div><div class="operator">Signed in as <strong>' + escapeHtml(email) + '</strong></div></section>' +
    '<section class="pending-checkout-toolbar">' +
      '<div><strong id="pending-checkout-count">0 pending</strong><span>Only unpaid checkout_pending records are shown.</span></div>' +
      '<button type="button" id="clear-all-pending" class="danger">Clear All Pending</button>' +
    '</section>' +
    '<section id="pending-checkout-list" class="pending-checkout-list"><div class="loading">Loading pending checkouts…</div></section>'
}

export async function bindCheckoutPendingPage(helpers: Helpers) {
  const list = document.querySelector<HTMLDivElement>('#pending-checkout-list')
  const count = document.querySelector<HTMLElement>('#pending-checkout-count')
  const clearAll = document.querySelector<HTMLButtonElement>('#clear-all-pending')
  if (!list || !count || !clearAll) return

  const render = async () => {
    const orders = (await listCoreOrders()).filter(order =>
      order.status.trim().toLowerCase() === 'checkout_pending' &&
      order.payment_status.trim().toLowerCase() !== 'paid'
    )
    count.textContent = orders.length + ' pending'
    clearAll.disabled = orders.length === 0
    list.innerHTML = orders.length
      ? orders.map(order => pendingCard(order, helpers)).join('')
      : '<div class="empty-state"><h2>No checkout-pending orders.</h2><p>The queue is clear.</p></div>'

    document.querySelectorAll<HTMLButtonElement>('.clear-pending-checkout').forEach(button => {
      button.addEventListener('click', async () => {
        const id = button.dataset.orderId
        if (!id) return
        if (!window.confirm('Clear this checkout-pending order?\n\nThis removes the pending order and releases any one-time discount code tied to it.')) return
        button.disabled = true
        try {
          await clearCheckoutPending(id)
          await render()
        } catch (error) {
          const message = button.parentElement?.querySelector<HTMLParagraphElement>('.card-message')
          if (message) message.textContent = error instanceof Error ? error.message : 'Could not clear pending checkout.'
          button.disabled = false
        }
      })
    })
  }

  clearAll.addEventListener('click', async () => {
    if (!window.confirm('Clear ALL unpaid checkout-pending orders?\n\nThis removes every pending checkout and releases any one-time discount codes tied to them.')) return
    clearAll.disabled = true
    try {
      await clearCheckoutPending()
      await render()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not clear pending checkouts.')
      clearAll.disabled = false
    }
  })

  try {
    await render()
  } catch (error) {
    list.innerHTML = '<div class="empty-state error-state"><h2>Could not load pending checkouts.</h2><p>' +
      helpers.escapeHtml(error instanceof Error ? error.message : 'Unknown error') + '</p></div>'
  }
}
