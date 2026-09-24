import { supabase } from './supabase'

export type CoreDashboard = {
  generated_at: string
  attention: {
    awaiting_invoice_approval: number
    ready_to_send: number
    payment_submitted: number
    delayed_orders: number
    active_unpaid_orders: number
    missing_coa: number
    uncategorized_products: number
  }
  business: {
    paid_revenue: number
    paid_orders: number
    average_paid_order: number
    customers: number
    active_customers: number
    repeat_customers: number
    new_customers_30d: number
    revenue_7d: number
    revenue_30d: number
    orders_7d: number
    orders_30d: number
  }
  operations: {
    fulfillment: Record<string, number>
    payment_mix: Array<{ method: string; count: number; amount: number }>
    recent_orders: Array<{
      id: string
      order_number: string | null
      customer_id: string | null
      status: string
      payment_status: string
      payment_method: string | null
      total: number
      created_at: string
      updated_at: string
    }>
  }
  customers: {
    membership_mix: Array<{ membership: string; count: number }>
    referrals_total: number
    qualified_referrals: number
    available_rewards: number
    top_customers: Array<{
      id: string
      customer_number: string | null
      name: string
      order_count: number
      paid_spend: number
    }>
  }
  catalog: {
    total: number
    active: number
    available: number
    featured: number
    with_coa: number
    missing_coa: number
    uncategorized: number
    latest_sync: {
      id: string
      source: string | null
      status: string
      received_count: number | null
      upserted_count: number | null
      deactivated_count: number | null
      error_message: string | null
      started_at: string
      completed_at: string | null
    } | null
  }
}

export async function loadCoreDashboard(): Promise<CoreDashboard> {
  const { data, error } = await supabase.functions.invoke('core-dashboard', { body: {} })
  if (error) throw error
  if (!data?.success) throw new Error(data?.error || 'Could not load dashboard')
  return data as CoreDashboard
}
