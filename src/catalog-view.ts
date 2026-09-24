import { loadCoreCatalog, updateCatalogMetadata, type CoreCatalogProduct } from './services/catalog'

type Helpers = {
  escapeHtml: (value: unknown) => string
  money: (value: number | string | null | undefined) => string
  dateTime: (value: string | null | undefined) => string
}

function productCard(product: CoreCatalogProduct, helpers: Helpers) {
  const { escapeHtml, money, dateTime } = helpers
  const identifier = product.product_code || product.sku || product.source_key || 'No code'

  return '<article class="catalog-card" data-product-id="' + escapeHtml(product.id) + '">' +
    '<div class="catalog-card-head">' +
      '<div><span class="eyebrow">' + escapeHtml(identifier) + '</span>' +
      '<h2>' + escapeHtml(product.name) + '</h2>' +
      '<p>' + escapeHtml(product.product_type || 'Unclassified') + ' · ' +
        escapeHtml(product.category?.name || 'No category') + '</p></div>' +
      '<div class="catalog-tags">' +
        '<span class="catalog-status ' + (product.active ? 'active' : 'inactive') + '">' + (product.active ? 'Active' : 'Inactive') + '</span>' +
        '<span class="catalog-storefront">' + escapeHtml(product.storefront_status || 'No storefront status') + '</span>' +
      '</div>' +
    '</div>' +
    '<div class="catalog-meta-grid">' +
      '<div><span>Price</span><strong>' + money(product.price) + '</strong></div>' +
      '<div><span>Shipping source</span><strong>' + escapeHtml(product.shipping_from || '—') + '</strong></div>' +
      '<div><span>COA</span><strong>' + (product.coa_url ? 'Available' : 'Missing') + '</strong></div>' +
      '<div><span>Last sync</span><strong>' + escapeHtml(dateTime(product.source_synced_at)) + '</strong></div>' +
    '</div>' +
    '<div class="catalog-detail-row">' +
      '<span>Research name <strong>' + escapeHtml(product.research_name || '—') + '</strong></span>' +
      '<span>Purity <strong>' + escapeHtml(product.purity || '—') + '</strong></span>' +
      '<span>Quantity <strong>' + escapeHtml(product.quantity || '—') + '</strong></span>' +
      '<span>Lot <strong>' + escapeHtml(product.lot_number || '—') + '</strong></span>' +
    '</div>' +
    (product.coa_url
      ? '<div class="invoice-actions"><a class="button secondary" href="' + escapeHtml(product.coa_url) + '" target="_blank" rel="noreferrer">Open COA</a></div>'
      : '') +
    '<details class="catalog-editor"><summary>Edit Core metadata overlay</summary>' +
      '<p class="catalog-editor-note">Vendor-synced fields stay read-only. These Core metadata fields are separate and persist across vendor catalog syncs.</p>' +
      '<div class="catalog-editor-grid">' +
        '<label><span>Product code</span><input class="catalog-product-code" maxlength="120" value="' + escapeHtml(product.product_code || '') + '"></label>' +
        '<label><span>Research name</span><input class="catalog-research-name" maxlength="200" value="' + escapeHtml(product.research_name || '') + '"></label>' +
        '<label><span>Purity</span><input class="catalog-purity" maxlength="120" value="' + escapeHtml(product.purity || '') + '"></label>' +
        '<label><span>Quantity</span><input class="catalog-quantity" maxlength="120" value="' + escapeHtml(product.quantity || '') + '"></label>' +
        '<label><span>Lot number</span><input class="catalog-lot-number" maxlength="120" value="' + escapeHtml(product.lot_number || '') + '"></label>' +
        '<label class="catalog-span-2"><span>COA URL</span><input class="catalog-coa-url" type="url" maxlength="1000" value="' + escapeHtml(product.coa_url || '') + '"></label>' +
      '</div>' +
      '<div class="catalog-editor-actions"><p class="card-message catalog-editor-message" aria-live="polite"></p>' +
      '<button class="secondary save-catalog-metadata" type="button">Save Metadata</button></div>' +
    '</details>' +
  '</article>'
}

