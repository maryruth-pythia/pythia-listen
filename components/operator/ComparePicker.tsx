'use client';

import { useEffect, useState } from 'react';

type Watch = { id: string; name: string; kind: string };

/**
 * Chooser for which Project to compare the current one against. Fetches the full
 * Project list so user-created Projects are comparable too.
 */
export default function ComparePicker({
  activeCampaign,
  compareId,
}: {
  activeCampaign: string;
  compareId: string;
}) {
  const [watches, setWatches] = useState<Watch[]>([]);
  useEffect(() => {
    fetch('/api/campaigns', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setWatches(Array.isArray(d.campaigns) ? d.campaigns : []))
      .catch(() => {});
  }, []);
  const options = watches.filter((c) => c.id !== activeCampaign);
  return (
    <label className="inline-flex items-center gap-2 text-[12.5px]" style={{ color: '#6A5F74' }}>
      <span className="font-medium" style={{ color: '#1F1330' }}>Compare against:</span>
      <select
        value={compareId}
        onChange={(e) => {
          const id = e.target.value;
          if (id && id !== compareId) {
            window.location.assign(
              `/operator/dashboard?campaign=${encodeURIComponent(activeCampaign)}&compare=${encodeURIComponent(id)}`
            );
          }
        }}
        className="rounded-lg px-2.5 py-1.5 text-[13px] font-semibold outline-none"
        style={{ background: '#fff', color: '#1F1330', border: '1px solid #E4DACB', cursor: 'pointer' }}
      >
        {options.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} · {c.kind === 'general' ? 'general' : 'project'}
          </option>
        ))}
      </select>
    </label>
  );
}
