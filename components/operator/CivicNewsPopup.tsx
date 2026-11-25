'use client';

import { useEffect, useState } from 'react';
import type { CivicNewsItem } from '@/app/api/manage/civic-news-check/route';

const GRAD = 'linear-gradient(90deg,#FCC029 0%,#EC2BFC 52%,#6A0FC2 100%)';

/**
 * On dashboard load, checks the web for civic news about this project
 * (server-side cached; only items not already in the record, not previously
 * surfaced, and not rejected). Per-item: tick the relevant ones and add only
 * those, or ✕ to reject an item permanently. Nothing is written until you click.
 */
export default function CivicNewsPopup({ campaignId }: { campaignId: string }) {
  const [items, setItems] = useState<CivicNewsItem[] | null>(null);
  const [sel, setSel] = useState<boolean[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch(`/api/manage/civic-news-check?campaignId=${encodeURIComponent(campaignId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (live && d.ok && Array.isArray(d.newItems)) {
          setItems(d.newItems);
          setSel(d.newItems.map(() => true));
        }
      })
      .catch(() => {});
    return () => { live = false; };
  }, [campaignId]);

  if (dismissed || !items || items.length === 0) return null;

  const chosen = items.filter((_, i) => sel[i]);

  async function addToRecord() {
    if (adding || chosen.length === 0) return;
    setAdding(true);
    setErr(null);
    try {
      const res = await fetch('/api/manage/civic-news-add', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ campaignId, items: chosen }),
      });
      const d = await res.json();
      if (!res.ok) { setErr(d?.error ?? 'Could not add to the civic record.'); return; }
      setAdded(true);
    } catch {
      setErr('Network error adding to the civic record.');
    } finally {
      setAdding(false);
    }
  }

  function reject(i: number) {
    const it = items?.[i];
    if (!it) return;
    setItems((prev) => (prev ? prev.filter((_, j) => j !== i) : prev));
    setSel((prev) => prev.filter((_, j) => j !== i));
    fetch('/api/manage/civic-news-reject', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ campaignId, urls: [it.url] }),
    }).catch(() => {});
  }

  return (
    <div className="rounded-xl border p-4 shadow-sm" style={{ borderColor: '#E2D6F0', background: '#fff' }}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex-none rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-white" style={{ background: GRAD }}>
          New
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold" style={{ color: '#1F1330' }}>
            {items.length} item{items.length === 1 ? '' : 's'} in the news that aren&rsquo;t in your civic record yet
          </p>
          <p className="text-[11px]" style={{ color: '#9A8FA6' }}>Tick the ones about this project to add them; hit ✕ to never show an item again.</p>
          <ul className="mt-2 space-y-1.5">
            {items.map((it, i) => (
              <li key={i} className="flex items-start gap-2 text-[12.5px]" style={{ color: '#6A5F74' }}>
                <input
                  type="checkbox"
                  checked={!!sel[i]}
                  onChange={(e) => setSel((prev) => prev.map((v, j) => (j === i ? e.target.checked : v)))}
                  className="mt-1 flex-none accent-brand"
                  disabled={added}
                />
                <span className={`min-w-0 flex-1 ${sel[i] ? '' : 'opacity-50'}`}>
                  <a href={it.url} target="_blank" rel="noopener noreferrer" className="font-medium" style={{ color: '#6A0FC2', textDecoration: 'underline' }}>
                    {it.title}
                  </a>
                  {it.date && <span style={{ color: '#9A8FA6' }}> · {it.date}</span>}
                  {it.summary && <span> — {it.summary}</span>}
                </span>
                {!added && (
                  <button type="button" onClick={() => reject(i)} aria-label="Never show this again" title="Never show this again" className="flex-none px-1 text-[13px] leading-none" style={{ color: '#B9A9CE' }}>✕</button>
                )}
              </li>
            ))}
          </ul>

          {!added ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button type="button" onClick={addToRecord} disabled={adding || chosen.length === 0} className="rounded-lg px-3.5 py-2 text-[12.5px] font-semibold text-white disabled:opacity-50" style={{ background: GRAD }}>
                {adding ? 'Adding…' : `Add ${chosen.length} selected to the civic record`}
              </button>
              <button type="button" onClick={() => setDismissed(true)} className="rounded-lg border px-3 py-2 text-[12.5px]" style={{ borderColor: '#E2D6F0', color: '#6A5F74' }}>
                Not now
              </button>
              <span className="text-[11px]" style={{ color: '#9A8FA6' }}>Nothing is added until you click.</span>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[12.5px] font-medium" style={{ color: '#2F6B3C' }}>✓ Added to the civic record.</span>
              <button type="button" onClick={() => window.location.reload()} className="rounded-lg px-3 py-1.5 text-[12.5px] font-semibold text-white" style={{ background: GRAD }}>
                Reload to see it →
              </button>
            </div>
          )}
          {err && <p className="mt-2 text-[12px]" style={{ color: '#B23A2E' }}>{err}</p>}
        </div>

        <button type="button" onClick={() => setDismissed(true)} aria-label="Dismiss" className="flex-none text-[16px] leading-none" style={{ color: '#B9A9CE' }}>
          ×
        </button>
      </div>
    </div>
  );
}
