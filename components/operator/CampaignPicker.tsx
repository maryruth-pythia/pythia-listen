'use client';

import { useEffect, useState } from 'react';

type Watch = { id: string; name: string; kind: string };

/**
 * Project switcher (dropdown). Fetches the full Project list (built-in + user
 * created) from /api/campaigns so newly created Projects appear here. Full
 * navigation so the server dashboard re-computes for the chosen Project.
 *
 * When no Project is selected yet (empty activeId — e.g. the global nav on a
 * page without ?campaign), it selects the first fetched Project so the control
 * never renders blank.
 */
export default function CampaignPicker({
  basePath,
  activeId,
  tone = 'dark',
  hrefPattern,
}: {
  basePath: string;
  activeId: string;
  tone?: 'light' | 'dark';
  /** When set, navigate to hrefPattern with '{id}' replaced (path-param routes
   * like /operator/watches/{id}/configure). Otherwise basePath?campaign=id. */
  hrefPattern?: string;
}) {
  const [watches, setWatches] = useState<Watch[]>([]);
  useEffect(() => {
    fetch('/api/campaigns', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setWatches(Array.isArray(d.campaigns) ? d.campaigns : []))
      .catch(() => {});
  }, []);
  const light = tone === 'light';
  const options: Watch[] = watches.length
    ? watches
    : activeId
      ? [{ id: activeId, name: activeId, kind: 'general' }]
      : [];
  // Fall back to the first Project when nothing is explicitly selected, so the
  // controlled <select> always has a matching value.
  const current = activeId || options[0]?.id || '';
  return (
    <select
      value={current}
      onChange={(e) => {
        const id = e.target.value;
        if (id && id !== current) {
          window.location.assign(
            hrefPattern
              ? hrefPattern.replace('{id}', encodeURIComponent(id))
              : `${basePath}?campaign=${encodeURIComponent(id)}`
          );
        }
      }}
      className="rounded-lg px-3 py-2 text-[14px] font-semibold outline-none"
      style={{
        background: light ? 'rgba(255,255,255,.18)' : '#fff',
        color: light ? '#fff' : '#1F1330',
        border: light ? '1px solid rgba(245,231,195,.6)' : '1px solid #E4DACB',
        cursor: 'pointer',
      }}
    >
      {options.length === 0 && (
        <option value="" style={{ color: '#1F1330' }}>
          Select a project…
        </option>
      )}
      {options.map((c) => (
        <option key={c.id} value={c.id} style={{ color: '#1F1330' }}>
          {c.name} · {c.kind === 'general' ? 'general' : 'project'}
        </option>
      ))}
    </select>
  );
}
