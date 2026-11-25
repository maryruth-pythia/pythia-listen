'use client';

import { useState } from 'react';
import { copyFor } from '@/lib/i18n';
import type { Language, ParticipationConsentState } from '@/lib/types';

export default function BeginConsent({
  language,
  sessionId,
  onChosen,
}: {
  language: Language;
  sessionId: string;
  onChosen: (state: ParticipationConsentState) => void;
}) {
  const c = copyFor(language);
  const [busy, setBusy] = useState<ParticipationConsentState | null>(null);

  async function pick(state: ParticipationConsentState) {
    setBusy(state);
    try {
      await fetch(`/api/sessions/${sessionId}/begin-consent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ state }),
      });
      onChosen(state);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => pick('yes_begin')}
        disabled={!!busy}
        className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-50"
      >
        {busy === 'yes_begin' ? '…' : c.beginConsent.yes}
      </button>
      <button
        type="button"
        onClick={() => pick('questions_first')}
        disabled={!!busy}
        className="rounded-md border border-brand-rule bg-white px-4 py-2 text-sm text-ink transition hover:border-brand disabled:opacity-50"
      >
        {busy === 'questions_first' ? '…' : c.beginConsent.questions}
      </button>
      <button
        type="button"
        onClick={() => pick('declined')}
        disabled={!!busy}
        className="rounded-md border border-brand-rule bg-white px-4 py-2 text-sm text-ink-muted transition hover:border-red-300 hover:text-red-700 disabled:opacity-50"
      >
        {busy === 'declined' ? '…' : c.beginConsent.no}
      </button>
    </div>
  );
}
