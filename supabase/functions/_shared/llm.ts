// Three-provider LLM router with automatic fallback.
// Spec: ../../../.trellis/spec/supabase/llm-routing.md
//
// Routing:
//   pro  → Claude Sonnet 4.6
//   plus → GPT-4.1
//   free → DeepSeek V3
//
// Fallback chain (provider failure):
//   claude → openai → deepseek (then throw)
//
// On fallback, callers must rollback the consumed quota — see reading/index.ts.

import Anthropic from 'npm:@anthropic-ai/sdk@0.30.0'
import OpenAI from 'npm:openai@4.70.0'
import { computeCost } from './cost.ts'

export type Tier = 'free' | 'plus' | 'pro'
export type Provider = 'claude' | 'openai' | 'deepseek'

export type LLMRequest = {
  prompt: string
  systemPrompt?: string
  maxTokens?: number
  /** Anthropic prompt cache prefix — reused across multiple chapter calls. */
  cachePrefix?: string
}

export type LLMResponse = {
  text: string
  provider: Provider
  model: string
  tokensInput: number
  tokensOutput: number
  cacheReadTokens: number
  cacheWriteTokens: number
  costUsd: number
}

export type StreamCallback = (delta: string) => void

const TIER_ROUTE: Record<Tier, { provider: Provider; model: string }> = {
  pro: { provider: 'claude', model: 'claude-sonnet-4-5-20250929' },
  plus: { provider: 'openai', model: 'gpt-4.1' },
  free: { provider: 'deepseek', model: 'deepseek-chat' },
}

const FALLBACK_NEXT: Record<Provider, Provider | null> = {
  claude: 'openai',
  openai: 'deepseek',
  deepseek: null,
}

const PROVIDER_TO_TIER: Record<Provider, Tier> = {
  claude: 'pro',
  openai: 'plus',
  deepseek: 'free',
}

function anthropic(): Anthropic {
  return new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })
}

function openai(): OpenAI {
  return new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY')! })
}

const DEEPSEEK_KEY = () => Deno.env.get('DEEPSEEK_API_KEY')!

// =============================================================================
// Public entrypoints
// =============================================================================

/**
 * Stream a response, invoking onDelta for each chunk. Falls back across
 * providers on transport-level failure. Returns the final aggregated text +
 * usage breakdown (with the provider that actually succeeded).
 */
export async function callLLMStream(
  tier: Tier,
  req: LLMRequest,
  onDelta: StreamCallback,
): Promise<LLMResponse> {
  const tried: Provider[] = []
  let lastError: unknown
  let current: { provider: Provider; model: string } | null = TIER_ROUTE[tier] ?? TIER_ROUTE.free

  while (current) {
    tried.push(current.provider)
    try {
      const result = await dispatchStream(current.provider, current.model, req, onDelta)
      if (tried.length > 1) {
        console.warn(`[llm] fallback success: ${tried.join(' -> ')}`)
      }
      return result
    } catch (e) {
      lastError = e
      console.error(`[llm] ${current.provider} failed:`, e)
      const nextProvider = FALLBACK_NEXT[current.provider]
      if (!nextProvider) break
      const nextTier = PROVIDER_TO_TIER[nextProvider]
      current = TIER_ROUTE[nextTier]
    }
  }

  throw new Error(
    `all_providers_failed:${tried.join(',')}:${lastError instanceof Error ? lastError.message : String(lastError)}`,
  )
}

/** Non-streaming convenience wrapper for PDF chapter generation. */
export async function callLLM(tier: Tier, req: LLMRequest): Promise<LLMResponse> {
  let buffered = ''
  const result = await callLLMStream(tier, req, (delta) => {
    buffered += delta
  })
  return { ...result, text: buffered || result.text }
}

export function expectedProviderForTier(tier: Tier): Provider {
  return TIER_ROUTE[tier].provider
}

// =============================================================================
// Provider implementations
// =============================================================================

async function dispatchStream(
  provider: Provider,
  model: string,
  req: LLMRequest,
  onDelta: StreamCallback,
): Promise<LLMResponse> {
  if (provider === 'claude') return callClaude(model, req, onDelta)
  if (provider === 'openai') return callOpenAI(model, req, onDelta)
  return callDeepSeek(model, req, onDelta)
}

