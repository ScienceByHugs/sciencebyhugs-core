import { supabase } from './supabase'

export type CoreAuditEvent = {
  id: string
  actor_user_id: string
  actor_email: string | null
  actor_role: string
  action: string
  entity_type: string
  entity_id: string
  before_data: Record<string, unknown> | null
  after_data: Record<string, unknown> | null
  metadata: Record<string, unknown>
  created_at: string
}

export async function listCoreAuditEvents(): Promise<CoreAuditEvent[]> {
  const { data, error } = await supabase.functions.invoke('core-audit', { body: {} })
  if (error) throw error
  if (!data?.success) throw new Error(data?.error || 'Could not load audit log')
  return data.events || []
}
