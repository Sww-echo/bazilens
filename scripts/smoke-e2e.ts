#!/usr/bin/env -S node --experimental-strip-types
// End-to-end smoke test: create test user → chart-create → reading SSE → cleanup.
// Run with: npm run smoke:e2e
//
// Requires: .env.functions.local (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
//           .env.local           (VITE_SUPABASE_ANON_KEY)

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { baziCalculator } from '../src/utils/bazi/baziCalculator.ts'

function loadEnv(path: string): Record<string, string> {
  const out: Record<string, string> = {}
  try {
    const lines = readFileSync(path, 'utf8').split('\n')
    for (const raw of lines) {
      const line = raw.trim()
      if (!line || line.startsWith('#')) continue
      const eq = line.indexOf('=')
      if (eq < 0) continue
      out[line.slice(0, eq)] = line.slice(eq + 1)
    }
  } catch { /* ignore */ }
  return out
}

const envFns = loadEnv('.env.functions.local')
const envLocal = loadEnv('.env.local')

const SUPABASE_URL = envFns.SUPABASE_URL ?? envLocal.VITE_SUPABASE_URL
const SERVICE_KEY = envFns.SUPABASE_SERVICE_ROLE_KEY
const ANON_KEY = envLocal.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
  console.error('Missing env. Need SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + VITE_SUPABASE_ANON_KEY.')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const testEmail = `smoke+${Date.now()}@bazilens.dev`
const testPassword = `Pwd!${Math.random().toString(36).slice(2)}`

async function step(label: string, fn: () => Promise<void>) {
  process.stdout.write(`[${label}] `)
  try {
    await fn()
    console.log('✓')
  } catch (e) {
    console.log('✗')
    throw e
  }
}

async function main() {
  let userId = ''
  let accessToken = ''
  let chartId = ''

  await step('admin.createUser', async () => {
    const { data, error } = await admin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    })
    if (error) throw error
    userId = data.user.id
    console.log(`  user_id=${userId.slice(0, 8)}`)
  })

  try {
    await step('signInWithPassword', async () => {
      const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
      const { data, error } = await anonClient.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      })
      if (error) throw error
      accessToken = data.session!.access_token
      console.log(`  access_token len=${accessToken.length}`)
    })

    await step('POST /functions/v1/chart-create', async () => {
      // Real engine call — produces full BaziChartResult with luckInfo, liunian,
      // shensha, etc. Matches what the browser's buildBaziChartInput sends.
      const bazi = baziCalculator.calculateBazi({
        year: 1995,
        month: 6,
        day: 15,
        timeIndex: 6, // 午时
        gender: 'male',
        isLunar: false,
        isLeapMonth: false,
        useTrueSolarTime: false,
      })

      const body = {
        type: 'bazi',
        title: 'smoke test chart',
        input_meta: {
          gender: 'male', dateType: 'solar',
          year: 1995, month: 6, day: 15, timeIndex: 6,
        },
        chart_data: { kind: 'bazi', bazi },
      }
      const r = await fetch(`${SUPABASE_URL}/functions/v1/chart-create`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
      const text = await r.text()
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${text}`)
      const j = JSON.parse(text)
      chartId = j.chart?.id ?? j.id ?? ''
      if (!chartId) throw new Error(`no chart id in response: ${text.slice(0, 300)}`)
      const dayunCount = bazi.luckInfo?.cycles?.length ?? 0
      console.log(`  chart_id=${chartId.slice(0, 8)}, dayun_cycles=${dayunCount}`)
    })

    await step('POST /functions/v1/reading (SSE)', async () => {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/reading`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: ANON_KEY,
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          chart_id: chartId,
          scene: 'career',
          prompt_version: 'bazi-career-v1',
        }),
      })
      if (!r.ok) {
        const t = await r.text()
        throw new Error(`HTTP ${r.status}: ${t.slice(0, 500)}`)
      }
      console.log(`  HTTP ${r.status}, reading SSE…`)

      const reader = r.body!.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      let bytesRead = 0
      let firstDeltaTime = 0
      let fullText = ''
      let readingId = ''
      let qualityScore: number | null = null
      let fellBack = false
      const t0 = Date.now()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        bytesRead += value.byteLength
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          try {
            const ev = JSON.parse(data)
            if (ev.type === 'delta') {
              if (!firstDeltaTime) firstDeltaTime = Date.now() - t0
              fullText += ev.text
            } else if (ev.type === 'done') {
              readingId = ev.reading_id ?? ''
              qualityScore = typeof ev.quality_score === 'number' ? ev.quality_score : null
              fellBack = Boolean(ev.fell_back)
            } else if (ev.type === 'error') {
              throw new Error(`stream error: ${ev.message}`)
            }
          } catch (parseErr) {
            // ignore non-JSON sse lines
          }
        }
      }
      const totalMs = Date.now() - t0
      console.log(`  bytes=${bytesRead}, first_delta=${firstDeltaTime}ms, total=${totalMs}ms`)
      console.log(`  reading_id=${readingId.slice(0, 8)}${fellBack ? ' [fell_back]' : ''}${qualityScore !== null ? ` q=${qualityScore}` : ''}`)
      console.log('\n────────── AI Reading (full text) ──────────\n')
      console.log(fullText)
      console.log('\n────────── end ──────────\n')
    })
  } finally {
    if (userId) {
      await step('admin.deleteUser (cleanup)', async () => {
        const { error } = await admin.auth.admin.deleteUser(userId)
        if (error) throw error
      })
    }
  }
  console.log('\nAll steps passed.')
}

main().catch((e) => {
  console.error('\nSMOKE FAILED:', e instanceof Error ? e.message : e)
  process.exit(1)
})
