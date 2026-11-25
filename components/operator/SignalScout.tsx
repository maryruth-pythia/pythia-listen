'use client';

import { useEffect, useRef, useState } from 'react';

export default function SignalScout({
  campaignId,
  compact = false,
}: {
  campaignId?: string;
  compact?: boolean;
}) {
  const [report, setReport] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ack, setAck] = useState<'match' | 'off' | null>(null);
  const [feedback, setFeedback] = useState('');
  const [sent, setSent] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  async function run(force = false) {
    setBusy(true);
    setError(null);
    setAck(null);
    setSent(false);
    try {
      const res = await fetch('/api/scout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ campaignId, force }),
      });
      const data = await res.json();
      if (!res.ok) setError(data?.error ?? 'Scout could not report.');
      else setReport(data.report);
    } catch {
      setError('Network error.');
    } finally {
      setBusy(false);
    }
  }

  async function submit(kind: 'match' | 'off') {
    setAck(kind);
    setSent(true);
    try {
      await fetch('/api/scout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ campaignId, aligns: kind, note: feedback }),
      });
    } catch {
      /* keep the local acknowledgement even if the network hiccups */
    }
  }

  // In full mode, auto-load the synopsis. In compact mode, wait until opened
  // (so it doesn't run — and cost — on every dashboard load).
  useEffect(() => {
    if (!compact) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next && !report && !busy) run();
  }

  const panelBody = (
    <div
      className="p-5"
      style={{
        background: 'linear-gradient(100deg,#F3ECF7 0%,#FBF3EC 60%,#FDF6EE 100%)',
        border: '1px solid #E7DCD0',
        borderRadius: 16,
        boxShadow: '0 1px 2px rgba(59,42,78,.05),0 6px 22px rgba(59,42,78,.07)',
      }}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: '#9A8FA6' }}>
          Since your last check-in
        </span>
        <button
          onClick={() => run(true)}
          disabled={busy}
          className="ml-auto text-xs underline underline-offset-2 disabled:opacity-50"
          style={{ color: '#6A0FC2' }}
        >
          {busy ? 'Reading…' : 'Re-run'}
        </button>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Left — the synopsis */}
        <div>
          {error ? (
            <p className="text-sm" style={{ color: '#B23A2E' }}>{error}</p>
          ) : busy && !report ? (
            <p className="text-sm" style={{ color: '#9A8FA6' }}>
              Reading the latest signal…
            </p>
          ) : report ? (
            <p className="text-[14px] leading-relaxed" style={{ color: '#2E2438' }}>
              {report
                .replace(/^#+\s*/gm, '')
                .replace(/\*\*(.*?)\*\*/g, '$1')
                .replace(/^\s*[-*]\s+/gm, '')
                .replace(/\n{2,}/g, ' ')
                .trim()}
            </p>
          ) : (
            <p className="text-sm" style={{ color: '#9A8FA6' }}>
              No new signal to report yet.
            </p>
          )}
        </div>

        {/* Right — the human gut-check */}
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,.65)', border: '1px solid #EFE7DA' }}>
          <p className="text-[13px] font-medium" style={{ color: '#1F1330' }}>
            Your read — does this match what you’re hearing on the ground?
          </p>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Add a correction, a nuance, or something the signal is missing…"
            rows={3}
            className="mt-2 w-full resize-y rounded-lg border p-2.5 text-sm outline-none"
            style={{ borderColor: '#E7DCD0', color: '#2E2438', background: '#fff' }}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              onClick={() => submit('match')}
              className="rounded-md border px-3 py-1.5 text-[13px] font-medium transition"
              style={{
                borderColor: ack === 'match' ? '#4F8A5C' : '#CFE3D2',
                color: ack === 'match' ? '#fff' : '#4F8A5C',
                background: ack === 'match' ? '#4F8A5C' : '#EAF3EC',
              }}
            >
              Yes — this aligns
            </button>
            <button
              onClick={() => submit('off')}
              className="rounded-md border px-3 py-1.5 text-[13px] font-medium transition"
              style={{
                borderColor: ack === 'off' ? '#C77D2A' : '#EFD9BE',
                color: ack === 'off' ? '#fff' : '#C77D2A',
                background: ack === 'off' ? '#C77D2A' : '#FaF0E2',
              }}
            >
              No — this doesn’t align
            </button>
          </div>
          {sent && (
            <p className="mt-2 text-xs" style={{ color: '#9A8FA6' }}>
              Noted — saved to this Project’s ground-truth log; it’ll inform the next check-in.
            </p>
          )}
        </div>
      </div>
    </div>
  );

  if (compact) {
    return (
      <div className="relative" ref={boxRef}>
        <button
          type="button"
          onClick={toggleOpen}
          className="rounded-md border border-brand-rule px-3 py-1.5 text-[12.5px] font-medium text-brand hover:bg-brand-light"
        >
          🔎 Scout check-in {open ? '▴' : '▾'}
        </button>
        {open && (
          <div className="absolute right-0 z-20 mt-2 w-[min(92vw,560px)]">{panelBody}</div>
        )}
      </div>
    );
  }
  return panelBody;
}
