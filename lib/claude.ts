import { recordCost } from './cost-monitor';
import { ANALYSIS_VALUES, SURVEY_VALUES } from './principles';
/**
 * Pythia model client — backed by OpenRouter (OpenAI-compatible), not the
 * Anthropic API directly.
 *
 * Why: billing runs through OpenRouter, so AI features no longer depend on the
 * Anthropic organization's prepaid credit balance. We still use Claude models
 * by default (routed via OpenRouter); every slug is env-overridable so you can
 * point at any OpenRouter model without a code change.
 *
 * Zero SDK dependency — plain fetch against the OpenRouter REST API, matching
 * the app's dependency-light style (same approach as the Drive reader).
 *
 * Env:
 *   OPENROUTER_API_KEY            (required)
 *   OPENROUTER_BASE_URL          (optional; default https://openrouter.ai/api/v1)
 *   OPENROUTER_MODEL_CONVERSATION / _SYNTHESIS / _UTILITY  (optional overrides)
 *   OPENROUTER_SITE_URL / OPENROUTER_SITE_NAME  (optional attribution headers)
 */

const OPENROUTER_URL =
  (process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1').replace(
    /\/$/,
    ''
  ) + '/chat/completions';

/**
 * Resolve a model slug from an env override, treating an empty or
 * whitespace-only value as "unset" and falling back to the default.
 *
 * `??` alone is not enough: a Vercel env var that exists but is BLANK is an
 * empty string (not undefined), so `process.env.X ?? default` would yield ''
 * and OpenRouter rejects the request with 400 "No models provided". Trimming
 * and checking for a non-empty string makes a blank override harmless.
 */
function envModel(value: string | undefined, fallback: string): string {
  const v = value?.trim();
  return v ? v : fallback;
}

export const MODELS = {
  /** Live conversation: balance of latency, quality, cost. */
  conversation: envModel(
    process.env.OPENROUTER_MODEL_CONVERSATION,
    'google/gemini-2.5-flash'
  ),
  /** Post-conversation synthesis report: depth over speed. */
  synthesis: envModel(
    process.env.OPENROUTER_MODEL_SYNTHESIS,
    'anthropic/claude-opus-4.8'
  ),
  /**
   * Cheap utility calls: classifying, language detection. Defaults to Gemini
   * 2.5 Flash (fast + cheap); point OPENROUTER_MODEL_UTILITY at any other
   * OpenRouter slug (see openrouter.ai/models) to change it.
   */
  utility: envModel(
    process.env.OPENROUTER_MODEL_UTILITY,
    'google/gemini-2.5-flash'
  ),
} as const;

function apiKey(): string {
  const k = process.env.OPENROUTER_API_KEY;
  if (!k) {
    throw new Error(
      'OPENROUTER_API_KEY is not set. Add it to .env.local (local) or the Vercel project env (production) to enable AI features.'
    );
  }
  return k;
}

/** Attribution headers OpenRouter recommends (harmless if unset). */
function baseHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey()}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': process.env.OPENROUTER_SITE_URL ?? 'https://thepythia.ai',
    'X-Title': process.env.OPENROUTER_SITE_NAME ?? 'Pythia',
  };
}

/**
 * Provider routing preference: restrict OpenRouter to providers that do NOT
 * collect, store, or train on prompt data. Directly bounds where community
 * signal text can travel. Use zdr:true for the stricter Zero-Data-Retention
 * subset if provider availability allows.
 * https://openrouter.ai/docs/guides/routing/provider-selection
 */
type ProviderPrefs = { data_collection: 'deny'; only?: string[]; zdr?: true };
const ZDR_ON = process.env.OPENROUTER_ZDR === 'true';

/**
 * Provider routing for a given model slug.
 * - data_collection:'deny' always (never a train-on-your-data provider).
 * - When ZDR is on (OPENROUTER_ZDR=true): require a Zero-Data-Retention endpoint.
 *   Anthropic (Claude) models have a ZDR endpoint ONLY via the BYOK Google Vertex
 *   key, so pin only:['google-vertex'] to opt the request into it (OpenRouter
 *   otherwise drops it as a tier endpoint "the request did not opt into"). Other
 *   models (e.g. meta-llama/llama-4-scout) have public ZDR endpoints, so we let
 *   OpenRouter pick whichever ZDR provider serves them. This is why switching
 *   OPENROUTER_MODEL_SYNTHESIS to a Claude slug later needs NO further code change.
 */
function providerPrefs(model: string): ProviderPrefs {
  const prefs: ProviderPrefs = { data_collection: 'deny' };
  if (ZDR_ON) {
    prefs.zdr = true;
    if (model.startsWith('anthropic/')) prefs.only = ['google-vertex'];
  }
  return prefs;
}

/**
 * OpenAI models (gpt-oss, GPT-6.1 Terra) "think" before answering, and that
 * thinking counts against max_tokens. Keep thinking light and give it its own
 * headroom so it never eats the visible answer (which would come back empty).
 */
