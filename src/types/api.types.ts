// Edge Function response shapes. Manually maintained alongside backend code.
// Source of truth: docs/TECH_SPEC.md §4 / §6 / §14 / §16.

export type StreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; reading_id: string }
  | { type: 'error'; message: string }

export type CheckoutResponse =
  | { ok: true; url: string }
  | { ok: false; error: string }

export type QuotaCheckResult = {
  allowed: boolean
  remaining: number
  reason: 'quota_exceeded' | null
}

export type PIIDetectionResult = {
  hasPII: boolean
  matches: Array<{ type: string; sample: string }>
}
