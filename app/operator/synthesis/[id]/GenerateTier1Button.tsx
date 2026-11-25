'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function GenerateTier1Button({ runId }: { runId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/synthesis/${runId}/tier1`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={generate}
        disabled={busy}
        className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
      >
        {busy ? 'Generating…' : 'Generate Tier 1 report'}
      </button>
      {err && <p className="mt-2 text-xs text-red-700">{err}</p>}
    </div>
  );
}
