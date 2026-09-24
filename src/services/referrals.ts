import { supabase } from './supabase'

export type ReferralMilestone = {
  threshold: number
  label: string
  behavior: string
}

export type ReferralReferrer = {
  customer_id: string
  customer_number: string | null
  name: string
  email: string | null
  referral_code: string | null
  membership: string
  account_status: string | null
  total: number
  qualified: number
  pending: number
  converted: number
  next_milestone: { threshold: number | null; label: string; remaining: number }
  available_rewards: number
  active_milestones: number
  redeemed_rewards: number
}

export type ReferralRecord = {
  id: string
  referrer_id: string | null
  referred_customer_id: string | null
  referred_name: string | null
  referred_email: string | null
  referral_code: string | null
  status: string | null
  reward_type: string | null
  reward_value: number | null
  referred_at: string | null
  converted_at: string | null
  qualified_at: string | null
  qualifying_order_number: string | null
  consent_confirmed: boolean | null
  notes: string | null
  created_at: string
  referrer_name: string
  referrer_number: string | null
  referred_customer_name: string | null
}

export type CoreReferralAdminPayload = {
  generated_at: string
  summary: {
    referrals: number
    qualified: number
    pending: number
    converted: number
    qualification_rate: number
    conversion_rate: number
    rewards_available: number
    rewards_active: number
    rewards_redeemed: number
  }
  milestones: ReferralMilestone[]
  referrers: ReferralReferrer[]
  referrals: ReferralRecord[]
  rewards: Array<Record<string, unknown>>
}

export async function loadCoreReferrals(): Promise<CoreReferralAdminPayload> {
  const { data, error } = await supabase.functions.invoke('core-referrals-admin', { body: {} })
  if (error) throw error
  if (!data?.success) throw new Error(data?.error || 'Could not load referrals')
  return data as CoreReferralAdminPayload
}