async function callClaude(
  model: string,
  req: LLMRequest,
  onDelta: StreamCallback,
): Promise<LLMResponse> {
  type ContentBlock =
    | { type: 'text'; text: string }
    | { type: 'text'; text: string; cache_control: { type: 'ephemeral' } }

  const content: ContentBlock[] = []
  if (req.cachePrefix) {
    content.push({
      type: 'text',
      text: req.cachePrefix,
      cache_control: { type: 'ephemeral' },
    })
  }
  content.push({ type: 'text', text: req.prompt })

  const stream = anthropic().messages.stream({
    model,
    max_tokens: req.maxTokens ?? 4000,
    ...(req.systemPrompt ? { system: req.systemPrompt } : {}),
    messages: [{ role: 'user', content }],
  })

  let text = ''
  for await (const ev of stream) {
    if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') {
      text += ev.delta.text
      onDelta(ev.delta.text)
    }
  }
  const final = await stream.finalMessage()
  const tokensInput = final.usage.input_tokens
  const tokensOutput = final.usage.output_tokens
  // SDK cache stats may be undefined when caching not used
  const usage = final.usage as typeof final.usage & {
    cache_read_input_tokens?: number
    cache_creation_input_tokens?: number
  }
  const cacheReadTokens = usage.cache_read_input_tokens ?? 0
  const cacheWriteTokens = usage.cache_creation_input_tokens ?? 0
  const costUsd = computeCost({
    provider: 'claude',
    tokensInput,
    tokensOutput,
    cacheReadTokens,
    cacheWriteTokens,
  })

  return {
    text,
    provider: 'claude',
    model,
    tokensInput,
    tokensOutput,
    cacheReadTokens,
    cacheWriteTokens,
    costUsd,
  }
}

async function callOpenAI(
  model: string,
  req: LLMRequest,
  onDelta: StreamCallback,
): Promise<LLMResponse> {
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = []
  if (req.systemPrompt) messages.push({ role: 'system', content: req.systemPrompt })
  // OpenAI does not have prompt caching equivalent for our use; concatenate instead.
  if (req.cachePrefix) {
    messages.push({ role: 'user', content: `${req.cachePrefix}\n\n${req.prompt}` })
  } else {
    messages.push({ role: 'user', content: req.prompt })
  }

  const stream = await openai().chat.completions.create({
    model,
    max_tokens: req.maxTokens ?? 4000,
    stream: true,
    stream_options: { include_usage: true },
    messages,
  })

  let text = ''
  let tokensInput = 0
  let tokensOutput = 0
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? ''
    if (delta) {
      text += delta
      onDelta(delta)
    }
    if (chunk.usage) {
      tokensInput = chunk.usage.prompt_tokens
      tokensOutput = chunk.usage.completion_tokens
    }
  }

  const costUsd = computeCost({ provider: 'openai', tokensInput, tokensOutput })
  return {
    text,
    provider: 'openai',
    model,
    tokensInput,
    tokensOutput,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    costUsd,
  }
}

async function callDeepSeek(
  model: string,
  req: LLMRequest,
  onDelta: StreamCallback,
): Promise<LLMResponse> {
  const messages: Array<{ role: string; content: string }> = []
  if (req.systemPrompt) messages.push({ role: 'system', content: req.systemPrompt })
  if (req.cachePrefix) {
    messages.push({ role: 'user', content: `${req.cachePrefix}\n\n${req.prompt}` })
  } else {
    messages.push({ role: 'user', content: req.prompt })
  }

  const r = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${DEEPSEEK_KEY()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      max_tokens: req.maxTokens ?? 4000,
    }),
  })
  if (!r.ok || !r.body) {
    throw new Error(`deepseek_http_${r.status}: ${await r.text()}`)
  }

  const reader = r.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  let text = ''
  let tokensInput = 0
  let tokensOutput = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const payload = line.slice(6).trim()
      if (!payload || payload === '[DONE]') continue
      try {
        const j = JSON.parse(payload)
        const delta = j.choices?.[0]?.delta?.content ?? ''
        if (delta) {
          text += delta
          onDelta(delta)
        }
        if (j.usage) {
          tokensInput = j.usage.prompt_tokens
          tokensOutput = j.usage.completion_tokens
        }
      } catch {
        // ignore malformed SSE lines
      }
    }
  }

  const costUsd = computeCost({ provider: 'deepseek', tokensInput, tokensOutput })
  return {
    text,
    provider: 'deepseek',
    model,
    tokensInput,
    tokensOutput,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    costUsd,
  }
}
