import './styles.css'
import { supabase } from './services/supabase'
import { bindOrdersPage, ordersPageMarkup } from './orders-view'
import { bindCustomersPage, customersPageMarkup } from './customers-view'
import { bindCatalogPage, catalogPageMarkup } from './catalog-view'
import { bindDashboardPage, dashboardPageMarkup } from './dashboard-view'
import { bindAuditPage, auditPageMarkup } from './audit-view'
import { bindAnalyticsPage, analyticsPageMarkup } from './analytics-view'
import { bindFinancePage, financePageMarkup } from './finance-view'
import { bindReferralsPage, referralsPageMarkup } from './referrals-view'
import { bindAdminToolsPage, adminToolsPageMarkup } from './admin-tools-view'
import { bindNotificationsPage, notificationsPageMarkup } from './notifications-view'
import {
  approveInvoice,
  listCoreInvoices,
  recordPayment,
  sendInvoice,
  verifyPayment,
  updateFulfillment,
  type CoreInvoice,
} from './services/invoices'

const appRoot = document.querySelector<HTMLDivElement>('#app')
if (!appRoot) throw new Error('App root not found')
const app = appRoot

const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(value || 0))

const dateTime = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString() : '—'

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const roleFor = (user: any) =>
  String(user?.app_metadata?.role || '').trim().toLowerCase()

const isAdminRole = (role: string) =>
  role === 'owner' || role === 'admin'

function shell(content: string, signedIn = false) {
  const activeView = location.hash === '#operations' ? 'operations' : location.hash === '#orders' ? 'orders' : location.hash === '#customers' ? 'customers' : location.hash === '#catalog' ? 'catalog' : location.hash === '#analytics' ? 'analytics' : location.hash === '#finance' ? 'finance' : location.hash === '#referrals' ? 'referrals' : location.hash === '#admin-tools' ? 'admin-tools' : location.hash === '#notifications' ? 'notifications' : location.hash === '#audit' ? 'audit' : 'dashboard'
  const navigation = signedIn
    ? '<nav class="core-nav" aria-label="Core navigation" tabindex="0">' +
      '<a href="#dashboard" class="' + (activeView === 'dashboard' ? 'active' : '') + '"' + (activeView === 'dashboard' ? ' aria-current="page"' : '') + '>Dashboard</a>' +
      '<a href="#operations" class="' + (activeView === 'operations' ? 'active' : '') + '"' + (activeView === 'operations' ? ' aria-current="page"' : '') + '>Operations</a>' +
      '<a href="#orders" class="' + (activeView === 'orders' ? 'active' : '') + '"' + (activeView === 'orders' ? ' aria-current="page"' : '') + '>Orders</a>' +
      '<a href="#customers" class="' + (activeView === 'customers' ? 'active' : '') + '"' + (activeView === 'customers' ? ' aria-current="page"' : '') + '>Customers</a>' +
      '<a href="#catalog" class="' + (activeView === 'catalog' ? 'active' : '') + '"' + (activeView === 'catalog' ? ' aria-current="page"' : '') + '>Catalog</a>' +
      '<a href="#analytics" class="' + (activeView === 'analytics' ? 'active' : '') + '"' + (activeView === 'analytics' ? ' aria-current="page"' : '') + '>Analytics</a>' +
      '<a href="#finance" class="' + (activeView === 'finance' ? 'active' : '') + '"' + (activeView === 'finance' ? ' aria-current="page"' : '') + '>Finance</a>' +
      '<a href="#referrals" class="' + (activeView === 'referrals' ? 'active' : '') + '"' + (activeView === 'referrals' ? ' aria-current="page"' : '') + '>Referrals</a>' +
      '<a href="#admin-tools" class="' + (activeView === 'admin-tools' ? 'active' : '') + '"' + (activeView === 'admin-tools' ? ' aria-current="page"' : '') + '>Admin</a>' +
      '<a href="#notifications" class="' + (activeView === 'notifications' ? 'active' : '') + '"' + (activeView === 'notifications' ? ' aria-current="page"' : '') + '>Alerts</a>' +
      '<a href="#audit" class="' + (activeView === 'audit' ? 'active' : '') + '"' + (activeView === 'audit' ? ' aria-current="page"' : '') + '>Audit</a>' +
      '</nav>'
    : ''

  app.innerHTML = `
    <a class="skip-link" href="#core-content">Skip to content</a>
    <main class="shell">
      <header class="commandbar">
        <div>
          <span class="eyebrow">SCIENCE BY HUGs</span>
          <strong>CORE</strong>
        </div>
        <div class="command-actions">
          ${navigation}
          <span class="status">SYSTEM READY</span>
          ${signedIn ? '<button class="ghost compact" id="sign-out">Sign out</button>' : ''}
        </div>
      </header>
      <div id="core-content" tabindex="-1">${content}</div>
    </main>
  `

  document.querySelector('#sign-out')?.addEventListener('click', async () => {
    await supabase.auth.signOut()
  })
}

