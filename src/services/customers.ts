import { supabase } from './supabase'

export type CoreCustomerOrder = {
  id: string
  order_number: string | null
  status: string
  payment_status: string
  total: number
  created_at: string
  updated_at: string
}

export type CoreCustomerReferral = {
  id: string
  referred_customer_id: string | null
  referred_name: string | null
  referred_email: string | null
  referral_code: string | null
  status: string
  reward_type: string | null
  reward_value: number | null
  referred_at: string
  qualified_at: string | null
  converted_at: string | null
  qualifying_order_number: string | null
}

export type CoreCustomerReward = {
  id: string
  reward_type: string
  reward_value: number | null
  title: string | null
  description: string | null
  status: string
  milestone_threshold: number | null
  reserved_at: string | null
  redeemed_at: string | null
  expires_at: string | null
  created_at: string
}

export type CoreCustomer = {
  id: string
  customer_number: string | null
  first_name: string | null
  last_name: string | null
  email: string
  phone: string | null
  account_status: string
  address_line_1: string | null
  address_line_2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  preferred_contact_method: string | null
  notes: string | null
  original_created_at: string | null
  last_login_at: string | null
  created_at: string
  updated_at: string
  referral_code: string | null
  membership: {
    id: string
    name: string
    slug: string
    description: string | null
    benefits: unknown
  } | null
  metrics: {
    order_count: number
    paid_order_count: number
    lifetime_spend: number
    latest_order_at: string | null
    referral_count: number
    qualified_referral_count: number
    available_reward_count: number
  }
  orders: CoreCustomerOrder[]
  referrals: CoreCustomerReferral[]
  rewards: CoreCustomerReward[]
}

export async function listCoreCustomers(): Promise<CoreCustomer[]> {
  const { data, error } = await supabase.functions.invoke('core-customers', { body: {} })
  if (error) throw error
  if (!data?.success) throw new Error(data?.error || 'Could not load customers')
  return data.customers || []
}