export function catalogPageMarkup(email: string, escapeHtml: Helpers['escapeHtml']) {
  return '<section class="dashboard-head"><div>' +
    '<span class="eyebrow">PRODUCT OPERATIONS</span><h1 class="dashboard-title">Catalog</h1>' +
    '<p class="copy">Operational visibility into product status, category, storefront state, sourcing, COA coverage, and catalog sync health.</p>' +
    '</div><div class="operator">Signed in as <strong>' + escapeHtml(email) + '</strong></div></section>' +
    '<section class="catalog-metrics" id="catalog-metrics"></section>' +
    '<section class="catalog-ops-grid">' +
      '<div class="catalog-ops-panel" id="catalog-feed-health"></div>' +
      '<div class="catalog-ops-panel" id="catalog-metadata-health"></div>' +
    '</section>' +
    '<section class="catalog-queue-panel" id="catalog-action-queue"></section>' +
    '<section class="catalog-queue-panel" id="catalog-discrepancies"></section>' +
    '<section class="catalog-toolbar"><label class="queue-search"><span class="sr-only">Search catalog</span>' +
    '<input id="catalog-search" type="search" placeholder="Search product, type, code, category…" autocomplete="off"></label>' +
    '<select id="catalog-category" aria-label="Filter catalog by category"><option value="all">All categories</option></select>' +
    '<select id="catalog-state" aria-label="Filter catalog by state">' +
      '<option value="all">All states</option><option value="active">Active</option><option value="inactive">Inactive</option>' +
      '<option value="metadata-incomplete">Metadata incomplete</option><option value="coa-missing">Missing COA</option>' +
      '<option value="vendor-discrepancy">Vendor discrepancy</option><option value="uncategorized">Uncategorized</option>' +
    '</select></section>' +
    '<p class="queue-summary" id="catalog-summary" aria-live="polite"></p>' +
    '<section class="catalog-sync" id="catalog-sync"></section>' +
    '<section class="catalog-list" id="catalog-list"><div class="loading">Loading catalog…</div></section>'
}