function renderLogin(message = '') {
  shell(`
    <section class="login-wrap">
      <div class="login-card">
        <span class="eyebrow">AUTHORIZED PERSONNEL</span>
        <h1 class="login-title">CORE</h1>
        <p class="tagline">Control. Operate. Manage.</p>
        <p class="copy">Sign in with an authorized Science By HUGs administrator account.</p>
        <form id="login-form" class="login-form">
          <label>Email<input name="email" type="email" autocomplete="email" required></label>
          <label>Password<input name="password" type="password" autocomplete="current-password" required></label>
          <button class="primary wide" type="submit">Enter Core</button>
        </form>
        <p class="form-message" id="login-message">${escapeHtml(message)}</p>
      </div>
    </section>
  `)

  document.querySelector<HTMLFormElement>('#login-form')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const formElement = event.currentTarget as HTMLFormElement
    const form = new FormData(formElement)
    const email = String(form.get('email') || '').trim()
    const password = String(form.get('password') || '')
    const messageEl = document.querySelector<HTMLParagraphElement>('#login-message')
    const button = formElement.querySelector<HTMLButtonElement>('button[type="submit"]')

    if (messageEl) messageEl.textContent = 'Authenticating…'
    if (button) button.disabled = true

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      if (messageEl) messageEl.textContent = error.message
      if (button) button.disabled = false
    }
  })
}

function renderForbidden(email: string) {
  shell(`
    <section class="login-wrap">
      <div class="login-card">
        <span class="eyebrow">ACCESS CONTROL</span>
        <h2>Core access not assigned.</h2>
        <p class="copy"><strong>${escapeHtml(email)}</strong> is authenticated, but this account is not marked as a Core owner or administrator.</p>
      </div>
    </section>
  `, true)
}

function paymentPanel(invoice: CoreInvoice) {
  const directCheckout = invoice.status === 'direct_checkout'
  if (!invoice.order_id || (!directCheckout && invoice.send_status !== 'sent')) return ''

  const payment = invoice.payment
  const verified =
    payment?.status === 'verified' ||
    invoice.order?.payment_status === 'paid'

  const submitted =
    payment?.status === 'submitted' &&
    !verified

  if (verified) {
    return `
      <section class="payment-panel verified">
        <div class="payment-panel-head">
          <div>
            <span class="eyebrow">PAYMENT CONTROL</span>
            <h3>Payment verified</h3>
          </div>
          <span class="payment-badge paid">PAID</span>
        </div>
        <div class="payment-data">
          <div><span>Method</span><strong>${escapeHtml(payment?.provider || invoice.order?.payment_method || '—')}</strong></div>
          <div><span>Reference</span><strong>${escapeHtml(payment?.payment_reference || '—')}</strong></div>
          <div><span>Amount</span><strong>${money(payment?.amount || invoice.total)}</strong></div>
          <div><span>Verified</span><strong>${escapeHtml(dateTime(payment?.verified_at || payment?.paid_at || invoice.order?.paid_at))}</strong></div>
        </div>
        <p class="payment-note">Order moved to <strong>Processing</strong> after payment verification.</p>
      </section>
    `
  }

  if (submitted) {
    return `
      <section class="payment-panel submitted">
        <div class="payment-panel-head">
          <div>
            <span class="eyebrow">PAYMENT CONTROL</span>
            <h3>Payment submitted</h3>
          </div>
          <span class="payment-badge submitted">REVIEW</span>
        </div>
        <div class="payment-data">
          <div><span>Method</span><strong>${escapeHtml(payment?.provider || '—')}</strong></div>
          <div><span>Reference</span><strong>${escapeHtml(payment?.payment_reference || '—')}</strong></div>
          <div><span>Amount</span><strong>${money(payment?.amount || invoice.total)}</strong></div>
          <div><span>Submitted</span><strong>${escapeHtml(dateTime(payment?.submitted_at))}</strong></div>
        </div>
        ${payment?.notes ? `<p class="payment-note">${escapeHtml(payment.notes)}</p>` : ''}
        <button
          class="primary verify-payment-button"
          type="button"
          data-order-id="${escapeHtml(invoice.order_id)}"
          data-number="${escapeHtml(invoice.invoice_number)}"
        >
          Verify Payment & Start Processing
        </button>
      </section>
    `
  }

  return `
    <section class="payment-panel">
      <div class="payment-panel-head">
        <div>
          <span class="eyebrow">PAYMENT CONTROL</span>
          <h3>Waiting for payment</h3>
        </div>
        <span class="payment-badge">UNPAID</span>
      </div>
      <p class="payment-note">Record a payment only after you have a transaction or confirmation to reference. This does not move money.</p>
      <div class="payment-form-grid">
        <label>
          Method
          <select class="payment-provider">
            <option value="">Choose method</option>
            <option value="Zelle">Zelle</option>
            <option value="PayPal">PayPal</option>
            <option value="Venmo">Venmo</option>
          </select>
        </label>
        <label>
          Reference / confirmation
          <input class="payment-reference" type="text" maxlength="120" placeholder="Optional confirmation ID">
        </label>
        <label class="payment-notes-field">
          Notes
          <input class="payment-notes" type="text" maxlength="300" placeholder="Optional internal note">
        </label>
      </div>
      <button
        class="secondary record-payment-button"
        type="button"
        data-order-id="${escapeHtml(invoice.order_id)}"
      >
        Record Payment Submitted
      </button>
    </section>
  `
}

