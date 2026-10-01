import { supabase } from './supabase'

export type MessageTemplate = {
  id: string
  name: string
  message: string
  category: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export type InviteableProfile = {
  id: string
  customer_number: string | null
  first_name: string | null
  last_name: string | null
  email: string
  auth_user_id: string | null
  account_status: string | null
}

export type ActivationProfile = {
  id: string
  customer_number: string | null
  first_name: string | null
  last_name: string | null
  email: string
  account_status: string | null
}

export async function loadAdminTools(): Promise<{
  templates: MessageTemplate[]
  inviteable_profiles: InviteableProfile[]
  activation_profiles: ActivationProfile[]
}> {
  const [adminToolsResult, customersResult] = await Promise.all([
    supabase.functions.invoke('core-admin-tools', { body: { action: 'list' } }),
    supabase.functions.invoke('core-customers', { body: {} }),
  ])

  if (adminToolsResult.error) throw adminToolsResult.error
  if (!adminToolsResult.data?.success) throw new Error(adminToolsResult.data?.error || 'Could not load admin tools')

  if (customersResult.error) throw customersResult.error
  if (!customersResult.data?.success) throw new Error(customersResult.data?.error || 'Could not load customers')

  const activationProfiles = (customersResult.data.customers || [])
    .filter((customer: ActivationProfile) => String(customer.account_status || '').toLowerCase() === 'active')
    .map((customer: ActivationProfile) => ({
      id: customer.id,
      customer_number: customer.customer_number,
      first_name: customer.first_name,
      last_name: customer.last_name,
      email: customer.email,
      account_status: customer.account_status,
    }))

  return {
    ...adminToolsResult.data,
    activation_profiles: activationProfiles,
  }
}

export async function saveMessageTemplate(input: {
  templateId?: string
  name: string
  category: string
  message: string
  active: boolean
}) {
  const { data, error } = await supabase.functions.invoke('core-admin-tools', {
    body: { action: 'save_template', ...input },
  })
  if (error) throw error
  if (!data?.success) throw new Error(data?.error || 'Could not save template')
  return data.template as MessageTemplate
}

export async function inviteCustomerProfile(customerId: string) {
  const { data, error } = await supabase.functions.invoke('core-admin-tools', {
    body: { action: 'invite_profile', customerId },
  })
  if (error) throw error
  if (!data?.success) throw new Error(data?.error || 'Could not send invite')
  return data as { success: true; customerId: string; email: string }
}


export async function sendCustomerActivationEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail) throw new Error('Customer email is required')

  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: 'https://nexus.sciencebyhugs.com/?mode=invite',
  })

  if (error) throw error
  return { success: true as const, email: normalizedEmail }
}
