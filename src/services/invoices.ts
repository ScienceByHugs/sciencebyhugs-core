import { supabase } from './supabase'

export type CoreInvoiceItem = {
  order_id: string
  product_id: string | null
  product_code: string | null
  product_name: string
  quantity: number
  unit_price: number
  line_total: number
}

export type CoreInvoice = {
  id: string
  invoice_number: string
  order_id: string | null
  customer_id: string
  status: string
  subtotal: number
  shipping_total: number
  discount_total: number
  tax_total: number
  total: number
  payment_method: string | null
  google_sheet_name: string | null
  google_sheet_url: string | null
  pdf_status: string | null
  pdf_url: string | null
  pdf_created_at: string | null
  created_at: string
  contact_method: string | null
  customer_name_snapshot: string | null
  customer_email_snapshot: string | null
  customer_phone_snapshot: string | null
  send_status: string
  sent_at: string | null
  sent_to: string | null
  items: CoreInvoiceItem[]
}

export async function listCoreInvoices(): Promise<CoreInvoice[]> {
  const { data, error } = await supabase.functions.invoke('core-invoices', { body: {} })
  if (error) throw error
  if (!data?.success) throw new Error(data?.error || 'Could not load invoices')
  return data.invoices || []
}

export async function approveInvoice(invoiceId: string) {
  const { data, error } = await supabase.functions.invoke('approve-invoice', { body: { invoiceId } })
  if (error) throw error
  if (!data?.success) throw new Error(data?.error || 'Could not approve invoice')
  return data
}

export async function sendInvoice(invoiceId: string) {
  const { data, error } = await supabase.functions.invoke('send-invoice', { body: { invoiceId } })
  if (error) throw error
  if (!data?.success) throw new Error(data?.error || 'Could not send invoice')
  return data
}
