'use client';

import { useState } from 'react';
import type { ProjectCard } from '@/lib/reference/content';

/**
 * Lets an operator shape what a campaign's fact sheet says. Edits the built-in
 * ProjectCard fields; Save persists an override (merged over the default on the
 * live page). Reset restores the built-in copy.
 */
export default function FactSheetEditor({
  campaignId,
  card,
}: {
  campaignId: string;
  card: ProjectCard;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: card.name,
    oneLine: card.oneLine,
    whatItIs: card.whatItIs,
    where: card.where,
    size: card.size,
    developer: card.developer,
    process: card.process,
    status: card.status,
    benefits: card.benefits.join('\n'),
    commitments: card.commitments.join('\n'),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/factsheet', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          card: {
            ...form,
            benefits: form.benefits.split('\n').map((s) => s.trim()).filter(Boolean),
            commitments: form.commitments.split('\n').map((s) => s.trim()).filter(Boolean),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) setError(data?.error ?? 'Could not save.');
      else window.location.reload();
    } catch {
      setError('Network error saving the fact sheet.');
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (!confirm('Reset this fact sheet to the built-in version?')) return;
    setBusy(true);
    try {
      const res = await fetch('/api/factsheet', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ campaignId, reset: true }),
      });
      if (res.ok) window.location.reload();
      else setError('Could not reset.');
    } catch {
      setError('Network error.');
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="mx-auto mb-4 max-w-3xl">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg px-3 py-2 text-[13px] font-semibold text-white"
          style={{ background: 'linear-gradient(90deg,#FCC029,#EC2BFC,#6A0FC2)' }}
        >
          ✎ Shape this fact sheet
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto mb-6 max-w-3xl rounded-2xl border p-5" style={{ borderColor: '#E7DCD0', background: '#fff' }}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-serif text-lg font-semibold" style={{ color: '#1F1330' }}>Shape the fact sheet</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-[12px] underline" style={{ color: '#9A8FA6' }}>close</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" value={form.name} onChange={(v) => set('name', v)} />
        <Field label="Where" value={form.where} onChange={(v) => set('where', v)} />
        <Field label="Size" value={form.size} onChange={(v) => set('size', v)} />
        <Field label="Developer" value={form.developer} onChange={(v) => set('developer', v)} />
        <Field label="Review process" value={form.process} onChange={(v) => set('process', v)} />
      </div>
      <Field label="One-line summary" value={form.oneLine} onChange={(v) => set('oneLine', v)} className="mt-3" />
      <Area label="What it is" value={form.whatItIs} onChange={(v) => set('whatItIs', v)} />
      <Area label="Where it stands (status)" value={form.status} onChange={(v) => set('status', v)} />
      <Area label="What the community could gain (one per line)" value={form.benefits} onChange={(v) => set('benefits', v)} rows={4} />
      <Area label="Commitments on the table (one per line)" value={form.commitments} onChange={(v) => set('commitments', v)} rows={4} />

      {error && <p className="mt-2 text-sm" style={{ color: '#B23A2E' }}>{error}</p>}

      <div className="mt-4 flex items-center gap-3">
        <button type="button" onClick={save} disabled={busy} className="rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" style={{ background: '#6A0FC2' }}>
          {busy ? 'Saving…' : 'Save fact sheet'}
        </button>
        <button type="button" onClick={reset} disabled={busy} className="text-[13px] underline" style={{ color: '#9A8FA6' }}>
          Reset to built-in
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, className }: { label: string; value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: '#9A8FA6' }}>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none" style={{ borderColor: '#E4DACB' }} />
    </label>
  );
}

function Area({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <label className="mt-3 block">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: '#9A8FA6' }}>{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none" style={{ borderColor: '#E4DACB' }} />
    </label>
  );
}
