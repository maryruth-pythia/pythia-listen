/**
 * Text-to-speech. Primary provider is fal.ai (Kokoro v1.0 — the "Heart" voice
 * + Spanish). Replicate (older Kokoro, English only, no Heart voice) is only a
 * last-ditch fallback. Falls back to the browser voice on the client. WAV out.
 *
 * Setup: set FAL_KEY (primary). REPLICATE_API_TOKEN optional fallback.
 * Public (allow-listed in middleware). Read-only: text in, audio out.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getVoiceProvider } from '@/lib/voice-settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const DEFAULT_EN_VOICE = process.env.PYTHIA_TTS_VOICE || 'af_heart';

// Replicate Kokoro voices by base language.
// NOTE: jaaari/kokoro-82m is an OLDER Kokoro (no af_heart, no Spanish), so it is
// only a last-ditch English fallback with a voice that exists there.
const REPLICATE_VOICE: Record<string, string> = {
  en: 'af_bella',
};
// fal.ai Kokoro models by base language (fallback provider).
const FAL_LANG: Record<string, { model: string; voice?: string }> = {
  en: { model: 'fal-ai/kokoro/american-english', voice: DEFAULT_EN_VOICE },
  es: { model: 'fal-ai/kokoro/spanish' },
};
function baseLang(lang?: string): string {
  return (lang || 'en').toLowerCase().split('-')[0];
}

// ---- in-memory LRU of generated clips (repeat text is free) ---------------
const CLIP_CACHE = new Map<string, { bytes: Uint8Array; mime: string }>();
const CLIP_CACHE_MAX = 64;
function clipKey(provider: string, lang: string, text: string): string {
  return `${provider}:${lang}:` + createHash('sha1').update(text).digest('hex');
}
function cacheGet(k: string): { bytes: Uint8Array; mime: string } | undefined {
  const v = CLIP_CACHE.get(k);
  if (v) {
    CLIP_CACHE.delete(k);
    CLIP_CACHE.set(k, v);
  }
  return v;
}
function cacheSet(k: string, v: { bytes: Uint8Array; mime: string }): void {
  CLIP_CACHE.set(k, v);
  if (CLIP_CACHE.size > CLIP_CACHE_MAX) {
    const oldest = CLIP_CACHE.keys().next().value;
    if (oldest !== undefined) CLIP_CACHE.delete(oldest);
  }
}

// ---- Replicate (preferred, cheapest) --------------------------------------
async function synthByReplicate(lang: string, text: string): Promise<Uint8Array | null> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) return null;
  const voice = REPLICATE_VOICE[lang];
  if (!voice) return null;
  try {
    const res = await fetch(
      'https://api.replicate.com/v1/models/jaaari/kokoro-82m/predictions',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
          Prefer: 'wait', // block until the prediction finishes (no polling)
        },
        body: JSON.stringify({ input: { text, voice } }),
      }
    );
    if (!res.ok) {
      console.error('[tts] replicate http', res.status, (await res.text()).slice(0, 200));
      return null;
    }
    const data: any = await res.json();
    if (data.status && data.status !== 'succeeded') {
      console.error('[tts] replicate status', data.status, JSON.stringify(data.error || '').slice(0, 200));
      return null;
    }
    const out = Array.isArray(data.output) ? data.output[0] : data.output;
    if (typeof out !== 'string' || !out) return null;
    const audio = await fetch(out);
    if (!audio.ok) return null;
    console.log('[tts] served via replicate (' + voice + ')');
    return new Uint8Array(await audio.arrayBuffer());
  } catch (e: any) {
    console.error('[tts] replicate FAILED:', e?.message || e);
    return null;
  }
}

// ---- ElevenLabs (opt-in, operator toggle) ---------------------------------
// Higher-quality paid voice. Only used when the operator has switched the voice
// provider to 'elevenlabs' (or an explicit provider override is passed). MP3 out.
const ELEVEN_MODEL = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';
const ELEVEN_FALLBACK_VOICE = 'EST9Ui6982FZPSi7gCHi'; // chosen voice (override per-env with ELEVENLABS_VOICE_ID)

// Resolve a voice id that actually exists in THIS account. A hardcoded voice
// returns http_400 "voice_not_found" on accounts that don't have it (ElevenLabs
// changed its default lineup), so prefer an explicit env override, else the
// account's own first voice, else the legacy default.
// Start from an explicit override only. Leaving this UNSET when there is no
// override is what lets resolveElevenVoice() below actually query the account
// for a real voice — otherwise the hardcoded fallback short-circuits that
// lookup and, once ElevenLabs rotates that voice out of the account, every
// call 400s with voice_not_found and the app drops to the robotic fallback.
let cachedVoiceId: string | undefined = process.env.ELEVENLABS_VOICE_ID || undefined;
// Diagnostics surfaced as response headers so failures are readable in the
// browser Network tab (no server-log hunting): the exact voice id used and the
// raw ElevenLabs error body.
let lastVoiceUsed = '';
let lastElevenBody = '';
async function resolveElevenVoice(key: string): Promise<string> {
  if (cachedVoiceId) return cachedVoiceId;
  try {
    const r = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': key },
    });
    if (r.ok) {
      const d = (await r.json()) as {
        voices?: Array<{ voice_id?: string; category?: string }>;
      };
      const voices = d.voices || [];
      // Free tier can only use built-in "premade" voices via the API — Library/
      // community voices return 402 paid_plan_required. Prefer a premade voice.
      const pick = voices.find((v) => v.category === 'premade') || voices[0];
      const v = pick?.voice_id;
      if (typeof v === 'string' && v) {
        cachedVoiceId = v;
        return v;
      }
    } else {
      console.error('[tts] elevenlabs /voices http', r.status);
    }
  } catch (e: any) {
    console.error('[tts] elevenlabs /voices FAILED:', e?.message || e);
  }
  return ELEVEN_FALLBACK_VOICE;
}
type ElevenResult = { bytes: Uint8Array } | { error: string };
async function synthByElevenLabs(lang: string, text: string): Promise<ElevenResult> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return { error: 'no_key' };
  const voiceId = await resolveElevenVoice(key);
  lastVoiceUsed = voiceId;
  lastElevenBody = '';
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': key,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: ELEVEN_MODEL,
          voice_settings: { stability: 0.4, similarity_boost: 0.8 },
        }),
      }
    );
    if (!res.ok) {
      const body = (await res.text()).slice(0, 300);
      lastElevenBody = body;
      console.error('[tts] elevenlabs http', res.status, body);
      // Surface the reason to the client via a response header (see POST) so it
      // can be read in the browser Network tab without hunting server logs.
      let reason = '';
      try {
        const j = JSON.parse(body) as { detail?: { status?: string; message?: string } };
        reason = j?.detail?.status || j?.detail?.message || '';
      } catch {
        /* non-JSON body */
      }
      const tag = reason ? '_' + String(reason).slice(0, 40).replace(/[^a-zA-Z0-9_]/g, '') : '';
      return { error: `http_${res.status}${tag}` };
    }
    console.log('[tts] served via elevenlabs (' + voiceId + ', lang=' + lang + ')');
    return { bytes: new Uint8Array(await res.arrayBuffer()) };
  } catch (e: any) {
    console.error('[tts] elevenlabs FAILED:', e?.message || e);
    return { error: 'exception' };
  }
}

