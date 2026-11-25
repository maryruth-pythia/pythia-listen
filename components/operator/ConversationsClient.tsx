'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { StatusPill, fmtDate } from './Shared';
import type { Session } from '@/lib/types';

interface EnrichedSession {
  session: Session;
  messageCount: number;
  projectName: string;
}

const LANG_LABELS: Record<string, string> = { en: 'EN', es: 'ES', tl: 'TL' };
const AGE_LABELS: Record<string, string> = {
  '18_24': '18–24',
  '25_34': '25–34',
  '35_49': '35–49',
  '50_64': '50–64',
  '65_plus': '65+',
};

export default function ConversationsClient({
  enriched,
}: {
  enriched: EnrichedSession[];
}) {
  const [filterLang, setFilterLang] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAge, setFilterAge] = useState<string>('all');
  const [filterRelationship, setFilterRelationship] = useState<string>('all');
  const [filterIndigenous, setFilterIndigenous] = useState<string>('all');
  const [filterHasSignifiers, setFilterHasSignifiers] = useState<string>('all');
  const [filterConsent, setFilterConsent] = useState<string>('all');

  const filtered = useMemo(() => {
    return enriched.filter(({ session: s }) => {
      if (filterLang !== 'all' && s.language !== filterLang) return false;
      if (filterStatus !== 'all' && s.status !== filterStatus) return false;
      if (filterAge !== 'all' && s.demographics?.ageRange !== filterAge) return false;
      if (filterRelationship !== 'all' && s.demographics?.relationshipToArea !== filterRelationship) return false;
      if (filterIndigenous !== 'all' && s.demographics?.indigenous !== filterIndigenous) return false;
      if (filterHasSignifiers === 'yes' && (!s.signifierResponses || s.signifierResponses.length === 0)) return false;
      if (filterHasSignifiers === 'no' && s.signifierResponses && s.signifierResponses.length > 0) return false;
      if (filterConsent === 'public' && !s.consent?.mayShareInPublicReport) return false;
      if (filterConsent === 'developer' && !s.consent?.mayShareWithDeveloper) return false;
      if (filterConsent === 'none' && s.consent) return false;
      return true;
    });
  }, [enriched, filterLang, filterStatus, filterAge, filterRelationship, filterIndigenous, filterHasSignifiers, filterConsent]);

  const anyActive =
    filterLang !== 'all' ||
    filterStatus !== 'all' ||
    filterAge !== 'all' ||
    filterRelationship !== 'all' ||
    filterIndigenous !== 'all' ||
    filterHasSignifiers !== 'all' ||
    filterConsent !== 'all';

  function reset() {
    setFilterLang('all');
    setFilterStatus('all');
    setFilterAge('all');
    setFilterRelationship('all');
    setFilterIndigenous('all');
    setFilterHasSignifiers('all');
    setFilterConsent('all');
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-lg border border-brand-rule bg-brand-vlight p-4">
        <Select label="Language" value={filterLang} onChange={setFilterLang}>
          <option value="all">All languages</option>
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="tl">Tagalog</option>
        </Select>

        <Select label="Status" value={filterStatus} onChange={setFilterStatus}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="recap">Recap</option>
          <option value="consented">Consented</option>
          <option value="closed">Closed</option>
        </Select>

        <Select label="Age range" value={filterAge} onChange={setFilterAge}>
          <option value="all">All ages</option>
          {Object.entries(AGE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </Select>

        <Select label="Relationship to area" value={filterRelationship} onChange={setFilterRelationship}>
          <option value="all">All relationships</option>
          <option value="lives_immediate">Lives — immediate area</option>
          <option value="lives_nearby">Lives — nearby</option>
          <option value="works_or_business">Works / business</option>
          <option value="family_or_land">Family or land connection</option>
          <option value="visiting">Visiting</option>
        </Select>

        <Select label="Indigenous" value={filterIndigenous} onChange={setFilterIndigenous}>
          <option value="all">All</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
          <option value="prefer_not_to_say">Prefer not to say</option>
        </Select>

        <Select label="Self-signified" value={filterHasSignifiers} onChange={setFilterHasSignifiers}>
          <option value="all">All</option>
          <option value="yes">Has scores</option>
          <option value="no">No scores</option>
        </Select>

        <Select label="Consent" value={filterConsent} onChange={setFilterConsent}>
          <option value="all">All consent</option>
          <option value="public">OK for public report</option>
          <option value="developer">OK for developer</option>
          <option value="none">No consent given</option>
        </Select>

        {anyActive && (
          <button
            type="button"
            onClick={reset}
            className="rounded-md border border-brand px-3 py-1.5 text-xs text-brand hover:bg-white"
          >
            Clear filters
          </button>
        )}

        <span className="ml-auto text-xs text-ink-subtle">
          {filtered.length} of {enriched.length}
        </span>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <p className="rounded border border-brand-rule bg-brand-vlight p-6 text-sm text-ink-muted">
          No conversations match these filters.
        </p>
      ) : (
        <ul className="divide-y divide-brand-rule rounded-lg border border-brand-rule bg-white">
          {filtered.map(({ session: s, messageCount, projectName }) => (
            <li key={s.id}>
              <Link
                href={`/operator/conversations/${s.id}`}
                className="block px-4 py-3 transition hover:bg-brand-vlight"
              >
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <StatusPill status={s.status} />
                  <span className="font-medium text-ink">{projectName}</span>
                  <span className="text-xs uppercase text-ink-subtle">
                    {LANG_LABELS[s.language] ?? s.language}
                  </span>
                  {s.signifierResponses && s.signifierResponses.length > 0 && (
                    <span className="rounded bg-brand-vlight px-1.5 py-0.5 text-xs text-brand">
                      ✓ scored
                    </span>
                  )}
                  {s.demographics?.indigenous === 'yes' && (
                    <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700">
                      Indigenous
                    </span>
                  )}
                  <span className="ml-auto text-xs text-ink-subtle">
                    {messageCount} {messageCount === 1 ? 'msg' : 'msgs'} ·{' '}
                    {fmtDate(s.createdAt)}
                  </span>
                </div>
                <div className="mt-1 font-mono text-xs text-ink-subtle">
                  {s.id}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-ink-subtle">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-brand-rule bg-white px-2 py-1.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      >
        {children}
      </select>
    </label>
  );
}
