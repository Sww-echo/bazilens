// Support tickets API — in-app feedback creation + own list.
// Admin operations live behind .trellis/spec/guides/customer-support.md SOP.

import { supabase } from './client'

export type TicketCategory =
  | 'reading_inaccurate'
  | 'unhappy_result'
  | 'pdf_failed'
  | 'payment_issue'
  | 'refund_request'
  | 'other'

export type TicketStatus = 'open' | 'in_progress' | 'replied' | 'closed' | 'escalated'

export type CreateTicketInput = {
  category: TicketCategory
  subject: string
  body: string
  related_reading_id?: string
  related_report_id?: string
}

export type TicketRow = {
  id: string
  category: TicketCategory
  priority: number
  status: TicketStatus
  subject: string
  initial_body: string
  replies: Array<{ from: 'support' | 'user'; at: string; body: string }>
  created_at: string
  first_reply_at: string | null
  closed_at: string | null
}

export async function createTicket(input: CreateTicketInput): Promise<{ id: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('not_authenticated')

  const { data, error } = await supabase
    .from('support_tickets')
    .insert({
      user_id: user.id,
      channel: 'in_app',
      category: input.category,
      priority: 3,
      subject: input.subject.slice(0, 200),
      initial_body: input.body.slice(0, 5000),
      related_reading_id: input.related_reading_id ?? null,
      related_report_id: input.related_report_id ?? null,
    })
    .select('id')
    .single()
  if (error || !data) throw error ?? new Error('insert_failed')
  return { id: data.id as string }
}

export async function listMyTickets(limit = 30): Promise<TicketRow[]> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select(
      'id, category, priority, status, subject, initial_body, replies, created_at, first_reply_at, closed_at',
    )
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as unknown as TicketRow[]
}
