import { supabase } from './supabase'

export type CoreNotification = {
  id: string
  severity: 'critical' | 'warning' | 'info'
  category: string
  title: string
  detail: string
  href: string
  created_at: string | null
}

export type CoreNotificationsPayload = {
  generated_at: string
  summary: { total: number; critical: number; warning: number; info: number }
  notifications: CoreNotification[]
}

export async function loadCoreNotifications(): Promise<CoreNotificationsPayload> {
  const { data, error } = await supabase.functions.invoke('core-notifications', { body: {} })
  if (error) throw error
  if (!data?.success) throw new Error(data?.error || 'Could not load notifications')
  return data as CoreNotificationsPayload
}


export type NexusPushRecipient = {
  id: string
  authUserId: string
  customerNumber: string | null
  firstName: string | null
  lastName: string | null
  email: string
  accountStatus: string
  pushEnabled: boolean
}

export async function loadNexusPushRecipients(): Promise<{ recipients: NexusPushRecipient[]; subscribedCount: number }> {
  const { data, error } = await supabase.functions.invoke('core-nexus-push', {
    body: { action: 'list' },
  })
  if (error) throw error
  if (!data?.success) throw new Error(data?.error || 'Could not load Nexus push recipients')
  return {
    recipients: data.recipients || [],
    subscribedCount: Number(data.subscribedCount || 0),
  }
}

export async function sendNexusPush(input: {
  mode: 'all' | 'individual'
  customerId?: string
  title: string
  message: string
}) {
  const { data, error } = await supabase.functions.invoke('core-nexus-push', {
    body: {
      action: 'send',
      mode: input.mode,
      customerId: input.customerId || null,
      title: input.title,
      message: input.message,
      url: './',
    },
  })
  if (error) throw error
  if (!data?.success) throw new Error(data?.error || 'Could not send Nexus notification')
  return data as { success: true; queued: number }
}
