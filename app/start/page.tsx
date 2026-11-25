'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import type { Language } from '@/lib/types';
import { copyFor } from '@/lib/i18n';
import { enabledLocales } from '@/lib/locales';

// RELEASE FLAG — hide the community voice option until re-enabled.
const AUDIO_ON = process.env.NEXT_PUBLIC_FEATURE_SURVEY_AUDIO === 'on';

function StartInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project') ?? undefined;
  const [language, setLanguage] = useState<Language>('en');
  const [voiceFirst, setVoiceFirst] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = copyFor(language).start;

  async function startSession() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ language, projectId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not create session.');
        setBusy(false);
        return;
      }
      const url = `/chat/${data.session.id}${voiceFirst ? '?voice=1' : ''}`;
      router.push(url);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/" className="text-sm text-brand hover:underline">
        {copy.back}
      </Link>

      <header className="mt-8 mb-8 border-b border-brand-rule pb-6">
        <p className="mb-3 text-sm uppercase tracking-[0.18em] text-brand">
          {copy.tag}
        </p>
        <h1 className="font-serif text-3xl font-semibold text-brand-dark">
          {copy.h}
        </h1>
      </header>

      <p className="mb-10 leading-relaxed text-ink-muted">{copy.intro}</p>

      <fieldset className="mb-8">
        <legend className="mb-3 text-sm font-medium text-ink">
          {copy.languageLabel}
        </legend>
        <div className="flex flex-wrap gap-3">
          {enabledLocales().map((loc) => (
            <button
              key={loc.code}
              type="button"
              onClick={() => setLanguage(loc.code as Language)}
              className={`rounded-md border px-4 py-2 text-sm transition ${
                language === loc.code
                  ? 'border-brand bg-brand-light text-brand-dark'
                  : 'border-brand-rule bg-white text-ink-muted hover:border-brand'
              }`}
            >
              {loc.label}
            </button>
          ))}
        </div>
      </fieldset>

      {AUDIO_ON && (
      <fieldset className="mb-10">
        <legend className="mb-3 text-sm font-medium text-ink">
          {copy.modeLabel}
        </legend>
        <div className="flex flex-col gap-2">
          {[
            { voice: false, label: copy.modeType },
            { voice: true, label: copy.modeVoice },
          ].map(({ voice, label }) => (
            <label
              key={String(voice)}
              className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm transition ${
                voiceFirst === voice
                  ? 'border-brand bg-brand-light text-brand-dark'
                  : 'border-brand-rule bg-white text-ink-muted hover:border-brand'
              }`}
            >
              <input
                type="radio"
                name="mode"
                checked={voiceFirst === voice}
                onChange={() => setVoiceFirst(voice)}
                className="h-4 w-4 accent-brand"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      )}

      <button
        type="button"
        onClick={startSession}
        disabled={busy}
        className="rounded-md bg-brand px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-50"
      >
        {busy ? '…' : copy.begin}
      </button>

      {error && (
        <p className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
    </main>
  );
}

export default function Start() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-2xl px-6 py-16">
          <p className="text-sm text-ink-muted">Loading…</p>
        </main>
      }
    >
      <StartInner />
    </Suspense>
  );
}
