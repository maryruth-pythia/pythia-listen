'use client';

import { useState } from 'react';

const GRAD = 'linear-gradient(90deg,#FCC029 0%,#EC2BFC 52%,#6A0FC2 100%)';

/**
 * Campaign-coach nudge shown under the representation gaps: when the record is
 * thin on some voices, it drafts a ready-to-send check-in email to go gather
 * more signal. Editable + copyable. Dashboard-only (not printed on briefs).
 */
export default function CoachNudge({ campaignId }: { campaignId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function draft(refresh = false) {
    if (loading) return;
    setLoading(true);
    setErr(null);
    setOpen(true);
    try {
      const res = await fetch('/api/manage/coach-email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ campaignId, refresh }),
      });
      const d = await res.json();
      if (!res.ok) { setErr(d?.error ?? 'Could not draft the email.'); return; }
      setSubject(d.subject || '');
      setBody(d.body || '');
    } catch {
      setErr('Network error reaching the coach.');
    } finally {
      setLoading(false);
    }
  }

  function copy() {
    const text = `Subject: ${subject}\n\n${body}`;
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  }

  return (
    <div className="mt-3 rounded-lg border border-dashed p-3" style={{ borderColor: '#E2D6F0', background: '#FBF8F2' }}>
      <p className="text-[12.5px] font-medium" style={{ color: '#1F1330' }}>
        Coach — the record is thin on some voices. Want to go gather more?
      </p>
      {!open ? (
        <button type="button" onClick={() => draft()} className="mt-2 rounded-md px-3 py-1.5 text-[12.5px] font-semibold text-white" style={{ background: GRAD }}>
          ✉ Draft a check-in email to reach them
        </button>
      ) : (
        <div className="mt-2">
          {loading ? (
            <p className="text-[12px]" style={{ color: '#9A8FA6' }}>Drafting a check-in email…</p>
          ) : (
            <>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded-md border px-2 py-1.5 text-[12.5px]" style={{ borderColor: '#E7DCD0', color: '#1F1330' }} />
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} className="mt-2 w-full resize-y rounded-md border px-2 py-2 text-[12.5px]" style={{ borderColor: '#E7DCD0', color: '#2E2438' }} />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button type="button" onClick={copy} className="rounded-md px-3 py-1.5 text-[12.5px] font-semibold text-white" style={{ background: GRAD }}>{copied ? 'Copied ✓' : 'Copy email'}</button>
                <button type="button" onClick={() => draft(true)} className="rounded-md border px-2.5 py-1.5 text-[12px]" style={{ borderColor: '#E7DCD0', color: '#6A0FC2' }}>↻ Redraft</button>
                <span className="text-[11px]" style={{ color: '#9A8FA6' }}>Paste your survey link where it says [SURVEY LINK], then send.</span>
              </div>
            </>
          )}
          {err && <p className="mt-1 text-[12px]" style={{ color: '#B23A2E' }}>{err}</p>}
        </div>
      )}
    </div>
  );
}
