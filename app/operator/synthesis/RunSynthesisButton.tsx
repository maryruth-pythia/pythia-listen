'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function RunSynthesisButton({
  projectId,
  disabled,
}: {
  projectId: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/synthesis', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Synthesis failed');
      router.push(`/operator/synthesis/${data.run.id}`);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={run}
        disabled={busy || disabled}
        title={disabled ? 'No consented conversations yet' : ''}
        className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-40"
      >
        {busy ? 'Running…' : 'Run synthesis'}
      </button>
      {err && <p className="text-xs text-red-700">{err}</p>}
    </div>
  );
}
