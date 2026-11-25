import Link from 'next/link';
import { getScopedCampaigns } from '@/lib/scope';

const CREAM = '#FCF6C4';

/**
 * Campaign switcher — a row of links to `${basePath}?campaign=<id>`.
 * Server-rendered (no client JS); the active campaign is highlighted.
 * `tone="light"` for use on the gradient header; default for cream pages.
 */
export default async function CampaignTabs({
  basePath,
  activeId,
  tone = 'dark',
}: {
  basePath: string;
  activeId: string;
  tone?: 'light' | 'dark';
}) {
  const CAMPAIGNS = await getScopedCampaigns();
  return (
    <div className="flex flex-wrap items-center gap-2">
      {CAMPAIGNS.map((c) => {
        const active = c.id === activeId;
        if (tone === 'light') {
          return (
            <Link
              key={c.id}
              href={`${basePath}?campaign=${c.id}`}
              className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[14px] font-semibold transition"
              style={{
                background: active ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.06)',
                color: active ? '#fff' : 'rgba(255,255,255,.75)',
                border: active
                  ? `1px solid ${CREAM}`
                  : '1px solid rgba(255,255,255,.14)',
              }}
            >
              {c.name}
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em]"
                style={{ background: CREAM, color: '#6A0FC2' }}
              >
                {c.badge}
              </span>
            </Link>
          );
        }
        return (
          <Link
            key={c.id}
            href={`${basePath}?campaign=${c.id}`}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[13px] font-semibold transition"
            style={{
              background: active ? '#1F1330' : '#fff',
              color: active ? '#fff' : '#1F1330',
              borderColor: active ? '#1F1330' : '#E4DACB',
            }}
          >
            {c.name}
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em]"
              style={{
                background: active ? 'rgba(245,231,195,.9)' : '#F1EAF6',
                color: active ? '#6A0FC2' : '#6A0FC2',
              }}
            >
              {c.badge}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
