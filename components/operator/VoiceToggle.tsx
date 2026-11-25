'use client';

import { useEffect, useRef, useState } from 'react';

const GRAD = 'linear-gradient(90deg,#FCC029 0%,#EC2BFC 52%,#6A0FC2 100%)';
const SAMPLE =
  'This is how a Pythia survey question sounds when read aloud to your community.';

/**
 * Operator-only voice provider toggle. Default is fal (Kokoro). ElevenLabs is
 * opt-in and only selectable when a key is configured. Includes an A/B sample
 * so you can hear both before switching.
 */
export default function VoiceToggle() {
  const [provider, setProvider] = useState<'fal' | 'elevenlabs'>('fal');
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetch('/api/manage/voice-settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.provider === 'elevenlabs' || d.provider === 'fal') setProvider(d.provider);
        setAvailable(!!d.elevenAvailable);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function choose(p: 'fal' | 'elevenlabs') {
    if (p === provider || saving) return;
    if (p === 'elevenlabs' && !available) {
      setNote('Add ELEVENLABS_API_KEY to .env.local and restart the dev server to enable this.');
      return;
    }
    setSaving(true);
    setNote(null);
    try {
      const res = await fetch('/api/manage/voice-settings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ provider: p }),
      });
      const d = await res.json();
      if (!res.ok) { setNote(d?.error ?? 'Could not save.'); return; }
      setProvider(p);
      setNote(p === 'elevenlabs' ? 'Now using ElevenLabs for all spoken audio.' : 'Back to fal (Kokoro).');
    } catch {
      setNote('Network error.');
    } finally {
      setSaving(false);
    }
  }

  async function sample(p: 'fal' | 'elevenlabs') {
    if (p === 'elevenlabs' && !available) {
      setNote('Add ELEVENLABS_API_KEY to .env.local and restart the dev server to hear this.');
      return;
    }
    setPlaying(p);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: SAMPLE, lang: 'en', provider: p }),
      });
      if (!res.ok) { setNote('Sample failed (' + res.status + ').'); return; }
      const buf = await res.arrayBuffer();
      const url = URL.createObjectURL(new Blob([buf], { type: res.headers.get('Content-Type') || 'audio/wav' }));
      if (audioRef.current) { audioRef.current.pause(); }
      const a = new Audio(url);
      audioRef.current = a;
      a.onended = () => { setPlaying(null); URL.revokeObjectURL(url); };
      await a.play();
    } catch {
      setNote('Could not play sample.');
      setPlaying(null);
    }
  }

  const Opt = ({ id, name, desc }: { id: 'fal' | 'elevenlabs'; name: string; desc: string }) => {
    const on = provider === id;
    const disabled = id === 'elevenlabs' && !available;
    return (
      <div
        className="flex items-center gap-3 rounded-lg border p-3"
        style={{ borderColor: on ? '#6A0FC2' : '#E2D6F0', background: on ? '#F7F4FB' : '#fff', opacity: disabled ? 0.6 : 1 }}
      >
        <button
          type="button"
          onClick={() => choose(id)}
          disabled={saving}
          className="flex-none rounded-md px-3 py-1.5 text-[12px] font-semibold"
          style={on ? { background: GRAD, color: '#fff' } : { border: '1px solid #E2D6F0', color: '#1F1330' }}
        >
          {on ? 'Selected' : 'Use this'}
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-brand-dark">
            {name}
            {disabled && <span className="ml-2 text-[11px] font-normal text-ink-subtle">(key not set)</span>}
          </div>
          <div className="text-[12px] text-ink-muted">{desc}</div>
        </div>
        <button
          type="button"
          onClick={() => sample(id)}
          className="flex-none rounded-md border px-2.5 py-1.5 text-[11.5px] font-medium"
          style={{ borderColor: '#E2D6F0', color: '#6A0FC2' }}
        >
          {playing === id ? '▶ Playing…' : '▶ Hear it'}
        </button>
      </div>
    );
  };

  if (loading) return <p className="text-[12px] text-ink-subtle">Loading voice settings…</p>;

  return (
    <div className="space-y-2">
      <Opt id="fal" name="fal · Kokoro (default)" desc="Free, fast, always on. English + Spanish." />
      <Opt id="elevenlabs" name="ElevenLabs (experimental)" desc="Higher quality, paid. Multilingual. For demos." />
      {note && <p className="text-[12px]" style={{ color: '#6A0FC2' }}>{note}</p>}
      <p className="text-[11px] text-ink-subtle">
        This switches the voice for <b>all</b> spoken audio, including the public survey&rsquo;s
        &ldquo;Listen&rdquo; buttons — so flip to ElevenLabs for a demo, then back to fal to keep costs at zero.
      </p>
    </div>
  );
}
