'use client';

import { useState, type ReactNode } from 'react';

const C = {
  purple: '#6A0FC2',
  muted: '#6A5F74',
  subtle: '#9488A0',
};

export interface DashTab {
  key: string;
  label: string;
  /** Short one-line explainer shown under the tab bar for the active tab. */
  hint?: string;
  node: ReactNode;
}

/**
 * Tabbed container for dashboard sections that show the SAME underlying signal
 * cut different ways.
 *
 * Every panel is rendered on first paint; inactive ones are hidden with the
 * `hidden` attribute rather than unmounted. Because the panels are server-
 * rendered with their data already in props, switching tabs is instant — no
 * client fetch, no lag, no re-request. This is deliberate (per product ask:
 * "all secondary and tertiary tabs should load with the whole page").
 */
export default function DashTabs({
  tabs,
  defaultKey,
}: {
  tabs: DashTab[];
  defaultKey?: string;
}) {
  const [active, setActive] = useState(defaultKey ?? tabs[0]?.key);
  const activeTab = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div>
      <div
        role="tablist"
        aria-label="Views"
        className="inline-flex flex-wrap gap-1 rounded-xl p-1"
        style={{ background: '#F1EAF6', border: '1px solid #E7DEF0' }}
      >
        {tabs.map((t) => {
          const on = t.key === active;
          return (
            <button
              key={t.key}
              role="tab"
              type="button"
              aria-selected={on}
              onClick={() => setActive(t.key)}
              className="rounded-lg px-3.5 py-1.5 text-[12.5px] font-medium transition-colors"
              style={
                on
                  ? { background: '#fff', color: C.purple, boxShadow: '0 1px 2px rgba(59,42,78,.08)' }
                  : { background: 'transparent', color: C.muted }
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {activeTab?.hint && (
        <p className="mt-2 max-w-2xl text-[11.5px]" style={{ color: C.subtle }}>
          {activeTab.hint}
        </p>
      )}

      <div className="mt-4">
        {tabs.map((t) => (
          <div key={t.key} role="tabpanel" hidden={t.key !== active}>
            {t.node}
          </div>
        ))}
      </div>
    </div>
  );
}