function reasoningOpts(model: string, maxTokens: number): { max_tokens: number; reasoning?: { effort: 'low' } } {
  return model.startsWith('openai/')
    ? { max_tokens: maxTokens + 3000, reasoning: { effort: 'low' } }
    : { max_tokens: maxTokens };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

function toMessages(
  system: string | undefined,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): ChatMessage[] {
  const out: ChatMessage[] = [];
  if (system) out.push({ role: 'system', content: system });
  out.push(...messages);
  return out;
}

function applyValues(system: string | undefined, values?: 'analysis' | 'survey'): string | undefined {
  if (!values) return system;
  const v = values === 'survey' ? SURVEY_VALUES : ANALYSIS_VALUES;
  return system ? `${v}\n\n${system}` : v;
}

async function errText(resp: Response): Promise<string> {
  const body = await resp.text().catch(() => '');
  return `OpenRouter ${resp.status}: ${body.slice(0, 500)}`;
}

/** Quick non-streaming completion. Returns the assistant text. */
export async function complete(opts: {
  model?: string;
  system?: string;
  values?: 'analysis' | 'survey';
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  maxTokens?: number;
  temperature?: number;
  feature?: string;
}): Promise<string> {
  const resp = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: baseHeaders(),
    body: JSON.stringify({
      model: envModel(opts.model, MODELS.utility),
      provider: providerPrefs(envModel(opts.model, MODELS.utility)),
      ...reasoningOpts(envModel(opts.model, MODELS.utility), opts.maxTokens ?? 1024),
      temperature: opts.temperature,
      messages: toMessages(applyValues(opts.system, opts.values), opts.messages),
      usage: { include: true },
    }),
  });
  if (!resp.ok) throw new Error(await errText(resp));
  const data = (await resp.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { cost?: number };
  };
  await recordCost(data.usage?.cost, opts.feature ?? 'completion');
  return (data.choices?.[0]?.message?.content ?? '').trim();
}

export interface WebSource {
  url: string;
  title?: string;
}

/**
 * Completion with live web search via OpenRouter's web plugin. Works with any
 * model (OpenRouter runs the retrieval and injects results), so it replaces
 * Anthropic's provider-specific web_search tool. Returns the text plus the URL
 * citations OpenRouter attaches as message annotations.
 */
export async function completeWithWebSearch(opts: {
  model?: string;
  system?: string;
  values?: 'analysis' | 'survey';
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  maxTokens?: number;
  maxResults?: number;
  feature?: string;
}): Promise<{ text: string; sources: WebSource[] }> {
  const resp = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: baseHeaders(),
    body: JSON.stringify({
      model: envModel(opts.model, MODELS.conversation),
      provider: providerPrefs(envModel(opts.model, MODELS.conversation)),
      ...reasoningOpts(envModel(opts.model, MODELS.conversation), opts.maxTokens ?? 2048),
      messages: toMessages(applyValues(opts.system, opts.values), opts.messages),
      plugins: [{ id: 'web', max_results: opts.maxResults ?? 5 }],
      usage: { include: true },
    }),
  });
  if (!resp.ok) throw new Error(await errText(resp));
  const data = (await resp.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
        annotations?: Array<{
          type?: string;
          url_citation?: { url?: string; title?: string };
        }>;
      };
    }>;
    usage?: { cost?: number };
  };
  await recordCost(data.usage?.cost, opts.feature ?? 'web-search');
  const msg = data.choices?.[0]?.message;
  const seen = new Map<string, WebSource>();
  for (const a of msg?.annotations ?? []) {
    const url = a.url_citation?.url;
    if (a.type === 'url_citation' && url && !seen.has(url)) {
      seen.set(url, { url, title: a.url_citation?.title });
    }
  }
  return { text: (msg?.content ?? '').trim(), sources: Array.from(seen.values()) };
}

/**
 * Streaming completion. Yields assistant text deltas as they arrive over the
 * OpenRouter SSE stream. OpenRouter sends ": ..." comment keep-alive lines
 * which are ignored.
 */
export async function* streamComplete(opts: {
  model?: string;
  system?: string;
  values?: 'analysis' | 'survey';
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  maxTokens?: number;
  temperature?: number;
}): AsyncGenerator<string, void, unknown> {
  const resp = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: baseHeaders(),
    body: JSON.stringify({
      model: envModel(opts.model, MODELS.conversation),
      provider: providerPrefs(envModel(opts.model, MODELS.conversation)),
      ...reasoningOpts(envModel(opts.model, MODELS.conversation), opts.maxTokens ?? 1024),
      temperature: opts.temperature,
      stream: true,
      messages: toMessages(applyValues(opts.system, opts.values), opts.messages),
    }),
  });
  if (!resp.ok || !resp.body) throw new Error(await errText(resp));

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line.startsWith('data:')) continue; // skip ": ... " keep-alive comments
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') return;
      try {
        const json = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const delta = json.choices?.[0]?.delta?.content;
        if (typeof delta === 'string' && delta) yield delta;
      } catch {
        /* partial/non-JSON frame — ignore */
      }
    }
  }
}