function fulfillmentPanel(invoice: CoreInvoice) {
  if (!invoice.order_id || invoice.order?.payment_status !== 'paid') return ''

  const status = invoice.order?.status || 'processing'
  const timestamp =
    status === 'ordered' ? invoice.order?.ordered_at :
    status === 'shipped' ? invoice.order?.shipped_at :
    status === 'delivered' ? invoice.order?.delivered_at :
    status === 'delayed' ? invoice.order?.delayed_at :
    status === 'cancelled' ? invoice.order?.cancelled_at :
    invoice.order?.paid_at

  const options: Record<string, Array<{ value: string; label: string }>> = {
    processing: [
      { value: 'ordered', label: 'Mark Ordered' },
      { value: 'delayed', label: 'Mark Delayed' },
      { value: 'cancelled', label: 'Cancel Order' },
    ],
    ordered: [
      { value: 'shipped', label: 'Mark Shipped' },
      { value: 'delayed', label: 'Mark Delayed' },
      { value: 'cancelled', label: 'Cancel Order' },
    ],
    shipped: [
      { value: 'delivered', label: 'Mark Delivered' },
      { value: 'delayed', label: 'Mark Delayed' },
    ],
    delayed: [
      { value: 'processing', label: 'Return to Processing' },
      { value: 'ordered', label: 'Return to Ordered' },
      { value: 'shipped', label: 'Return to Shipped' },
      { value: 'cancelled', label: 'Cancel Order' },
    ],
  }

  const terminal = status === 'delivered' || status === 'cancelled'
  const actionOptions = options[status] || []

  return `
    <section class="fulfillment-panel ${terminal ? 'terminal' : ''}">
      <div class="payment-panel-head">
        <div>
          <span class="eyebrow">FULFILLMENT CONTROL</span>
          <h3>${escapeHtml(status.replaceAll('_', ' '))}</h3>
        </div>
        <span class="fulfillment-badge ${escapeHtml(status)}">${escapeHtml(status.toUpperCase())}</span>
      </div>
      <p class="payment-note">
        Current stage${timestamp ? ` since <strong>${escapeHtml(dateTime(timestamp))}</strong>` : ''}.
        ${terminal ? 'This order is in a final fulfillment state.' : 'Choose the next operational state below.'}
      </p>
      ${!terminal ? `
        <div class="fulfillment-controls">
          <select class="fulfillment-status">
            <option value="">Choose next status</option>
            ${actionOptions.map(option => `<option value="${option.value}">${option.label}</option>`).join('')}
          </select>
          <input class="fulfillment-note" type="text" maxlength="300" placeholder="Optional internal note">
          <button class="secondary fulfillment-button" type="button" data-order-id="${escapeHtml(invoice.order_id)}">
            Update Fulfillment
          </button>
        </div>
      ` : ''}
    </section>
  `
}

