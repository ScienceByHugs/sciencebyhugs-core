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

export async function loadAdminTools(): Promise<{
  templates: MessageTemplate[]
  inviteable_profiles: InviteableProfile[]
}> {
  const { data, error } = await supabase.functions.invoke('core-admin-tools', { body: { action: 'list' } })
  if (error) throw error
  if (!data?.success) throw new Error(data?.error || 'Could not load admin tools')
  return data
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
