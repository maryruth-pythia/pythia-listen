'use client';

import { useState } from 'react';
import { SIGNIFIERS } from '@/lib/signifiers';
import type { SignifierId } from '@/lib/types';

/**
 * SignifierEditorPanel — lets an operator pick which signifiers appear for
 * a project, and configure basic capture settings.
 *
 * Renders as an inline editable panel on the project detail page.
 */
export default function SignifierEditorPanel({
  projectId,
  initialIds,
  photovoiceEnabled,
  mappingEnabled,
  demographicsEnabled,
}: {
  projectId: string;
  initialIds: SignifierId[];
  photovoiceEnabled: boolean;
  mappingEnabled: boolean;
  demographicsEnabled: boolean;
}) {
  const [selected, setSelected] = useState<Set<SignifierId>>(new Set(initialIds));
  const [photovoice, setPhotovoice] = useState(photovoiceEnabled);
  const [mapping, setMapping] = useState(mappingEnabled);
  const [demographics, setDemographics] = useState(demographicsEnabled);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  function toggle(id: SignifierId) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSaved(false);
  }

  async function save() {
    setBusy(true);
    setErr(null);
    setSaved(false);
    try {
      // Preserve canonical order from the SIGNIFIERS library.
      const ordered = SIGNIFIERS
        .map((s) => s.id)
        .filter((id) => selected.has(id));
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          signifierIds: ordered,
          photovoiceEnabled: photovoice,
          mappingEnabled: mapping,
          demographicsEnabled: demographics,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? 'Save failed');
      }
      setSaved(true);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const dyads = SIGNIFIERS.filter((s) => s.kind === 'dyad');
  const triads = SIGNIFIERS.filter((s) => s.kind === 'triad');
  const count = selected.size;

  return (
    <div className="rounded-lg border border-brand-rule bg-white">
      {/* Collapsed header */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-medium text-brand-dark">
          Edit signifiers &amp; capture settings
        </span>
        <span className="text-xs text-ink-subtle">
          {count} selected · {open ? '▲ close' : '▼ expand'}
        </span>
      </button>

      {open && (
        <div className="border-t border-brand-rule px-4 pb-5 pt-4 space-y-6">

          {/* ── Dyads ── */}
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand">
              Dyads (slider 0–100)
            </legend>
            <p className="mb-3 text-xs text-ink-muted">
              Bipolar scales — participant places themselves between two poles.
              Recommended: 3–5 dyads.
            </p>
            <ul className="space-y-2">
              {dyads.map((s) => (
                <li key={s.id}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-md border border-brand-rule p-3 hover:border-brand">
                    <input
                      type="checkbox"
                      checked={selected.has(s.id)}
                      onChange={() => toggle(s.id)}
                      className="mt-0.5 h-4 w-4 accent-brand"
                    />
                    <span>
                      <span className="block text-sm font-medium text-ink">
                        {s.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-subtle">
                        {(s as { poleLow: string }).poleLow} ↔ {(s as { poleHigh: string }).poleHigh}
                      </span>
                      <span className="mt-1 block text-xs italic text-ink-muted">
                        "{s.prompt}"
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>

          {/* ── Triads ── */}
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand">
              Triads (triangle placement)
            </legend>
            <p className="mb-3 text-xs text-ink-muted">
              Three-pole scales — participant places themselves inside a triangle.
              Recommended: 1–2 triads.
            </p>
            <ul className="space-y-2">
              {triads.map((s) => (
                <li key={s.id}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-md border border-brand-rule p-3 hover:border-brand">
                    <input
                      type="checkbox"
                      checked={selected.has(s.id)}
                      onChange={() => toggle(s.id)}
                      className="mt-0.5 h-4 w-4 accent-brand"
                    />
                    <span>
                      <span className="block text-sm font-medium text-ink">
                        {s.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-subtle">
                        {(s as { poles: string[] }).poles.join(' · ')}
                      </span>
                      <span className="mt-1 block text-xs italic text-ink-muted">
                        "{s.prompt}"
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>

          {/* ── Timing note ── */}
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <strong>When are signifiers introduced?</strong> Currently, signifiers
            appear after the substantive conversation and before the recap — the
            SenseMaker default. Mid-conversation introduction (for voice-mode projects)
            is on the roadmap.
          </div>

          {/* ── Optional capture features ── */}
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand">
              Optional capture steps
            </legend>
            <ul className="space-y-2">
              <li>
                <label className="flex cursor-pointer items-start gap-3 rounded-md border border-brand-rule p-3 hover:border-brand">
                  <input
                    type="checkbox"
                    checked={demographics}
                    onChange={(e) => { setDemographics(e.target.checked); setSaved(false); }}
                    className="mt-0.5 h-4 w-4 accent-brand"
                  />
                  <span>
                    <span className="block text-sm font-medium text-ink">Demographic intake</span>
                    <span className="mt-0.5 block text-xs text-ink-muted">
                      Optional intake (gender, age, relationship to area, pre-stance) shown before the conversation. Turn off to skip it entirely for this project.
                    </span>
                  </span>
                </label>
              </li>
              <li>
                <label className="flex cursor-pointer items-start gap-3 rounded-md border border-brand-rule p-3 hover:border-brand">
                  <input
                    type="checkbox"
                    checked={photovoice}
                    onChange={(e) => { setPhotovoice(e.target.checked); setSaved(false); }}
                    className="mt-0.5 h-4 w-4 accent-brand"
                  />
                  <span>
                    <span className="block text-sm font-medium text-ink">Photovoice</span>
                    <span className="mt-0.5 block text-xs text-ink-muted">
                      Participant submits a photo with a caption showing what they want to protect.
                    </span>
                  </span>
                </label>
              </li>
              <li>
                <label className="flex cursor-pointer items-start gap-3 rounded-md border border-brand-rule p-3 hover:border-brand">
                  <input
                    type="checkbox"
                    checked={mapping}
                    onChange={(e) => { setMapping(e.target.checked); setSaved(false); }}
                    className="mt-0.5 h-4 w-4 accent-brand"
                  />
                  <span>
                    <span className="block text-sm font-medium text-ink">Map pins</span>
                    <span className="mt-0.5 block text-xs text-ink-muted">
                      Participant drops numbered pins on the project-area map to mark concerns,
                      important places, or affected areas.
                    </span>
                  </span>
                </label>
              </li>
            </ul>
          </fieldset>

          {err && (
            <p className="rounded border border-red-300 bg-red-50 p-2 text-xs text-red-800">
              {err}
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="rounded-md bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Save changes'}
            </button>
            {saved && (
              <span className="text-xs font-medium text-green-700">
                ✓ Saved
              </span>
            )}
            <span className="ml-auto text-xs text-ink-subtle">
              {count} signifier{count !== 1 ? 's' : ''} selected
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