// ---- fal.ai (fallback) ----------------------------------------------------
async function synthByFal(lang: string, text: string): Promise<Uint8Array | null> {
  const key = process.env.FAL_KEY;
  if (!key) return null;
  const cfg = FAL_LANG[lang];
  if (!cfg) return null;
  try {
    const { fal } = await import('@fal-ai/client');
    fal.config({ credentials: key });
    const input: Record<string, unknown> = { prompt: text };
    if (cfg.voice) input.voice = cfg.voice;
    const result: any = await fal.subscribe(cfg.model, { input });
    const url: unknown = result?.data?.audio?.url;
    if (typeof url !== 'string' || !url) return null;
    const res = await fetch(url);
    if (!res.ok) return null;
    console.log('[tts] served via fal (' + cfg.model + ')');
    return new Uint8Array(await res.arrayBuffer());
  } catch (e: any) {
    console.error('[tts] fal FAILED:', e?.message || e);
    return null;
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const b = body as { text?: unknown; lang?: unknown; provider?: unknown };
  const text = typeof b.text === 'string' ? b.text.trim() : '';
  if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 });

  const lang = baseLang(typeof b.lang === 'string' ? b.lang : 'en');
  const clip = text.slice(0, 1000);

  // Provider: an explicit body.provider wins (used by the operator's A/B test);
  // otherwise fall back to the saved operator preference (default fal).
  const reqProvider = typeof b.provider === 'string' ? b.provider : '';
  const provider =
    reqProvider === 'elevenlabs' || reqProvider === 'fal'
      ? reqProvider
      : await getVoiceProvider();

  const key = clipKey(provider, lang, clip);
  const hit = cacheGet(key);
  if (hit) {
    return new NextResponse(Buffer.from(hit.bytes), {
      status: 200,
      headers: { 'Content-Type': hit.mime, 'Cache-Control': 'no-store', 'X-Cache': 'hit' },
    });
  }

  let bytes: Uint8Array | null = null;
  let mime = 'audio/wav';
  let elevenErr: string | null = null;
  // ElevenLabs first only when selected; always fall back to fal/replicate so a
  // paid-provider hiccup never leaves a respondent without audio.
  if (provider === 'elevenlabs') {
    const r = await synthByElevenLabs(lang, clip);
    if ('bytes' in r) {
      bytes = r.bytes;
      mime = 'audio/mpeg';
    } else {
      elevenErr = r.error;
    }
  }
  if (!bytes) bytes = await synthByFal(lang, clip);
  if (!bytes) bytes = await synthByReplicate(lang, clip);
  if (!bytes) {
    console.warn('[tts] no audio for lang=' + lang + ' — client will use browser voice');
    const h: Record<string, string> = { 'X-Actual': 'none' };
    if (elevenErr) h['X-Eleven-Error'] = elevenErr;
    h['X-Fal-Key'] = process.env.FAL_KEY ? 'set' : 'missing';
    if (lastVoiceUsed) h['X-Voice-Used'] = lastVoiceUsed;
    if (lastElevenBody) h['X-Eleven-Body'] = lastElevenBody.replace(/[\r\n]+/g, ' ').slice(0, 120);
    h['X-Key-Prefix'] = (process.env.ELEVENLABS_API_KEY || '(unset)').slice(0, 5);
    return NextResponse.json({ error: 'tts unavailable' }, { status: 503, headers: h });
  }

  cacheSet(key, { bytes, mime });
  const respHeaders: Record<string, string> = {
    'Content-Type': mime,
    'Cache-Control': 'no-store',
    'X-Provider': provider,
  };
  // Which voice actually produced the audio, and (if ElevenLabs was selected but
  // fell back) why — readable in the browser Network tab.
  respHeaders['X-Actual'] = mime === 'audio/mpeg' ? 'elevenlabs' : 'fal';
  if (elevenErr) respHeaders['X-Eleven-Error'] = elevenErr;
  if (lastVoiceUsed) respHeaders['X-Voice-Used'] = lastVoiceUsed;
  if (lastElevenBody) respHeaders['X-Eleven-Body'] = lastElevenBody.replace(/[\r\n]+/g, ' ').slice(0, 120);
  respHeaders['X-Key-Prefix'] = (process.env.ELEVENLABS_API_KEY || '(unset)').slice(0, 5);
  return new NextResponse(Buffer.from(bytes), { status: 200, headers: respHeaders });
}
