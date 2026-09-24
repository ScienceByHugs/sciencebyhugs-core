import { loadCoreNotifications } from './services/notifications'

type Helpers = {
  escapeHtml: (value: unknown) => string
  dateTime: (value: string | null | undefined) => string
}

export function notificationsPageMarkup(email: string, escapeHtml: Helpers['escapeHtml']) {
  return '<section class="dashboard-head"><div>' +
    '<span class="eyebrow">ATTENTION CENTER</span><h1 class="dashboard-title">Notifications</h1>' +
    '<p class="copy">A read-only queue of operational signals that need review across payments, fulfillment, invoices, catalog, accounts, and referrals.</p>' +
    '</div><div class="operator">Signed in as <strong>' + escapeHtml(email) + '</strong></div></section>' +
    '<section id="notifications-root"><div class="loading">Loading notifications…</div></section>'
}

export async function bindNotificationsPage(helpers: Helpers) {
  const root = document.querySelector<HTMLDivElement>('#notifications-root')
  if (!root) return

  try {
    const data = await loadCoreNotifications()
    const s = data.summary
    root.innerHTML =
      '<section class="notification-kpis">' +
        '<div><span>Total</span><strong>' + s.total + '</strong></div>' +
        '<div><span>Critical</span><strong>' + s.critical + '</strong></div>' +
        '<div><span>Warning</span><strong>' + s.warning + '</strong></div>' +
        '<div><span>Info</span><strong>' + s.info + '</strong></div>' +
      '</section>' +
      '<section class="notification-panel">' +
        '<div class="dashboard-section-head"><div><span class="eyebrow">CURRENT SIGNALS</span><h2>' +
          (s.total ? s.total + ' items need review' : 'Queue clear') + '</h2></div></div>' +
        (data.notifications.length
          ? '<div class="notification-list">' + data.notifications.map(item =>
              '<a class="notification-row ' + helpers.escapeHtml(item.severity) + '" href="' + helpers.escapeHtml(item.href) + '">' +
                '<b>' + helpers.escapeHtml(item.severity.toUpperCase()) + '</b>' +
                '<span><strong>' + helpers.escapeHtml(item.title) + '</strong><small>' +
                  helpers.escapeHtml(item.category) + ' · ' + helpers.escapeHtml(item.detail) + '</small></span>' +
                '<time>' + helpers.escapeHtml(helpers.dateTime(item.created_at)) + '</time>' +
                '<i>Open →</i>' +
              '</a>'
            ).join('') + '</div>'
          : '<div class="empty-state compact"><strong>No active operational alerts.</strong></div>') +
      '</section>' +
      '<p class="dashboard-generated">Notifications generated ' + helpers.escapeHtml(helpers.dateTime(data.generated_at)) + '</p>'
  } catch (error) {
    root.innerHTML = '<div class="empty-state error-state"><h2>Could not load notifications.</h2><p>' +
      helpers.escapeHtml(error instanceof Error ? error.message : 'Unknown error') + '</p></div>'
  }
}
