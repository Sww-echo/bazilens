// CORS headers + JSON helper + JWT-authenticated user lookup.
// Used by every Edge Function entrypoint. Spec: ../../../.trellis/spec/supabase/edge-functions.md

import { createClient } from 'jsr:@supabase/supabase-js@2'

export function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': Deno.env.get('CORS_ALLOW_ORIGIN') ?? '*',
    'Access-Control-Allow-Headers':
      'authorization, content-type, x-client-info, apikey',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
  }
}

export function preflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  return null
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  })
}

// Public Supabase client used to verify JWT (anon key acceptable here).
const supabaseAuthClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

export type AuthenticatedUser = {
  id: string
  email: string | undefined
  raw: Awaited<ReturnType<typeof supabaseAuthClient.auth.getUser>>['data']['user']
}

export async function getAuthUser(req: Request): Promise<AuthenticatedUser | null> {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data, error } = await supabaseAuthClient.auth.getUser(token)
  if (error || !data.user) return null
  return { id: data.user.id, email: data.user.email, raw: data.user }
}

export async function requireAuth(req: Request): Promise<
  { user: AuthenticatedUser } | { response: Response }
> {
  const user = await getAuthUser(req)
  if (!user) return { response: json({ error: 'unauthorized' }, 401) }
  return { user }
}

// service_role-scoped client for privileged DB writes inside Edge Functions.
export function serviceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
