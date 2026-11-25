'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * Dev-only: wipes all conversations, messages, synthesis, and reports.
 * Projects are preserved. Hidden in production.
 */
export default function WipeButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    return null;
  }

  async function wipe() {
    setBusy(true);
    try {
      await fetch('/api/dev/wipe', { method: 'POST' });
      router.refresh();
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs text-red-700 hover:bg-red-50"
        title="Dev only — wipes all conversations and synthesis (keeps projects)"
      >
        Reset data
      </button>
    );
  }

  return (
    <span className="flex items-center gap-2 rounded-md border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-800">
      Wipe all conversations?
      <button
        type="button"
        onClick={wipe}
        disabled={busy}
        className="rounded bg-red-700 px-2 py-0.5 font-medium text-white hover:bg-red-800 disabled:opacity-50"
      >
        {busy ? '…' : 'Yes'}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-red-700 hover:underline"
      >
        cancel
      </button>
    </span>
  );
}
