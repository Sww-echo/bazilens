// Supabase client singleton.
// Component / page MUST NOT import this directly — go through the api/ wrappers
// (auth, charts, readings, subscriptions, reports, tickets).

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Soft-fail: warn loudly but let the placeholder UI render so devs can see it
  // before configuring Supabase. Any actual API call will surface auth errors.
  // Remove this branch once .env.local is required for development.
  // eslint-disable-next-line no-console
  console.warn(
    '[BaziLens] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local. Backend calls will fail until configured.',
  )
}

export const supabase = createClient<Database>(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)

export const APP_URL = import.meta.env.VITE_APP_URL ?? 'http://localhost:5173'
