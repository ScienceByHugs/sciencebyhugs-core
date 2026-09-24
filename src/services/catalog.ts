import { supabase } from './supabase'

export type CoreCatalogCategory = {
  id: string
  name: string
  slug: string
  description: string | null
  sort_order: number
  active: boolean
}

export type CoreCatalogProduct = {
  id: string
  product_code: string | null
  sku: string | null
  name: string
  research_name: string | null
  category_id: string | null
  description: string | null
  purity: string | null
  quantity: string | null
  lot_number: string | null
  coa_url: string | null
  price: number
  active: boolean
  featured: boolean
  sort_order: number
  image_url: string | null
  product_type: string | null
  shipping_from: string | null
  source: string | null
  storefront_status: string | null
  source_key: string | null
  sync_source: string | null
  last_sync_run_id: string | null
  source_synced_at: string | null
  created_at: string
  updated_at: string
  category: CoreCatalogCategory | null
}

export type CoreCatalogSyncRun = {
  id: string
  source: string | null
  status: string
  received_count: number | null
  upserted_count: number | null
  deactivated_count: number | null
  error_message: string | null
  started_at: string
  completed_at: string | null
}

export type CoreCatalogMissingField = {
  key: 'product_code' | 'research_name' | 'purity' | 'quantity' | 'lot_number' | 'coa_url'
  label: string
}

export type CoreCatalogActionItem = {
  product_id: string
  name: string
  product_code: string | null
  category_name: string | null
  source_synced_at: string | null
  missing_fields: CoreCatalogMissingField[]
  missing_count: number
  priority: 'high' | 'medium' | 'low'
}

export type CoreCatalogDiscrepancy = {
  product_id: string
  name: string
  category_name: string | null
  storefront_status: string | null
  active: boolean
  source_synced_at: string | null
  issues: string[]
}

export type CoreCatalogOperations = {
  feed: {
    status: 'healthy' | 'attention'
    stale: boolean
    latest_sync_at: string | null
    age_minutes: number | null
    latest_run_status: string | null
    source: string | null
    latest_received_count: number | null
    latest_upserted_count: number | null
    latest_deactivated_count: number | null
    recent_successful_runs: number
    recent_run_count: number
    stale_after_minutes: number
  }
  metadata: {
    active_products: number
    complete_products: number
    completeness_percent: number
    missing: Record<string, number>
  }
  action_queue: CoreCatalogActionItem[]
  discrepancies: CoreCatalogDiscrepancy[]
}

export type CoreCatalogPayload = {
  generated_at: string
  metrics: {
    total: number
    active: number
    available: number
    featured: number
    with_coa: number
    missing_category: number
    metadata_complete: number
    metadata_completeness_percent: number
    action_queue: number
    discrepancy_count: number
  }
  operations: CoreCatalogOperations
  categories: CoreCatalogCategory[]
  products: CoreCatalogProduct[]
  sync_runs: CoreCatalogSyncRun[]
}

export async function loadCoreCatalog(): Promise<CoreCatalogPayload> {
  const { data, error } = await supabase.functions.invoke('core-catalog', { body: {} })
  if (error) throw error
  if (!data?.success) throw new Error(data?.error || 'Could not load catalog')
  return data as CoreCatalogPayload
}


export type CatalogMetadataUpdate = {
  productCode: string
  researchName: string
  purity: string
  quantity: string
  lotNumber: string
  coaUrl: string
}

export async function updateCatalogMetadata(productId: string, metadata: CatalogMetadataUpdate) {
  const { data, error } = await supabase.functions.invoke('core-catalog-control', {
    body: {
      action: 'update_metadata',
      productId,
      ...metadata,
    },
  })

  if (error) throw error
  if (!data?.success) throw new Error(data?.error || 'Could not update catalog metadata')
  return data.product as Pick<
    CoreCatalogProduct,
    'id' | 'name' | 'product_code' | 'research_name' | 'purity' |
    'quantity' | 'lot_number' | 'coa_url' | 'updated_at'
  >
}
