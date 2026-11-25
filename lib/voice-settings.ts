import { getCache, setCache } from '@/lib/db';

/**
 * Operator voice-provider preference. Default is fal (Kokoro) — free/cheap and
 * always on. ElevenLabs is opt-in: higher quality, paid, gated behind this
 * toggle so it only runs when the operator deliberately turns it on (for demos
 * or A/B comparison). Persisted through the KV cache store (no TTL), like the
 * org profile. When multi-tenant accounts land this becomes per-org.
 */
export type VoiceProvider = 'fal' | 'elevenlabs';

const KEY = 'settings:voice:v1';

export async function getVoiceProvider(): Promise<VoiceProvider> {
  const hit = await getCache(KEY);
  const v = hit && hit.value ? (hit.value as { provider?: string }).provider : undefined;
  return v === 'elevenlabs' ? 'elevenlabs' : 'fal';
}

export async function saveVoiceProvider(provider: VoiceProvider): Promise<void> {
  await setCache(KEY, { provider });
}

/** Whether an ElevenLabs key is configured in this environment. */
export function elevenLabsConfigured(): boolean {
  return !!process.env.ELEVENLABS_API_KEY;
}
