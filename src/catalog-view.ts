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
    '<section class="catalog-toolbar"><label class="queue-search"><span class="sr-only">Search catalog</span>' +
    '<input id="catalog-search" type="search" placeholder="Search product, type, code, category…" autocomplete="off"></label>' +
    '<select id="catalog-category" aria-label="Filter catalog by category"><option value="all">All categories</option></select>' +
    '<select id="catalog-state" aria-label="Filter catalog by state">' +
      '<option value="all">All states</option><option value="active">Active</option><option value="inactive">Inactive</option>' +
      '<option value="coa-missing">Missing COA</option><option value="uncategorized">Uncategorized</option>' +
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
    const { products, categories, metrics, sync_runs: syncRuns } = payload

    const metricEl = document.querySelector<HTMLDivElement>('#catalog-metrics')
    if (metricEl) {
      metricEl.innerHTML =
        '<div><span>Total</span><strong>' + metrics.total + '</strong></div>' +
        '<div><span>Active</span><strong>' + metrics.active + '</strong></div>' +
        '<div><span>Available</span><strong>' + metrics.available + '</strong></div>' +
        '<div><span>COA coverage</span><strong>' + metrics.with_coa + '/' + metrics.total + '</strong></div>' +
        '<div><span>Uncategorized</span><strong>' + metrics.missing_category + '</strong></div>'
    }

    const syncEl = document.querySelector<HTMLDivElement>('#catalog-sync')
    const latestSync = syncRuns[0]
    if (syncEl && latestSync) {
      syncEl.innerHTML = '<div><span class="eyebrow">LATEST CATALOG SYNC</span>' +
        '<strong>' + helpers.escapeHtml(latestSync.status) + '</strong>' +
        '<p>' + (latestSync.received_count ?? 0) + ' received · ' +
        (latestSync.upserted_count ?? 0) + ' upserted · ' +
        (latestSync.deactivated_count ?? 0) + ' deactivated · ' +
        helpers.escapeHtml(helpers.dateTime(latestSync.completed_at || latestSync.started_at)) + '</p>' +
        (latestSync.error_message ? '<p class="form-message">' + helpers.escapeHtml(latestSync.error_message) + '</p>' : '') +
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
          (state === 'coa-missing' && !product.coa_url) ||
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

          if (message) message.textContent = 'Saved. Audit event recorded.'
          apply()
        } catch (error) {
          if (message) message.textContent = error instanceof Error ? error.message : 'Could not save metadata.'
        } finally {
          button.disabled = false
          button.textContent = 'Save Metadata'
        }
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
