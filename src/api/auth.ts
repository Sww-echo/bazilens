// Auth API surface. Spec: .trellis/spec/frontend/state-management.md
// Implementation pending — see task 04-30-bootstrap-rebrand → followup tasks.

import { supabase, APP_URL } from './client'

export async function signInWithMagicLink(email: string) {
  return supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${APP_URL}/auth/callback` },
  })
}

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${APP_URL}/auth/callback` },
  })
}

export async function signInWithApple() {
  return supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: { redirectTo: `${APP_URL}/auth/callback` },
  })
}

export async function signOut() {
  return supabase.auth.signOut()
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}