function invoiceCard(invoice: CoreInvoice) {
  const directCheckout = invoice.status === 'direct_checkout'
  const awaiting = invoice.status === 'awaiting_approval'
  const sent = invoice.status === 'sent' || invoice.send_status === 'sent'
  const ready =
    invoice.status === 'approved' &&
    invoice.pdf_status === 'created' &&
    !sent

  const paid =
    invoice.payment?.status === 'verified' ||
    invoice.order?.payment_status === 'paid'

  const itemRows = invoice.items
    .map(item => `
      <div class="line-item">
        <div>
          <strong>${escapeHtml(item.product_name)}</strong>
          <span>${escapeHtml(item.product_code || '')}</span>
        </div>
        <span>${item.quantity} × ${money(item.unit_price)}</span>
        <strong>${money(item.line_total)}</strong>
      </div>
    `)
    .join('')

  const fulfillmentLabel =
    invoice.order?.status && ['ordered', 'shipped', 'delivered', 'delayed', 'cancelled'].includes(invoice.order.status)
      ? invoice.order.status.replaceAll('_', ' ')
      : 'Paid · Processing'

  const statusText =
    awaiting
      ? 'Awaiting Approval'
      : paid
        ? fulfillmentLabel
        : directCheckout
          ? invoice.payment?.status === 'submitted'
            ? 'Payment Submitted'
            : 'Awaiting Payment'
          : sent
            ? 'Invoice Sent'
            : ready
              ? 'PDF Ready'
              : invoice.status

  return `
    <article class="invoice-card" data-invoice-id="${escapeHtml(invoice.id)}">
      <div class="invoice-top">
        <div>
          <span class="eyebrow">${directCheckout ? 'DIRECT CHECKOUT · ' : ''}${escapeHtml(invoice.invoice_number)}</span>
          <h2>${escapeHtml(invoice.customer_name_snapshot || 'Customer')}</h2>
          <p>${escapeHtml(invoice.customer_email_snapshot || '')}</p>
        </div>
        <span class="status-pill ${awaiting ? 'awaiting' : paid ? 'paid' : sent ? 'sent' : ready ? 'ready' : ''}">
          ${escapeHtml(statusText)}
        </span>
      </div>

      <div class="items">${itemRows || '<p class="muted">No item detail available.</p>'}</div>

      <div class="totals">
        <span>Subtotal <strong>${money(invoice.subtotal)}</strong></span>
        <span>Shipping <strong>${money(invoice.shipping_total)}</strong></span>
        <span>Tax <strong>${money(invoice.tax_total)}</strong></span>
        <span class="grand">Total <strong>${money(invoice.total)}</strong></span>
      </div>

      ${ready ? `
        <div class="send-preview">
          <span class="eyebrow">READY TO SEND</span>
          <p>The approved PDF will be emailed to <strong>${escapeHtml(invoice.customer_email_snapshot || '')}</strong> from <strong>admin@sciencebyhugs.com</strong>.</p>
          <p class="muted">Sending is separate from approval and requires confirmation.</p>
        </div>
      ` : ''}

      ${sent ? `
        <div class="send-preview sent-preview">
          <span class="eyebrow">DELIVERED BY EMAIL</span>
          <p>Sent to <strong>${escapeHtml(invoice.sent_to || invoice.customer_email_snapshot || '')}</strong>${invoice.sent_at ? ` on ${escapeHtml(dateTime(invoice.sent_at))}` : ''}.</p>
        </div>
      ` : ''}

      ${paymentPanel(invoice)}
      ${fulfillmentPanel(invoice)}

      <div class="invoice-actions">
        ${invoice.google_sheet_url ? `<a class="button secondary" href="${escapeHtml(invoice.google_sheet_url)}" target="_blank" rel="noreferrer">Open Sheet</a>` : ''}
        ${invoice.pdf_url ? `<a class="button secondary" href="${escapeHtml(invoice.pdf_url)}" target="_blank" rel="noreferrer">Open PDF</a>` : ''}
        ${awaiting ? `<button class="primary approve-button" data-id="${escapeHtml(invoice.id)}">Approve & Create PDF</button>` : ''}
        ${ready ? `<button class="primary send-button" data-id="${escapeHtml(invoice.id)}" data-number="${escapeHtml(invoice.invoice_number)}" data-recipient="${escapeHtml(invoice.customer_email_snapshot || '')}">Send Invoice</button>` : ''}
      </div>
      <p class="card-message" aria-live="polite"></p>
    </article>
  `
}

