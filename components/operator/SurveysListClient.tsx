'use client';

import { useState } from 'react';

interface Row {
  id: string;
  title: string;
  project: string;
  status: string;
  createdAt: string;
  languages: string[];
}

export default function SurveysListClient({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);

  async function del(id: string, title: string) {
    if (!window.confirm(`Delete the survey "${title}"? This can't be undone.`)) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/manage/surveys/${id}`, { method: 'DELETE' });
      if (res.ok) setRows((r) => r.filter((x) => x.id !== id));
    } finally {
      setBusy(null);
    }
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-brand-rule bg-white p-6 text-sm text-ink-muted">
        No surveys yet — build one in the Survey Builder.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {rows.map((s) => (
        <li
          key={s.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-rule bg-white p-4"
        >
          <div>
            <div className="font-serif text-base font-semibold text-brand-dark">{s.title}</div>
            <div className="mt-0.5 text-xs text-ink-subtle">
              Feeds: {s.project} · {s.status} · {new Date(s.createdAt).toLocaleDateString()} ·{' '}
              {s.languages.join(', ')}
            </div>
            {s.status === 'published' ? (
              <a
                href={`/s/${s.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand underline underline-offset-2"
              >
                Open public link →
              </a>
            ) : (
              <a
                href={`/operator/agents/survey-builder?draft=${s.id}`}
                className="text-xs text-brand underline underline-offset-2"
              >
                Draft — continue editing →
              </a>
            )}
          </div>
          <button
            type="button"
            onClick={() => del(s.id, s.title)}
            disabled={busy === s.id}
            className="rounded-md border px-3 py-1.5 text-sm font-medium disabled:opacity-50"
            style={{ borderColor: '#E3B5AE', color: '#B23A2E', background: '#FBECEA' }}
          >
            {busy === s.id ? 'Deleting…' : 'Delete'}
          </button>
        </li>
      ))}
    </ul>
  );
}
