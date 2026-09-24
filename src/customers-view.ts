import { loadCoreCustomers, updateCustomerAccountStatus, updateCustomerContactPreference, updateCustomerMembership, updateCustomerNotes, type CoreCustomer, type CoreMembership } from './services/customers'

type Helpers = {
  escapeHtml: (value: unknown) => string
  money: (value: number | string | null | undefined) => string
  dateTime: (value: string | null | undefined) => string
}

function nameFor(customer: CoreCustomer) {
  return [customer.first_name, customer.last_name].filter(Boolean).join(' ') || 'Customer'
}

function customerCard(customer: CoreCustomer, memberships: CoreMembership[], helpers: Helpers) {
  const { escapeHtml, money, dateTime } = helpers
  const recentOrders = customer.orders.slice(0, 3)
  return '<article class="customer-card" data-customer-id="' + escapeHtml(customer.id) + '">' +
    '<div class="customer-card-head">' +
      '<div><span class="eyebrow">' + escapeHtml(customer.customer_number || 'CUSTOMER') + '</span>' +
      '<h2>' + escapeHtml(nameFor(customer)) + '</h2>' +
      '<p>' + escapeHtml(customer.email) + (customer.phone ? ' · ' + escapeHtml(customer.phone) : '') + '</p></div>' +
      '<div class="customer-tags">' +
        '<div class="membership-control"><label><span>Membership</span><select class="customer-membership-select">' +
          memberships.map(membership =>
            '<option value="' + escapeHtml(membership.id) + '"' +
              (customer.membership?.id === membership.id ? ' selected' : '') + '>' +
              escapeHtml(membership.name) + '</option>'
          ).join('') +
        '</select></label><p class="card-message membership-message" aria-live="polite"></p></div>' +
        '<div class="account-status-control"><label><span>Account</span><select class="customer-account-status">' +
          '<option value="Active"' + (customer.account_status.toLowerCase() === 'active' ? ' selected' : '') + '>Active</option>' +
          '<option value="Suspended"' + (customer.account_status.toLowerCase() === 'suspended' ? ' selected' : '') + '>Suspended</option>' +
        '</select></label><p class="card-message account-status-message" aria-live="polite"></p></div>' +
      '</div>' +
    '</div>' +
    '<div class="customer-metrics">' +
      '<div><span>Orders</span><strong>' + customer.metrics.order_count + '</strong></div>' +
      '<div><span>Lifetime spend</span><strong>' + money(customer.metrics.lifetime_spend) + '</strong></div>' +
      '<div><span>Referrals</span><strong>' + customer.metrics.referral_count + '</strong></div>' +
      '<div><span>Rewards</span><strong>' + customer.metrics.available_reward_count + '</strong></div>' +
    '</div>' +
    '<div class="customer-details">' +
      '<div class="contact-preference-control"><span>Preferred contact</span>' +
        '<select class="customer-contact-preference" aria-label="Preferred contact method">' +
          '<option value=""' + (!customer.preferred_contact_method ? ' selected' : '') + '>Not set</option>' +
          '<option value="email"' + (customer.preferred_contact_method?.toLowerCase() === 'email' ? ' selected' : '') + '>Email</option>' +
          '<option value="phone"' + (customer.preferred_contact_method?.toLowerCase() === 'phone' ? ' selected' : '') + '>Phone</option>' +
          '<option value="text"' + (['text','sms'].includes(customer.preferred_contact_method?.toLowerCase() || '') ? ' selected' : '') + '>Text</option>' +
        '</select>' +
        '<p class="card-message contact-preference-message" aria-live="polite"></p>' +
      '</div>' +
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
    '<div class="customer-notes-editor">' +
      '<label><span>Internal notes</span><textarea class="customer-notes-input" maxlength="2000" placeholder="Add internal customer context…">' +
        escapeHtml(customer.notes || '') +
      '</textarea></label>' +
      '<div class="customer-notes-actions"><p class="card-message customer-notes-message" aria-live="polite"></p>' +
      '<button class="secondary save-customer-notes" type="button">Save Notes</button></div>' +
    '</div>' +
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
    const { customers, memberships } = await loadCoreCustomers()
    list.innerHTML = customers.length
      ? customers.map(customer => customerCard(customer, memberships, helpers)).join('')
      : '<div class="empty-state"><h2>No customers yet.</h2><p>Customer profiles will appear here.</p></div>'

    const membershipSelect = document.querySelector<HTMLSelectElement>('#customers-membership')
    if (membershipSelect) {
      membershipSelect.insertAdjacentHTML('beforeend', memberships.map(membership =>
        '<option value="' + helpers.escapeHtml(membership.slug) + '">' +
          helpers.escapeHtml(membership.name) + '</option>'
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

    document.querySelectorAll<HTMLButtonElement>('.save-customer-notes').forEach(button => {
      button.addEventListener('click', async () => {
        const card = button.closest<HTMLElement>('.customer-card')
        const customerId = card?.dataset.customerId
        const textarea = card?.querySelector<HTMLTextAreaElement>('.customer-notes-input')
        const message = card?.querySelector<HTMLParagraphElement>('.customer-notes-message')

        if (!customerId || !textarea) return

        const customer = customers.find(item => item.id === customerId)
        if (!customer) return

        button.disabled = true
        button.textContent = 'Saving…'
        if (message) message.textContent = 'Saving audited note…'

        try {
          const updated = await updateCustomerNotes(customerId, textarea.value)
          customer.notes = updated.notes
          customer.updated_at = updated.updated_at
          textarea.value = updated.notes || ''
          if (message) message.textContent = 'Saved. Audit event recorded.'
        } catch (error) {
          if (message) message.textContent = error instanceof Error ? error.message : 'Could not save notes.'
        } finally {
          button.disabled = false
          button.textContent = 'Save Notes'
        }
      })
    })

    document.querySelectorAll<HTMLSelectElement>('.customer-contact-preference').forEach(select => {
      select.addEventListener('change', async () => {
        const card = select.closest<HTMLElement>('.customer-card')
        const customerId = card?.dataset.customerId
        const message = card?.querySelector<HTMLParagraphElement>('.contact-preference-message')

        if (!customerId) return
        const customer = customers.find(item => item.id === customerId)
        if (!customer) return

        const previous = customer.preferred_contact_method || ''
        const next = select.value || null
        select.disabled = true
        if (message) message.textContent = 'Saving audited preference…'

        try {
          const updated = await updateCustomerContactPreference(customerId, next)
          customer.preferred_contact_method = updated.preferred_contact_method
          customer.updated_at = updated.updated_at
          if (message) message.textContent = 'Saved. Audit event recorded.'
        } catch (error) {
          select.value = previous.toLowerCase() === 'sms' ? 'text' : previous.toLowerCase()
          if (message) message.textContent = error instanceof Error ? error.message : 'Could not save preference.'
        } finally {
          select.disabled = false
        }
      })
    })

    document.querySelectorAll<HTMLSelectElement>('.customer-membership-select').forEach(select => {
      select.addEventListener('change', async () => {
        const card = select.closest<HTMLElement>('.customer-card')
        const customerId = card?.dataset.customerId
        const message = card?.querySelector<HTMLParagraphElement>('.membership-message')
        if (!customerId) return

        const customer = customers.find(item => item.id === customerId)
        const nextMembership = memberships.find(item => item.id === select.value)
        if (!customer || !nextMembership) return

        const previousMembership = customer.membership
        const confirmed = window.confirm(
          'Change ' + nameFor(customer) + ' from ' +
          (previousMembership?.name || 'No membership') + ' to ' +
          nextMembership.name + '?\n\n' +
          'This change is audited. Customers with 20 qualified referrals may be automatically upgraded to Principal Scientist again by the referral system.'
        )

        if (!confirmed) {
          select.value = previousMembership?.id || ''
          return
        }

        select.disabled = true
        if (message) message.textContent = 'Saving audited membership change…'

        try {
          const updated = await updateCustomerMembership(customerId, nextMembership.id)
          customer.membership = updated.membership
          customer.updated_at = updated.customer.updated_at
          if (message) message.textContent = 'Saved. Audit event recorded.'
          apply()
        } catch (error) {
          select.value = previousMembership?.id || ''
          if (message) message.textContent = error instanceof Error ? error.message : 'Could not update membership.'
        } finally {
          select.disabled = false
        }
      })
    })

    document.querySelectorAll<HTMLSelectElement>('.customer-account-status').forEach(select => {
      select.addEventListener('change', async () => {
        const card = select.closest<HTMLElement>('.customer-card')
        const customerId = card?.dataset.customerId
        const message = card?.querySelector<HTMLParagraphElement>('.account-status-message')
        if (!customerId) return
        const customer = customers.find(item => item.id === customerId)
        if (!customer) return

        const previous = customer.account_status
        const next = select.value as 'Active' | 'Suspended'
        const confirmed = window.confirm(
          next === 'Suspended'
            ? 'Suspend ' + nameFor(customer) + '?\n\nThis blocks new Nexus checkout and invoice requests. The customer can still sign in and view their account/history.'
            : 'Reactivate ' + nameFor(customer) + '?\n\nThis restores Nexus checkout access.'
        )
        if (!confirmed) {
          select.value = previous.toLowerCase() === 'suspended' ? 'Suspended' : 'Active'
          return
        }

        select.disabled = true
        if (message) message.textContent = 'Saving audited account status…'
        try {
          const updated = await updateCustomerAccountStatus(customerId, next)
          customer.account_status = updated.account_status
          customer.updated_at = updated.updated_at
          if (message) message.textContent = 'Saved. Audit event recorded.'
        } catch (error) {
          select.value = previous.toLowerCase() === 'suspended' ? 'Suspended' : 'Active'
          if (message) message.textContent = error instanceof Error ? error.message : 'Could not update account status.'
        } finally {
          select.disabled = false
        }
      })
    })

    apply()
  } catch (error) {
    list.innerHTML = '<div class="empty-state error-state"><h2>Could not load customers.</h2><p>' +
      helpers.escapeHtml(error instanceof Error ? error.message : 'Unknown error') + '</p></div>'
  }
}