async function renderOperations(email: string) {
  shell(`
    <section class="dashboard-head">
      <div>
        <span class="eyebrow">INVOICE + PAYMENT OPERATIONS</span>
        <h1 class="dashboard-title">Operations Control</h1>
        <p class="copy">Manage direct checkout orders, approve emailed invoices, review payment submissions, and control fulfillment.</p>
      </div>
      <div class="operator">Signed in as <strong>${escapeHtml(email)}</strong></div>
    </section>
    <section class="stats" id="stats"></section>
    <section class="queue-toolbar" aria-label="Operations queue controls">
      <div class="queue-tabs" id="queue-tabs">
        <button class="queue-tab active" type="button" data-queue="attention">Needs attention</button>
        <button class="queue-tab" type="button" data-queue="approval">Invoices</button>
        <button class="queue-tab" type="button" data-queue="payment">Payments</button>
        <button class="queue-tab" type="button" data-queue="fulfillment">Fulfillment</button>
        <button class="queue-tab" type="button" data-queue="all">All</button>
      </div>
      <label class="queue-search">
        <span class="sr-only">Search operations</span>
        <input id="queue-search" type="search" placeholder="Search customer, invoice, order…" autocomplete="off">
      </label>
    </section>
    <p class="queue-summary" id="queue-summary" aria-live="polite"></p>
    <section class="invoice-list" id="invoice-list">
      <div class="loading">Loading operations…</div>
    </section>
  `, true)

  try {
    const invoices = await listCoreInvoices()

    const waiting = invoices.filter(invoice => invoice.status === 'awaiting_approval')
    const ready = invoices.filter(invoice =>
      invoice.status === 'approved' &&
      invoice.pdf_status === 'created' &&
      invoice.send_status !== 'sent'
    )
    const paymentSubmitted = invoices.filter(invoice =>
      invoice.payment?.status === 'submitted'
    )
    const paid = invoices.filter(invoice =>
      invoice.payment?.status === 'verified' ||
      invoice.order?.payment_status === 'paid'
    )

    const visible = invoices.slice(0, 50)
    const invoiceById = new Map(visible.map(invoice => [invoice.id, invoice]))

    const stats = document.querySelector<HTMLDivElement>('#stats')
    if (stats) {
      stats.innerHTML = `
        <div><span>Awaiting approval</span><strong>${waiting.length}</strong></div>
        <div><span>Ready to send</span><strong>${ready.length}</strong></div>
        <div><span>Payment submitted</span><strong>${paymentSubmitted.length}</strong></div>
        <div><span>Paid / processing</span><strong>${paid.length}</strong></div>
      `
    }

    const list = document.querySelector<HTMLDivElement>('#invoice-list')
    if (list) {
      list.innerHTML = visible.length
        ? visible.map(invoiceCard).join('')
        : '<div class="empty-state"><h2>Queue clear.</h2><p>No operations are available.</p></div>'
    }

    let activeQueue = 'attention'
    let searchTerm = ''

    const matchesQueue = (invoice: CoreInvoice, queue: string) => {
      const awaitingApproval = invoice.status === 'awaiting_approval'
      const readyToSend =
        invoice.status === 'approved' &&
        invoice.pdf_status === 'created' &&
        invoice.send_status !== 'sent'
      const submittedPayment = invoice.payment?.status === 'submitted'
      const isPaid =
        invoice.payment?.status === 'verified' ||
        invoice.order?.payment_status === 'paid'
      const fulfillmentStatus = invoice.order?.status || ''
      const delayed = fulfillmentStatus === 'delayed'
      const activeFulfillment =
        isPaid &&
        fulfillmentStatus !== 'delivered' &&
        fulfillmentStatus !== 'cancelled'

      if (queue === 'approval') return awaitingApproval || readyToSend
      if (queue === 'payment') {
        return submittedPayment || (
          invoice.status === 'direct_checkout' &&
          !isPaid
        )
      }
      if (queue === 'fulfillment') return activeFulfillment
      if (queue === 'attention') {
        return awaitingApproval || readyToSend || submittedPayment || delayed
      }
      return true
    }

    const matchesSearch = (invoice: CoreInvoice, term: string) => {
      if (!term) return true
      const haystack = [
        invoice.invoice_number,
        invoice.customer_name_snapshot,
        invoice.customer_email_snapshot,
        invoice.customer_phone_snapshot,
        invoice.order?.order_number,
        invoice.order?.status,
        invoice.payment?.provider,
        invoice.payment?.payment_reference,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(term)
    }

    const applyQueueView = () => {
      let shown = 0
      document.querySelectorAll<HTMLElement>('.invoice-card').forEach(card => {
        const invoice = invoiceById.get(card.dataset.invoiceId || '')
        const show = Boolean(
          invoice &&
          matchesQueue(invoice, activeQueue) &&
          matchesSearch(invoice, searchTerm),
        )
        card.hidden = !show
        if (show) shown += 1
      })

      const summary = document.querySelector<HTMLParagraphElement>('#queue-summary')
      if (summary) {
        const label =
          activeQueue === 'attention' ? 'needs attention' :
          activeQueue === 'approval' ? 'invoice actions' :
          activeQueue === 'payment' ? 'payment actions' :
          activeQueue === 'fulfillment' ? 'fulfillment actions' :
          'operations'
        summary.textContent = `${shown} ${label}${searchTerm ? ' matching your search' : ''}.`
      }

      const empty = document.querySelector<HTMLElement>('#filtered-empty-state')
      if (shown === 0 && visible.length) {
        if (!empty && list) {
          list.insertAdjacentHTML(
            'beforeend',
            '<div class="empty-state" id="filtered-empty-state"><h2>Nothing in this view.</h2><p>Try another queue or clear the search.</p></div>',
          )
        }
      } else {
        empty?.remove()
      }
    }

    document.querySelectorAll<HTMLButtonElement>('.queue-tab').forEach(button => {
      button.addEventListener('click', () => {
        activeQueue = button.dataset.queue || 'attention'
        document.querySelectorAll('.queue-tab').forEach(tab => tab.classList.remove('active'))
        button.classList.add('active')
        applyQueueView()
      })
    })

    document.querySelector<HTMLInputElement>('#queue-search')?.addEventListener('input', event => {
      searchTerm = (event.currentTarget as HTMLInputElement).value.trim().toLowerCase()
      applyQueueView()
    })

    applyQueueView()

    document.querySelectorAll<HTMLButtonElement>('.approve-button').forEach(button => {
      button.addEventListener('click', async () => {
        const invoiceId = button.dataset.id
        if (!invoiceId) return

        const message = button.closest<HTMLElement>('.invoice-card')
          ?.querySelector<HTMLParagraphElement>('.card-message')

        button.disabled = true
        button.textContent = 'Creating PDF…'
        if (message) message.textContent = 'Approving invoice and generating the Drive PDF…'

        try {
          await approveInvoice(invoiceId)
          await renderOperations(email)
        } catch (error) {
          if (message) message.textContent = error instanceof Error ? error.message : 'Approval failed'
          button.disabled = false
          button.textContent = 'Approve & Create PDF'
        }
      })
    })

    document.querySelectorAll<HTMLButtonElement>('.send-button').forEach(button => {
      button.addEventListener('click', async () => {
        const invoiceId = button.dataset.id
        const invoiceNumber = button.dataset.number || 'invoice'
        const recipient = button.dataset.recipient || ''
        if (!invoiceId) return

        const confirmed = window.confirm(
          `Send ${invoiceNumber} to ${recipient}?\n\nThe approved PDF will be attached and sent from admin@sciencebyhugs.com. This sends a real email.`
        )
        if (!confirmed) return

        const message = button.closest<HTMLElement>('.invoice-card')
          ?.querySelector<HTMLParagraphElement>('.card-message')

        button.disabled = true
        button.textContent = 'Sending…'
        if (message) message.textContent = `Sending ${invoiceNumber} to ${recipient}…`

        try {
          await sendInvoice(invoiceId)
          await renderOperations(email)
        } catch (error) {
          if (message) message.textContent = error instanceof Error ? error.message : 'Send failed'
          button.disabled = false
          button.textContent = 'Send Invoice'
        }
      })
    })

    document.querySelectorAll<HTMLButtonElement>('.record-payment-button').forEach(button => {
      button.addEventListener('click', async () => {
        const orderId = button.dataset.orderId
        const panel = button.closest<HTMLElement>('.payment-panel')
        const provider = panel?.querySelector<HTMLSelectElement>('.payment-provider')?.value || ''
        const reference = panel?.querySelector<HTMLInputElement>('.payment-reference')?.value.trim() || ''
        const notes = panel?.querySelector<HTMLInputElement>('.payment-notes')?.value.trim() || ''
        const message = button.closest<HTMLElement>('.invoice-card')
          ?.querySelector<HTMLParagraphElement>('.card-message')

        if (!orderId) return

        if (!provider) {
          if (message) message.textContent = 'Choose a payment method first.'
          return
        }

        button.disabled = true
        button.textContent = 'Recording…'
        if (message) message.textContent = 'Recording payment submission…'

        try {
          await recordPayment(orderId, provider, reference, notes)
          await renderOperations(email)
        } catch (error) {
          if (message) message.textContent = error instanceof Error ? error.message : 'Payment recording failed'
          button.disabled = false
          button.textContent = 'Record Payment Submitted'
        }
      })
    })

    document.querySelectorAll<HTMLButtonElement>('.verify-payment-button').forEach(button => {
      button.addEventListener('click', async () => {
        const orderId = button.dataset.orderId
        const invoiceNumber = button.dataset.number || 'this invoice'
        if (!orderId) return

        const confirmed = window.confirm(
          `Verify payment for ${invoiceNumber}?\n\nThis marks the order PAID and moves it to PROCESSING. Only continue after you have independently confirmed the payment.`
        )
        if (!confirmed) return

        const message = button.closest<HTMLElement>('.invoice-card')
          ?.querySelector<HTMLParagraphElement>('.card-message')

        button.disabled = true
        button.textContent = 'Verifying…'
        if (message) message.textContent = 'Verifying payment and moving the order to processing…'

        try {
          await verifyPayment(orderId)
          await renderOperations(email)
        } catch (error) {
          if (message) message.textContent = error instanceof Error ? error.message : 'Payment verification failed'
          button.disabled = false
          button.textContent = 'Verify Payment & Start Processing'
        }
      })
    })

    document.querySelectorAll<HTMLButtonElement>('.fulfillment-button').forEach(button => {
      button.addEventListener('click', async () => {
        const orderId = button.dataset.orderId
        const panel = button.closest<HTMLElement>('.fulfillment-panel')
        const status = panel?.querySelector<HTMLSelectElement>('.fulfillment-status')?.value || ''
        const note = panel?.querySelector<HTMLInputElement>('.fulfillment-note')?.value.trim() || ''
        const message = button.closest<HTMLElement>('.invoice-card')
          ?.querySelector<HTMLParagraphElement>('.card-message')

        if (!orderId || !status) {
          if (message) message.textContent = 'Choose the next fulfillment status.'
          return
        }

        const highImpact = status === 'delivered' || status === 'cancelled'
        if (highImpact) {
          const confirmed = window.confirm(
            `Move this order to ${status.toUpperCase()}?\n\nThis is a major fulfillment status change.`
          )
          if (!confirmed) return
        }

        button.disabled = true
        button.textContent = 'Updating…'
        if (message) message.textContent = `Updating order to ${status}…`

        try {
          await updateFulfillment(
            orderId,
            status as 'ordered' | 'shipped' | 'delivered' | 'delayed' | 'cancelled' | 'processing',
            note,
          )
          await renderOperations(email)
        } catch (error) {
          if (message) message.textContent = error instanceof Error ? error.message : 'Fulfillment update failed'
          button.disabled = false
          button.textContent = 'Update Fulfillment'
        }
      })
    })
  } catch (error) {
    const list = document.querySelector<HTMLDivElement>('#invoice-list')
    if (list) {
      list.innerHTML = `
        <div class="empty-state error-state">
          <h2>Could not load Core.</h2>
          <p>${escapeHtml(error instanceof Error ? error.message : 'Unknown error')}</p>
        </div>
      `
    }
  }
}

async function renderOrders(email: string) {
  shell(ordersPageMarkup(email, escapeHtml), true)
  await bindOrdersPage({ escapeHtml, money, dateTime })
}

async function renderCustomers(email: string) {
  shell(customersPageMarkup(email, escapeHtml), true)
  await bindCustomersPage({ escapeHtml, money, dateTime })
}

async function renderCatalog(email: string) {
  shell(catalogPageMarkup(email, escapeHtml), true)
  await bindCatalogPage({ escapeHtml, money, dateTime })
}

async function renderExecutiveDashboard(email: string) {
  shell(dashboardPageMarkup(email, escapeHtml), true)
  await bindDashboardPage({ escapeHtml, money, dateTime })
}

async function renderAnalytics(email: string) {
  shell(analyticsPageMarkup(email, escapeHtml), true)
  await bindAnalyticsPage({ escapeHtml, money, dateTime })
}

async function renderFinance(email: string) {
  shell(financePageMarkup(email, escapeHtml), true)
  await bindFinancePage({ escapeHtml, money, dateTime })
}

async function renderReferrals(email: string) {
  shell(referralsPageMarkup(email, escapeHtml), true)
  await bindReferralsPage({ escapeHtml, dateTime })
}

async function renderAdminTools(email: string) {
  shell(adminToolsPageMarkup(email, escapeHtml), true)
  await bindAdminToolsPage({ escapeHtml })
}

async function renderNotifications(email: string) {
  shell(notificationsPageMarkup(email, escapeHtml), true)
  await bindNotificationsPage({ escapeHtml, dateTime })
}

async function renderAudit(email: string) {
  shell(auditPageMarkup(email, escapeHtml), true)
  await bindAuditPage({ escapeHtml, dateTime })
}

async function render() {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) throw sessionError

    if (!session?.user) {
      renderLogin()
      return
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError) throw userError

    if (!user) {
      renderLogin('Your session could not be verified. Please sign in again.')
      return
    }

    const role = roleFor(user)
  if (!isAdminRole(role)) {
    renderForbidden(user.email || 'Signed-in account')
    return
  }

  const email = user.email || 'Core operator'
  if (location.hash === '#operations') {
    await renderOperations(email)
    return
  }

  if (location.hash === '#orders') {
    await renderOrders(email)
    return
  }

  if (location.hash === '#customers') {
    await renderCustomers(email)
    return
  }

  if (location.hash === '#catalog') {
    await renderCatalog(email)
    return
  }

  if (location.hash === '#analytics') {
    await renderAnalytics(email)
    return
  }

  if (location.hash === '#finance') {
    await renderFinance(email)
    return
  }

  if (location.hash === '#referrals') {
    await renderReferrals(email)
    return
  }

  if (location.hash === '#admin-tools') {
    await renderAdminTools(email)
    return
  }

  if (location.hash === '#notifications') {
    await renderNotifications(email)
    return
  }

  if (location.hash === '#audit') {
    await renderAudit(email)
    return
  }

    await renderExecutiveDashboard(email)
  } catch (error) {
    console.error('Core startup failed', error)
    renderLogin(
      error instanceof Error
        ? 'Core could not verify your session: ' + error.message
        : 'Core could not verify your session. Please sign in again.',
    )
  }
}

supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
    void render()
  }
})

window.addEventListener('hashchange', () => void render())

function enablePwaAutoRefresh() {
  if (!('serviceWorker' in navigator)) return

  const hadControllerAtBoot = Boolean(navigator.serviceWorker.controller)
  let reloadingForUpdate = false
  let lastUpdateCheck = 0

  const checkForUpdate = async () => {
    const now = Date.now()
    if (now - lastUpdateCheck < 15_000) return
    lastUpdateCheck = now

    try {
      const registration = await navigator.serviceWorker.getRegistration()
      await registration?.update()
    } catch (error) {
      console.warn('PWA update check failed', error)
    }
  }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadControllerAtBoot || reloadingForUpdate) return
    reloadingForUpdate = true
    window.location.reload()
  })

  window.addEventListener('load', () => void checkForUpdate())
  window.addEventListener('pageshow', () => void checkForUpdate())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void checkForUpdate()
  })
}

enablePwaAutoRefresh()

// Always paint a usable screen immediately. Fresh sessions should never wait on
// a remote auth request before the login UI appears.
renderLogin()
void render()
