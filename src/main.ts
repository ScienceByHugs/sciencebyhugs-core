import './styles.css'
import { supabase } from './services/supabase'
import { approveInvoice, listCoreInvoices, sendInvoice, type CoreInvoice } from './services/invoices'

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('App root not found')

const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0))

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const roleFor = (user: any) => String(user?.app_metadata?.role || '').trim().toLowerCase()
const isAdminRole = (role: string) => role === 'owner' || role === 'admin'

function shell(content: string, signedIn = false) {
  app.innerHTML = `
    <main class="shell">
      <header class="commandbar">
        <div><span class="eyebrow">SCIENCE BY HUGs</span><strong>CORE</strong></div>
        <div class="command-actions">
          <span class="status">SYSTEM READY</span>
          ${signedIn ? '<button class="ghost compact" id="sign-out">Sign out</button>' : ''}
        </div>
      </header>
      ${content}
    </main>`
  document.querySelector('#sign-out')?.addEventListener('click', async () => {
    await supabase.auth.signOut()
    await render()
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
    </section>`)
  document.querySelector<HTMLFormElement>('#login-form')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') || '').trim()
    const password = String(form.get('password') || '')
    const messageEl = document.querySelector<HTMLParagraphElement>('#login-message')
    const button = event.currentTarget.querySelector<HTMLButtonElement>('button[type="submit"]')
    if (messageEl) messageEl.textContent = 'Authenticating…'
    if (button) button.disabled = true
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      if (messageEl) messageEl.textContent = error.message
      if (button) button.disabled = false
      return
    }
    await render()
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
    </section>`, true)
}

function invoiceCard(invoice: CoreInvoice) {
  const awaiting = invoice.status === 'awaiting_approval'
  const sent = invoice.status === 'sent' || invoice.send_status === 'sent'
  const ready = invoice.status === 'approved' && invoice.pdf_status === 'created' && !sent
  const itemRows = invoice.items.map(item => `
    <div class="line-item">
      <div><strong>${escapeHtml(item.product_name)}</strong><span>${escapeHtml(item.product_code || '')}</span></div>
      <span>${item.quantity} × ${money(item.unit_price)}</span>
      <strong>${money(item.line_total)}</strong>
    </div>`).join('')
  const statusText = awaiting ? 'Awaiting Approval' : sent ? 'Invoice Sent' : ready ? 'PDF Ready' : invoice.status

  return `
    <article class="invoice-card" data-invoice-id="${escapeHtml(invoice.id)}">
      <div class="invoice-top">
        <div>
          <span class="eyebrow">${escapeHtml(invoice.invoice_number)}</span>
          <h2>${escapeHtml(invoice.customer_name_snapshot || 'Customer')}</h2>
          <p>${escapeHtml(invoice.customer_email_snapshot || '')}</p>
        </div>
        <span class="status-pill ${awaiting ? 'awaiting' : sent ? 'sent' : ready ? 'ready' : ''}">${escapeHtml(statusText)}</span>
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
        </div>` : ''}

      ${sent ? `
        <div class="send-preview sent-preview">
          <span class="eyebrow">DELIVERED BY EMAIL</span>
          <p>Sent to <strong>${escapeHtml(invoice.sent_to || invoice.customer_email_snapshot || '')}</strong>${invoice.sent_at ? ` on ${escapeHtml(new Date(invoice.sent_at).toLocaleString())}` : ''}.</p>
        </div>` : ''}

      <div class="invoice-actions">
        ${invoice.google_sheet_url ? `<a class="button secondary" href="${escapeHtml(invoice.google_sheet_url)}" target="_blank" rel="noreferrer">Open Sheet</a>` : ''}
        ${invoice.pdf_url ? `<a class="button secondary" href="${escapeHtml(invoice.pdf_url)}" target="_blank" rel="noreferrer">Open PDF</a>` : ''}
        ${awaiting ? `<button class="primary approve-button" data-id="${escapeHtml(invoice.id)}">Approve & Create PDF</button>` : ''}
        ${ready ? `<button class="primary send-button" data-id="${escapeHtml(invoice.id)}" data-number="${escapeHtml(invoice.invoice_number)}" data-recipient="${escapeHtml(invoice.customer_email_snapshot || '')}">Send Invoice</button>` : ''}
      </div>
      <p class="card-message" aria-live="polite"></p>
    </article>`
}

async function renderDashboard(email: string) {
  shell(`
    <section class="dashboard-head">
      <div>
        <span class="eyebrow">INVOICE OPERATIONS</span>
        <h1 class="dashboard-title">Invoice Control</h1>
        <p class="copy">Review requests, create approved PDFs, then send them as a separate controlled action.</p>
      </div>
      <div class="operator">Signed in as <strong>${escapeHtml(email)}</strong></div>
    </section>
    <section class="stats" id="stats"></section>
    <section class="invoice-list" id="invoice-list"><div class="loading">Loading invoice operations…</div></section>`, true)

  try {
    const invoices = await listCoreInvoices()
    const waiting = invoices.filter(i => i.status === 'awaiting_approval')
    const sent = invoices.filter(i => i.status === 'sent' || i.send_status === 'sent')
    const ready = invoices.filter(i => i.status === 'approved' && i.pdf_status === 'created' && i.send_status !== 'sent')
    const visible = [...waiting, ...ready, ...sent].slice(0, 50)

    const stats = document.querySelector<HTMLDivElement>('#stats')
    if (stats) stats.innerHTML = `
      <div><span>Awaiting approval</span><strong>${waiting.length}</strong></div>
      <div><span>Ready to send</span><strong>${ready.length}</strong></div>
      <div><span>Sent</span><strong>${sent.length}</strong></div>`

    const list = document.querySelector<HTMLDivElement>('#invoice-list')
    if (list) list.innerHTML = visible.length ? visible.map(invoiceCard).join('') : '<div class="empty-state"><h2>Queue clear.</h2><p>No invoice operations need attention.</p></div>'

    document.querySelectorAll<HTMLButtonElement>('.approve-button').forEach(button => {
      button.addEventListener('click', async () => {
        const invoiceId = button.dataset.id
        if (!invoiceId) return
        const message = button.closest<HTMLElement>('.invoice-card')?.querySelector<HTMLParagraphElement>('.card-message')
        button.disabled = true
        button.textContent = 'Creating PDF…'
        if (message) message.textContent = 'Approving invoice and generating the Drive PDF…'
        try {
          await approveInvoice(invoiceId)
          await renderDashboard(email)
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

        const message = button.closest<HTMLElement>('.invoice-card')?.querySelector<HTMLParagraphElement>('.card-message')
        button.disabled = true
        button.textContent = 'Sending…'
        if (message) message.textContent = `Sending ${invoiceNumber} to ${recipient}…`

        try {
          await sendInvoice(invoiceId)
          await renderDashboard(email)
        } catch (error) {
          if (message) message.textContent = error instanceof Error ? error.message : 'Send failed'
          button.disabled = false
          button.textContent = 'Send Invoice'
        }
      })
    })
  } catch (error) {
    const list = document.querySelector<HTMLDivElement>('#invoice-list')
    if (list) list.innerHTML = `<div class="empty-state error-state"><h2>Could not load Core.</h2><p>${escapeHtml(error instanceof Error ? error.message : 'Unknown error')}</p></div>`
  }
}

async function render() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return renderLogin()
  const role = roleFor(user)
  if (!isAdminRole(role)) return renderForbidden(user.email || 'Signed-in account')
  await renderDashboard(user.email || 'Core operator')
}

supabase.auth.onAuthStateChange(() => { void render() })
void render()
