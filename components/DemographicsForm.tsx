'use client';

import { useState } from 'react';
import { copyFor } from '@/lib/i18n';
import type { Demographics, Language } from '@/lib/types';
import { getSignifier } from '@/lib/signifiers';
import type { Dyad } from '@/lib/signifiers';
import DyadSlider from './signifying/DyadSlider';

const STANCE_DYAD = getSignifier('stance') as Dyad;

export default function DemographicsForm({
  language,
  sessionId,
  onSubmitted,
}: {
  language: Language;
  sessionId: string;
  onSubmitted: () => void;
}) {
  const c = copyFor(language);
  const opts = c.demographics.options;

  const [rel, setRel] = useState<Demographics['relationshipToArea'] | ''>('');
  const [gender, setGender] = useState<Demographics['gender'] | ''>('');
  const [genderText, setGenderText] = useState('');
  const [indig, setIndig] = useState<Demographics['indigenous'] | ''>('');
  const [indigText, setIndigText] = useState('');
  const [age, setAge] = useState<Demographics['ageRange'] | ''>('');
  const [preStance, setPreStance] = useState<number | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  async function submit(skip = false) {
    setBusy(true);
    const body: Partial<Demographics> = skip
      ? {}
      : {
          relationshipToArea: rel || undefined,
          gender: gender || undefined,
          genderSelfDescribe: gender === 'self_describe' ? genderText : undefined,
          indigenous: indig || undefined,
          indigenousSelfDescribe: indig === 'yes' ? indigText : undefined,
          ageRange: age || undefined,
          preStance,
        };
    try {
      await fetch(`/api/sessions/${sessionId}/demographics`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      onSubmitted();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-2xl py-4">
      <h2 className="font-serif text-xl font-semibold text-brand-dark">
        {c.demographics.heading}
      </h2>
      <p className="mt-1 text-sm text-ink-muted">{c.demographics.intro}</p>

      <div className="mt-6 space-y-5">
        <Select
          label={c.demographics.relationshipLabel}
          value={rel as string}
          onChange={(v) => setRel(v as Demographics['relationshipToArea'])}
          options={[
            ['lives_immediate', opts.relationship.lives_immediate],
            ['lives_nearby', opts.relationship.lives_nearby],
            ['works_or_business', opts.relationship.works_or_business],
            ['family_or_land', opts.relationship.family_or_land],
            ['visiting', opts.relationship.visiting],
            ['other', opts.relationship.other],
            ['prefer_not_to_say', opts.relationship.prefer_not_to_say],
          ]}
        />

        <div>
          <Select
            label={c.demographics.genderLabel}
            value={gender as string}
            onChange={(v) => setGender(v as Demographics['gender'])}
            options={[
              ['woman', opts.gender.woman],
              ['man', opts.gender.man],
              ['nonbinary', opts.gender.nonbinary],
              ['two_spirit', opts.gender.two_spirit],
              ['genderqueer', opts.gender.genderqueer],
              ['trans_woman', opts.gender.trans_woman],
              ['trans_man', opts.gender.trans_man],
              ['self_describe', opts.gender.self_describe],
              ['prefer_not_to_say', opts.gender.prefer_not_to_say],
            ]}
          />
          {gender === 'self_describe' && (
            <input
              type="text"
              value={genderText}
              onChange={(e) => setGenderText(e.target.value)}
              placeholder={c.demographics.selfDescribePlaceholder}
              className="mt-2 w-full rounded-md border border-brand-rule p-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          )}
        </div>

        <div>
          <Select
            label={c.demographics.indigenousLabel}
            value={indig as string}
            onChange={(v) => setIndig(v as Demographics['indigenous'])}
            options={[
              ['yes', opts.indigenous.yes],
              ['no', opts.indigenous.no],
              ['prefer_not_to_say', opts.indigenous.prefer_not_to_say],
            ]}
          />
          {indig === 'yes' && (
            <div className="mt-2">
              <label className="block text-xs text-ink-muted">
                {c.demographics.indigenousFollowupLabel}
              </label>
              <input
                type="text"
                value={indigText}
                onChange={(e) => setIndigText(e.target.value)}
                placeholder={c.demographics.indigenousFollowupHint}
                className="mt-1 w-full rounded-md border border-brand-rule p-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
          )}
        </div>

        <Select
          label={c.demographics.ageLabel}
          value={age as string}
          onChange={(v) => setAge(v as Demographics['ageRange'])}
          options={[
            ['18_24', opts.age['18_24']],
            ['25_34', opts.age['25_34']],
            ['35_49', opts.age['35_49']],
            ['50_64', opts.age['50_64']],
            ['65_plus', opts.age['65_plus']],
            ['prefer_not_to_say', opts.age.prefer_not_to_say],
          ]}
        />
      </div>

      {/* ── Pre-interview stance ── */}
      <div className="mt-8">
        <div className="mb-3 border-t border-brand-rule pt-6">
          <p className="text-xs uppercase tracking-wider text-brand font-semibold">
            {c.panels.stanceQ.heading}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            {c.panels.stanceQ.intro}
          </p>
        </div>
        <DyadSlider
          dyad={STANCE_DYAD}
          value={preStance}
          onChange={setPreStance}
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => submit(false)}
          disabled={busy}
          className="rounded-md bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {busy ? '…' : c.demographics.submit}
        </button>
        <button
          type="button"
          onClick={() => submit(true)}
          disabled={busy}
          className="rounded-md border border-brand-rule bg-white px-4 py-2 text-sm text-ink-muted hover:border-brand disabled:opacity-50"
        >
          {c.demographics.skipAll}
        </button>
      </div>
    </section>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-brand-rule bg-white p-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      >
        <option value="">—</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
