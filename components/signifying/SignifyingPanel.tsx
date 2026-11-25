'use client';

import { useState } from 'react';
import type { Language, SignifierResponse } from '@/lib/types';
import type { Signifier, Dyad, Triad } from '@/lib/signifiers';
import { copyFor } from '@/lib/i18n';
import DyadSlider from './DyadSlider';
import TriadPicker from './TriadPicker';

/**
 * SignifyingPanel — orchestrates the screen-mode self-signification flow
 * through a project's selected signifiers. Skippable per item; submission
 * sends all captured responses in one POST.
 *
 * Voice-mode signifying is a separate path (handled by the AI in chat),
 * not by this component.
 */
export default function SignifyingPanel({
  sessionId,
  language,
  signifiers,
  onSubmitted,
}: {
  sessionId: string;
  language: Language;
  signifiers: Signifier[];
  onSubmitted: () => void;
}) {
  const c = copyFor(language);
  // Map signifierId → captured response (partial; dyadValue OR triadCoords)
  const [responses, setResponses] = useState<Record<string, Partial<SignifierResponse>>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function setDyad(id: string, value: number | undefined) {
    setResponses((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? {}),
        signifierId: id as SignifierResponse['signifierId'],
        dyadValue: value,
        capturedVia: 'screen',
      },
    }));
  }

  function setTriad(id: string, coords: { a: number; b: number; c: number } | undefined) {
    setResponses((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? {}),
        signifierId: id as SignifierResponse['signifierId'],
        triadCoords: coords,
        capturedVia: 'screen',
      },
    }));
  }

  async function submit(skipAll = false) {
    setBusy(true);
    setErr(null);
    try {
      const final: SignifierResponse[] = skipAll
        ? []
        : Object.values(responses)
            .filter(
              (r): r is SignifierResponse =>
                !!r.signifierId &&
                (r.dyadValue !== undefined || r.triadCoords !== undefined)
            )
            .map((r) => ({ ...r, capturedAt: new Date().toISOString() }));

      const res = await fetch(`/api/sessions/${sessionId}/signifiers`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ responses: final }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Could not save responses');
      }
      onSubmitted();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const heading = language === 'es'
    ? 'Antes de revisar lo que escuché — algunas posiciones rápidas'
    : language === 'tl'
    ? 'Bago natin balikan ang aking narinig — ilang mabilis na posisyon'
    : language === 'en'
    ? "Before I read back what I heard — a few quick positions"
    : "Before I read back what I heard — a few quick positions";

  const intro = language === 'es'
    ? 'Para cada uno, marque dónde se ubica. Todos son opcionales — puede dejar uno en el medio si no está seguro, o saltarlo. Esto nos ayuda a ver patrones en muchas conversaciones, no a identificarle.'
    : language === 'tl'
    ? 'Para sa bawat isa, markahan kung saan kayo nakatayo. Lahat ay opsyonal — maaari ninyong iwanan sa gitna kung hindi sigurado, o laktawan. Tumutulong ito sa amin na makita ang mga pattern sa maraming pag-uusap, hindi para makilala kayo.'
    : 'For each one, mark where you sit. All optional — you can leave one in the middle if you\'re not sure, or skip it. This helps us see patterns across many conversations, not identify you.';

  const submitLabel = language === 'es'
    ? 'Guardar mis posiciones'
    : language === 'tl'
    ? 'I-save ang aking mga posisyon'
    : 'Save my positions';

  const skipAllLabel = language === 'es'
    ? 'Saltar todo y continuar'
    : language === 'tl'
    ? 'Laktawan lahat at magpatuloy'
    : 'Skip all and continue';

  if (signifiers.length === 0) {
    // Nothing configured — auto-skip.
    return (
      <section className="mt-8 rounded-lg border border-brand-rule bg-brand-vlight p-5">
        <p className="text-sm text-ink-muted">{intro}</p>
        <button
          type="button"
          onClick={() => onSubmitted()}
          className="mt-4 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          {c.common.continue}
        </button>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <h2 className="font-serif text-xl font-semibold text-brand-dark">
        {heading}
      </h2>
      <p className="mt-1 text-sm text-ink-muted">{intro}</p>

      <div className="mt-6 space-y-5">
        {signifiers.map((s) => {
          if (s.kind === 'dyad') {
            const r = responses[s.id];
            return (
              <DyadSlider
                key={s.id}
                dyad={s as Dyad}
                value={r?.dyadValue}
                onChange={(v) => setDyad(s.id, v)}
              />
            );
          }
          const r = responses[s.id];
          return (
            <TriadPicker
              key={s.id}
              triad={s as Triad}
              coords={r?.triadCoords}
              onChange={(coords) => setTriad(s.id, coords)}
            />
          );
        })}
      </div>

      {err && (
        <p className="mt-3 rounded border border-red-300 bg-red-50 p-2 text-sm text-red-800">
          {err}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => submit(false)}
          disabled={busy}
          className="rounded-md bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {busy ? '…' : submitLabel}
        </button>
        <button
          type="button"
          onClick={() => submit(true)}
          disabled={busy}
          className="rounded-md border border-brand-rule bg-white px-4 py-2 text-sm text-ink-muted hover:border-brand disabled:opacity-50"
        >
          {skipAllLabel}
        </button>
      </div>
    </section>
  );
}
