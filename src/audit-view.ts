import { listCoreAuditEvents } from './services/audit'

type Helpers = {
  escapeHtml: (value: unknown) => string
  dateTime: (value: string | null | undefined) => string
}

function readableAction(action: string) {
  return action
    .split('.')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' · ')
}

export function auditPageMarkup(email: string, escapeHtml: Helpers['escapeHtml']) {
  return '<section class="dashboard-head"><div>' +
    '<span class="eyebrow">CONTROL HISTORY</span><h1 class="dashboard-title">Audit Log</h1>' +
    '<p class="copy">A read-only history of controlled Core changes, including who made the change and what record was affected.</p>' +
    '</div><div class="operator">Signed in as <strong>' + escapeHtml(email) + '</strong></div></section>' +
    '<section class="audit-toolbar"><label class="queue-search"><span class="sr-only">Search audit log</span>' +
    '<input id="audit-search" type="search" placeholder="Search action, operator, entity…" autocomplete="off"></label></section>' +
    '<p class="queue-summary" id="audit-summary" aria-live="polite"></p>' +
    '<section class="audit-list" id="audit-list"><div class="loading">Loading audit history…</div></section>'
}

export async function bindAuditPage(helpers: Helpers) {
  const list = document.querySelector<HTMLDivElement>('#audit-list')
  if (!list) return

  try {
    const events = await listCoreAuditEvents()
    list.innerHTML = events.length
      ? events.map(event => {
          const beforeNotes = typeof event.before_data?.notes === 'string' ? event.before_data.notes : ''
          const afterNotes = typeof event.after_data?.notes === 'string' ? event.after_data.notes : ''
          const customerNumber = typeof event.metadata?.customer_number === 'string'
            ? event.metadata.customer_number
            : ''

          return '<article class="audit-card" data-audit-id="' + helpers.escapeHtml(event.id) + '">' +
            '<div class="audit-card-head"><div><span class="eyebrow">' + helpers.escapeHtml(readableAction(event.action)) + '</span>' +
            '<h2>' + helpers.escapeHtml(customerNumber || event.entity_type + ' ' + event.entity_id) + '</h2></div>' +
            '<time>' + helpers.escapeHtml(helpers.dateTime(event.created_at)) + '</time></div>' +
            '<div class="audit-meta"><span>Operator <strong>' + helpers.escapeHtml(event.actor_email || event.actor_user_id) + '</strong></span>' +
            '<span>Role <strong>' + helpers.escapeHtml(event.actor_role) + '</strong></span>' +
            '<span>Entity <strong>' + helpers.escapeHtml(event.entity_type) + '</strong></span></div>' +
            (event.action === 'customer.notes.update'
              ? '<div class="audit-change"><div><span>Before</span><p>' + helpers.escapeHtml(beforeNotes || '—') +
                '</p></div><div><span>After</span><p>' + helpers.escapeHtml(afterNotes || '—') + '</p></div></div>'
              : event.action === 'customer.contact_preference.update'
                ? '<div class="audit-change"><div><span>Before</span><p>' +
                  helpers.escapeHtml(String(event.before_data?.preferred_contact_method || '—')) +
                  '</p></div><div><span>After</span><p>' +
                  helpers.escapeHtml(String(event.after_data?.preferred_contact_method || '—')) +
                  '</p></div></div>'
                : event.action === 'customer.membership.update'
                  ? '<div class="audit-change"><div><span>Before</span><p>' +
                    helpers.escapeHtml(String(event.before_data?.membership_name || '—')) +
                    '</p></div><div><span>After</span><p>' +
                    helpers.escapeHtml(String(event.after_data?.membership_name || '—')) +
                    '</p></div></div>'
                  : event.action === 'customer.account_status.update'
                    ? '<div class="audit-change"><div><span>Before</span><p>' +
                      helpers.escapeHtml(String(event.before_data?.account_status || '—')) +
                      '</p></div><div><span>After</span><p>' +
                      helpers.escapeHtml(String(event.after_data?.account_status || '—')) +
                      '</p></div></div>'
                    : '') +
          '</article>'
        }).join('')
      : '<div class="empty-state"><h2>No controlled changes yet.</h2><p>New audited actions will appear here.</p></div>'

    let search = ''
    const apply = () => {
      let shown = 0
      document.querySelectorAll<HTMLElement>('.audit-card').forEach(card => {
        const event = events.find(item => item.id === card.dataset.auditId)
        if (!event) return
        const haystack = [
          event.action, event.actor_email, event.actor_role, event.entity_type,
          event.entity_id, event.metadata?.customer_number
        ].filter(Boolean).join(' ').toLowerCase()
        const visible = !search || haystack.includes(search)
        card.hidden = !visible
        if (visible) shown += 1
      })
      const summary = document.querySelector<HTMLParagraphElement>('#audit-summary')
      if (summary) summary.textContent = shown + ' of ' + events.length + ' audit events shown.'
    }

    document.querySelector<HTMLInputElement>('#audit-search')?.addEventListener('input', event => {
      search = (event.currentTarget as HTMLInputElement).value.trim().toLowerCase()
      apply()
    })
    apply()
  } catch (error) {
    list.innerHTML = '<div class="empty-state error-state"><h2>Could not load audit history.</h2><p>' +
      helpers.escapeHtml(error instanceof Error ? error.message : 'Unknown error') + '</p></div>'
  }
}