export async function bindCatalogPage(helpers: Helpers) {
  const list = document.querySelector<HTMLDivElement>('#catalog-list')
  if (!list) return

  try {
    const payload = await loadCoreCatalog()
    const { products, categories, metrics, operations, sync_runs: syncRuns } = payload

    const metricEl = document.querySelector<HTMLDivElement>('#catalog-metrics')
    if (metricEl) {
      metricEl.innerHTML =
        '<div><span>Total</span><strong>' + metrics.total + '</strong></div>' +
        '<div><span>Active</span><strong>' + metrics.active + '</strong></div>' +
        '<div><span>Available</span><strong>' + metrics.available + '</strong></div>' +
        '<div><span>Metadata complete</span><strong>' + metrics.metadata_complete + '/' + metrics.active + '</strong></div>' +
        '<div><span>Completeness</span><strong>' + metrics.metadata_completeness_percent + '%</strong></div>' +
        '<div><span>Work queue</span><strong>' + metrics.action_queue + '</strong></div>' +
        '<div><span>Vendor exceptions</span><strong>' + metrics.discrepancy_count + '</strong></div>'
    }

    const feedEl = document.querySelector<HTMLDivElement>('#catalog-feed-health')
    if (feedEl) {
      const feed = operations.feed
      feedEl.classList.toggle('attention', feed.stale)
      feedEl.innerHTML =
        '<div class="catalog-ops-head"><div><span class="eyebrow">VENDOR FEED</span>' +
        '<h2>' + (feed.stale ? 'Needs attention' : 'Healthy') + '</h2></div>' +
        '<span class="catalog-health-pill ' + (feed.stale ? 'attention' : 'healthy') + '">' +
        (feed.stale ? 'STALE' : 'LIVE') + '</span></div>' +
        '<p>Latest sync: <strong>' + helpers.escapeHtml(helpers.dateTime(feed.latest_sync_at)) + '</strong></p>' +
        '<div class="catalog-ops-stats">' +
          '<span>Age <strong>' + (feed.age_minutes ?? '—') + ' min</strong></span>' +
          '<span>Received <strong>' + (feed.latest_received_count ?? '—') + '</strong></span>' +
          '<span>Upserted <strong>' + (feed.latest_upserted_count ?? '—') + '</strong></span>' +
          '<span>Recent success <strong>' + feed.recent_successful_runs + '/' + feed.recent_run_count + '</strong></span>' +
        '</div>' +
        '<small>Vendor feed remains the source of truth. Core flags it stale after ' +
        feed.stale_after_minutes + ' minutes without a successful refresh.</small>'
    }

    const metadataEl = document.querySelector<HTMLDivElement>('#catalog-metadata-health')
    if (metadataEl) {
      const missing = operations.metadata.missing
      metadataEl.innerHTML =
        '<div class="catalog-ops-head"><div><span class="eyebrow">CORE METADATA</span>' +
        '<h2>' + operations.metadata.completeness_percent + '% complete</h2></div>' +
        '<span class="catalog-health-pill">' + operations.metadata.complete_products + '/' +
        operations.metadata.active_products + ' COMPLETE</span></div>' +
        '<div class="catalog-missing-grid">' +
          '<button type="button" data-ops-filter="coa-missing"><span>COA</span><strong>' + (missing.coa_url ?? 0) + '</strong></button>' +
          '<button type="button" data-ops-filter="metadata-incomplete"><span>Product code</span><strong>' + (missing.product_code ?? 0) + '</strong></button>' +
          '<button type="button" data-ops-filter="metadata-incomplete"><span>Research name</span><strong>' + (missing.research_name ?? 0) + '</strong></button>' +
          '<button type="button" data-ops-filter="metadata-incomplete"><span>Purity</span><strong>' + (missing.purity ?? 0) + '</strong></button>' +
          '<button type="button" data-ops-filter="metadata-incomplete"><span>Quantity</span><strong>' + (missing.quantity ?? 0) + '</strong></button>' +
          '<button type="button" data-ops-filter="metadata-incomplete"><span>Lot</span><strong>' + (missing.lot_number ?? 0) + '</strong></button>' +
        '</div>'
    }

    const queueEl = document.querySelector<HTMLDivElement>('#catalog-action-queue')
    if (queueEl) {
      const rows = operations.action_queue.slice(0, 12)
      queueEl.innerHTML =
        '<div class="catalog-queue-head"><div><span class="eyebrow">ACTION QUEUE</span>' +
        '<h2>Core metadata work</h2><p>Vendor-safe fields that can be completed in Core.</p></div>' +
        '<strong>' + operations.action_queue.length + ' products</strong></div>' +
        (rows.length
          ? '<div class="catalog-queue-list">' + rows.map(item =>
              '<button type="button" class="catalog-queue-row jump-to-product" data-product-id="' +
              helpers.escapeHtml(item.product_id) + '">' +
                '<span><strong>' + helpers.escapeHtml(item.name) + '</strong><small>' +
                helpers.escapeHtml(item.category_name || 'No vendor category') + '</small></span>' +
                '<span class="catalog-missing-chips">' +
                  item.missing_fields.map(field => '<i>' + helpers.escapeHtml(field.label) + '</i>').join('') +
                '</span>' +
                '<b>' + item.missing_count + '</b>' +
              '</button>'
            ).join('') + '</div>' +
            (operations.action_queue.length > rows.length
              ? '<p class="catalog-queue-more">Showing the first ' + rows.length +
                '. Use “Metadata incomplete” to view the full queue.</p>' : '')
          : '<div class="empty-state compact"><strong>Metadata queue clear.</strong></div>')
    }

    const discrepancyEl = document.querySelector<HTMLDivElement>('#catalog-discrepancies')
    if (discrepancyEl) {
      const rows = operations.discrepancies.slice(0, 10)
      discrepancyEl.classList.toggle('has-items', rows.length > 0)
      discrepancyEl.innerHTML =
        '<div class="catalog-queue-head"><div><span class="eyebrow">VENDOR EXCEPTIONS</span>' +
        '<h2>Feed discrepancies</h2><p>Investigate these without overriding vendor-owned fields.</p></div>' +
        '<strong>' + operations.discrepancies.length + ' exceptions</strong></div>' +
        (rows.length
          ? '<div class="catalog-queue-list">' + rows.map(item =>
              '<button type="button" class="catalog-queue-row jump-to-product" data-product-id="' +
              helpers.escapeHtml(item.product_id) + '">' +
                '<span><strong>' + helpers.escapeHtml(item.name) + '</strong><small>' +
                helpers.escapeHtml(item.category_name || 'No vendor category') + '</small></span>' +
                '<span class="catalog-issue-copy">' + helpers.escapeHtml(item.issues.join(' · ')) + '</span>' +
                '<b>!</b>' +
              '</button>'
            ).join('') + '</div>'
          : '<div class="empty-state compact"><strong>No vendor-feed discrepancies detected.</strong></div>')
    }

    const syncEl = document.querySelector<HTMLDivElement>('#catalog-sync')
    if (syncEl) {
      const rows = syncRuns.slice(0, 6)
      syncEl.innerHTML =
        '<div><span class="eyebrow">SYNC HISTORY</span><strong>Vendor catalog refreshes</strong>' +
        '<p>Read-only history from the vendor-backed Google catalog sync.</p>' +
        (rows.length
          ? '<div class="catalog-sync-history">' + rows.map(run =>
              '<div class="catalog-sync-row">' +
                '<strong class="' + (run.status.toLowerCase() === 'completed' ? 'success' : 'failure') + '">' +
                  helpers.escapeHtml(run.status) + '</strong>' +
                '<span>' + helpers.escapeHtml(helpers.dateTime(run.completed_at || run.started_at)) + '</span>' +
                '<span>' + (run.received_count ?? 0) + ' received · ' + (run.upserted_count ?? 0) + ' upserted</span>' +
                '<span>' + (run.deactivated_count ?? 0) + ' deactivated</span>' +
              '</div>'
            ).join('') + '</div>'
          : '<div class="empty-state compact"><strong>No sync history yet.</strong></div>') +
        '</div>'
    }

    list.innerHTML = products.length
      ? products.map(product => productCard(product, helpers)).join('')
      : '<div class="empty-state"><h2>No products found.</h2></div>'

    const categorySelect = document.querySelector<HTMLSelectElement>('#catalog-category')
    if (categorySelect) {
      categorySelect.insertAdjacentHTML('beforeend', categories.map(category =>
        '<option value="' + helpers.escapeHtml(category.slug) + '">' + helpers.escapeHtml(category.name) + '</option>'
      ).join(''))
    }

    let search = ''
    let category = 'all'
    let state = 'all'
    const metadataQueueIds = new Set(operations.action_queue.map(item => item.product_id))
    const discrepancyIds = new Set(operations.discrepancies.map(item => item.product_id))

    const apply = () => {
      let shown = 0
      document.querySelectorAll<HTMLElement>('.catalog-card').forEach(card => {
        const product = products.find(item => item.id === card.dataset.productId)
        if (!product) return
        const haystack = [
          product.name, product.research_name, product.product_code, product.sku,
          product.source_key, product.product_type, product.category?.name,
          product.shipping_from, product.storefront_status
        ].filter(Boolean).join(' ').toLowerCase()

        const categoryMatch = category === 'all' || product.category?.slug === category
        const stateMatch =
          state === 'all' ||
          (state === 'active' && product.active) ||
          (state === 'inactive' && !product.active) ||
          (state === 'metadata-incomplete' && metadataQueueIds.has(product.id)) ||
          (state === 'coa-missing' && !product.coa_url) ||
          (state === 'vendor-discrepancy' && discrepancyIds.has(product.id)) ||
          (state === 'uncategorized' && !product.category_id)
        const visible = categoryMatch && stateMatch && (!search || haystack.includes(search))
        card.hidden = !visible
        if (visible) shown += 1
      })

      const summary = document.querySelector<HTMLParagraphElement>('#catalog-summary')
      if (summary) summary.textContent = shown + ' of ' + products.length + ' products shown.'
    }

    document.querySelectorAll<HTMLButtonElement>('.save-catalog-metadata').forEach(button => {
      button.addEventListener('click', async () => {
        const card = button.closest<HTMLElement>('.catalog-card')
        const productId = card?.dataset.productId
        const message = card?.querySelector<HTMLParagraphElement>('.catalog-editor-message')
        if (!productId) return

        const product = products.find(item => item.id === productId)
        if (!product) return

        const value = (selector: string) =>
          card?.querySelector<HTMLInputElement>(selector)?.value.trim() || ''

        const payload = {
          productCode: value('.catalog-product-code'),
          researchName: value('.catalog-research-name'),
          purity: value('.catalog-purity'),
          quantity: value('.catalog-quantity'),
          lotNumber: value('.catalog-lot-number'),
          coaUrl: value('.catalog-coa-url'),
        }

        button.disabled = true
        button.textContent = 'Saving…'
        if (message) message.textContent = 'Saving audited catalog metadata…'

        try {
          const updated = await updateCatalogMetadata(productId, payload)
          product.product_code = updated.product_code
          product.research_name = updated.research_name
          product.purity = updated.purity
          product.quantity = updated.quantity
          product.lot_number = updated.lot_number
          product.coa_url = updated.coa_url
          product.updated_at = updated.updated_at

          const identifier = updated.product_code || product.sku || product.source_key || 'No code'
          const eyebrow = card.querySelector<HTMLElement>('.catalog-card-head .eyebrow')
          if (eyebrow) eyebrow.textContent = identifier

          if (message) message.textContent = 'Saved. Audit event recorded. Refreshing operations…'
          await bindCatalogPage(helpers)
        } catch (error) {
          if (message) message.textContent = error instanceof Error ? error.message : 'Could not save metadata.'
        } finally {
          button.disabled = false
          button.textContent = 'Save Metadata'
        }
      })
    })

    document.querySelectorAll<HTMLButtonElement>('[data-ops-filter]').forEach(button => {
      button.addEventListener('click', () => {
        state = button.dataset.opsFilter || 'all'
        const stateSelect = document.querySelector<HTMLSelectElement>('#catalog-state')
        if (stateSelect) stateSelect.value = state
        apply()
        document.querySelector('#catalog-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    })

    document.querySelectorAll<HTMLButtonElement>('.jump-to-product').forEach(button => {
      button.addEventListener('click', () => {
        const productId = button.dataset.productId
        if (!productId) return

        search = ''
        category = 'all'
        state = 'all'
        const searchInput = document.querySelector<HTMLInputElement>('#catalog-search')
        const categoryInput = document.querySelector<HTMLSelectElement>('#catalog-category')
        const stateInput = document.querySelector<HTMLSelectElement>('#catalog-state')
        if (searchInput) searchInput.value = ''
        if (categoryInput) categoryInput.value = 'all'
        if (stateInput) stateInput.value = 'all'
        apply()

        const card = document.querySelector<HTMLElement>('.catalog-card[data-product-id="' + productId + '"]')
        if (!card) return
        const editor = card.querySelector<HTMLDetailsElement>('.catalog-editor')
        if (editor) editor.open = true
        card.scrollIntoView({ behavior: 'smooth', block: 'center' })
        card.classList.add('catalog-card-focus')
        window.setTimeout(() => card.classList.remove('catalog-card-focus'), 1800)
      })
    })

    document.querySelector<HTMLInputElement>('#catalog-search')?.addEventListener('input', event => {
      search = (event.currentTarget as HTMLInputElement).value.trim().toLowerCase()
      apply()
    })
    categorySelect?.addEventListener('change', event => {
      category = (event.currentTarget as HTMLSelectElement).value
      apply()
    })
    document.querySelector<HTMLSelectElement>('#catalog-state')?.addEventListener('change', event => {
      state = (event.currentTarget as HTMLSelectElement).value
      apply()
    })
    apply()
  } catch (error) {
    list.innerHTML = '<div class="empty-state error-state"><h2>Could not load catalog.</h2><p>' +
      helpers.escapeHtml(error instanceof Error ? error.message : 'Unknown error') + '</p></div>'
  }
}
