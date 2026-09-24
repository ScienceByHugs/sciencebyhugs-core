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
