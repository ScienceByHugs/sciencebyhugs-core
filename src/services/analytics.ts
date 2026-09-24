import { supabase } from './supabase'

export type AnalyticsPeriod = {
  days: number | null
  orders: number
  paid_orders: number
  revenue: number
  average_order: number
  new_customers: number
  purchasing_customers: number
  repeat_customers: number
}

export type AnalyticsDay = {
  date: string
  label: string
  orders: number
  paid_orders: number
  revenue: number
  new_customers: number
}

export type CoreAnalyticsPayload = {
  generated_at: string
  headline: {
    paid_revenue: number
    paid_orders: number
    average_paid_order: number
    customers: number
    active_customers: number
    purchasing_customers: number
    repeat_customers: number
    products: number
    active_products: number
  }
  periods: {
    '7': AnalyticsPeriod
    '30': AnalyticsPeriod
    '90': AnalyticsPeriod
    all: AnalyticsPeriod
  }
  series: {
    daily_90: AnalyticsDay[]
  }
  customers: {
    membership_mix: Array<{ membership: string; count: number }>
    top_customers: Array<{
      customer_id: string
      customer_number: string | null
      name: string
      paid_orders: number
      revenue: number
      last_order_at: string | null
    }>
  }
  orders: {
    status_mix: Array<{ status: string; count: number }>
    payment_mix: Array<{ method: string; count: number; revenue: number }>
  }
  referrals: {
    total: number
    qualified: number
    converted: number
    qualification_rate: number
    conversion_rate: number
    rewards_available: number
    rewards_redeemed: number
  }
  products: {
    top_products: Array<{
      product_id: string
      name: string
      product_code: string | null
      quantity: number
      revenue: number
      orders: number
    }>
  }
}

export async function loadCoreAnalytics(): Promise<CoreAnalyticsPayload> {
  const { data, error } = await supabase.functions.invoke('core-analytics', { body: {} })
  if (error) throw error
  if (!data?.success) throw new Error(data?.error || 'Could not load analytics')
  return data as CoreAnalyticsPayload
}
