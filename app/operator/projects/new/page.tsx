'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { RESEARCH_QUESTIONS } from '@/lib/research-questions';
import { SIGNIFIERS } from '@/lib/signifiers';
import type { ResearchQuestionId, SignifierId } from '@/lib/types';

export default function NewProject() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [brief, setBrief] = useState('');
  const [commentsRaw, setCommentsRaw] = useState('');
  const [languages, setLanguages] = useState<string[]>(['en']);
  const [researchQuestionIds, setResearchQuestionIds] = useState<ResearchQuestionId[]>([
    'community_ask',
    'community_fears',
    'meaningful_engagement',
    'shared_interests',
    'design_changes',
  ]);
  const [signifierIds, setSignifierIds] = useState<SignifierId[]>([
    'stance',
    'trust_developer',
    'engagement_respect',
    'project_framing',
  ]);
  const [photovoiceEnabled, setPhotovoiceEnabled] = useState(false);
  const [mappingEnabled, setMappingEnabled] = useState(false);
  const [mapLat, setMapLat] = useState('');
  const [mapLng, setMapLng] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function toggleLang(l: string) {
    setLanguages((prev) =>
      prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]
    );
  }

  function toggleQ(id: ResearchQuestionId) {
    setResearchQuestionIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleSig(id: SignifierId) {
    setSignifierIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      // Parse comments: each non-empty line becomes a comment.
      const publicComments = commentsRaw
        .split(/\n+/)
        .map((l) => l.trim())
        .filter(Boolean)
        .map((text, i) => ({
          id: `c-${Date.now()}-${i}`,
          text,
          source: 'Operator-supplied',
        }));

      const lat = parseFloat(mapLat);
      const lng = parseFloat(mapLng);
      const mapCenter =
        mappingEnabled && !Number.isNaN(lat) && !Number.isNaN(lng)
          ? { lat, lng, zoom: 11 }
          : undefined;

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          location: location.trim(),
          briefMarkdown: brief.trim(),
          publicComments,
          languages,
          researchQuestionIds,
          signifierIds,
          photovoiceEnabled,
          mappingEnabled,
          mapCenter,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Create failed');
      router.push('/operator/projects');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="max-w-2xl">
      <Link
        href="/operator/projects"
        className="text-sm text-brand hover:underline"
      >
        ← All surveys
      </Link>

      <header className="mt-4 mb-6 border-b border-brand-rule pb-4">
        <p className="mb-2 text-xs uppercase tracking-[0.18em] text-brand">
          New survey
        </p>
        <h1 className="font-serif text-2xl font-semibold text-brand-dark">
          Set up a new engagement
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          The survey name, location, and brief are what Pythia will reference
          when talking with community members. Public comments seed the AI's
          awareness of what concerns are out there — they are not shown
          verbatim to participants.
        </p>
      </header>

      <div className="space-y-5">
        <Field
          label="Survey name"
          value={name}
          onChange={setName}
          placeholder="e.g. Honua Solar & Storage"
        />
        <Field
          label="Location"
          value={location}
          onChange={setLocation}
          placeholder="e.g. Hawai‘i Island, leeward side"
        />

        <label className="block">
          <span className="text-sm font-medium text-ink">
            Survey brief (Markdown)
          </span>
          <span className="block text-xs text-ink-muted">
            What's being proposed, by whom, scale, stage, what's being decided.
            Pythia will use this when participants ask questions.
          </span>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={10}
            placeholder="# Project name&#10;&#10;## Location&#10;…&#10;&#10;## What is being decided right now&#10;…"
            className="mt-2 w-full rounded-md border border-brand-rule p-3 text-sm font-mono focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-ink">
            Public comments (one per line)
          </span>
          <span className="block text-xs text-ink-muted">
            Paste community concerns from the docket / public-comment record,
            one per line. Pythia uses these to know what's in the air; never
            quotes them verbatim.
          </span>
          <textarea
            value={commentsRaw}
            onChange={(e) => setCommentsRaw(e.target.value)}
            rows={8}
            placeholder={'Renters never see the public-hearing notices.\nBy the time the EIS scoping meeting happens, the site has already been chosen.\n…'}
            className="mt-2 w-full rounded-md border border-brand-rule p-3 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </label>

        <fieldset>
          <legend className="text-sm font-medium text-ink">Languages</legend>
          <div className="mt-2 flex flex-wrap gap-3">
            {(['en', 'es', 'tl'] as const).map((l) => (
              <label
                key={l}
                className={`cursor-pointer rounded-md border px-4 py-2 text-sm transition ${
                  languages.includes(l)
                    ? 'border-brand bg-brand-light text-brand-dark'
                    : 'border-brand-rule bg-white text-ink-muted'
                }`}
              >
                <input
                  type="checkbox"
                  checked={languages.includes(l)}
                  onChange={() => toggleLang(l)}
                  className="mr-2 accent-brand"
                />
                {l === 'en' ? 'English' : l === 'es' ? 'Español' : 'Tagalog'}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium text-ink">
            Research questions
          </legend>
          <p className="mt-1 text-xs text-ink-muted">
            Pick 3–7 questions Pythia should try to surface in conversations
            on this project. The AI weaves them in via story-frame — never as
            a survey, never repeated verbatim. Pick what you actually want to
            know.
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Selected: {researchQuestionIds.length}{' '}
            {researchQuestionIds.length < 3 ? '(pick at least 3)' : ''}
            {researchQuestionIds.length > 7 ? '(7 is the max)' : ''}
          </p>
          <ul className="mt-3 space-y-2">
            {RESEARCH_QUESTIONS.map((q) => (
              <li key={q.id}>
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition ${
                    researchQuestionIds.includes(q.id)
                      ? 'border-brand bg-brand-light'
                      : 'border-brand-rule bg-white hover:border-brand'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={researchQuestionIds.includes(q.id)}
                    onChange={() => toggleQ(q.id)}
                    className="mt-0.5 h-4 w-4 accent-brand"
                  />
                  <span>
                    <span className="block text-sm font-medium text-ink">
                      {q.label}
                    </span>
                    <span className="mt-1 block text-xs text-ink-muted">
                      {q.description}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        {err && (
          <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            {err}
          </p>
        )}

        <fieldset>
          <legend className="text-sm font-medium text-ink">
            Signifiers (self-scored by participant)
          </legend>
          <p className="mt-1 text-xs text-ink-muted">
            Pick 4–6 dyads or triads. After the conversation, the participant
            scores themselves on each — by drag-and-drop on screen, or by voice
            (Pythia reads them aloud). Choose what you want to measure.
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Selected: {signifierIds.length}{' '}
            {signifierIds.length < 4 ? '(pick at least 4)' : ''}
            {signifierIds.length > 6 ? '(6 is the max)' : ''}
          </p>
          <ul className="mt-3 space-y-2">
            {SIGNIFIERS.map((s) => (
              <li key={s.id}>
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition ${
                    signifierIds.includes(s.id)
                      ? 'border-brand bg-brand-light'
                      : 'border-brand-rule bg-white hover:border-brand'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={signifierIds.includes(s.id)}
                    onChange={() => toggleSig(s.id)}
                    className="mt-0.5 h-4 w-4 accent-brand"
                  />
                  <span>
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-medium text-ink">
                        {s.label}
                      </span>
                      <span className="rounded-full bg-brand-vlight px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-brand">
                        {s.kind}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs text-ink-muted">
                      {s.kind === 'dyad'
                        ? `${(s as { poleLow: string }).poleLow} ↔ ${(s as { poleHigh: string }).poleHigh}`
                        : `${(s as { poles: string[] }).poles.join(' · ')}`}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium text-ink">
            Additional modalities
          </legend>
          <p className="mt-1 text-xs text-ink-muted">
            Optional ways for participants to contribute beyond the conversation.
            Each is opt-in and skippable by the participant.
          </p>
          <div className="mt-3 space-y-3">
            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-brand-rule p-3 hover:border-brand">
              <input
                type="checkbox"
                checked={photovoiceEnabled}
                onChange={(e) => setPhotovoiceEnabled(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-brand"
              />
              <span>
                <span className="block text-sm font-medium text-ink">
                  Photovoice
                </span>
                <span className="mt-1 block text-xs text-ink-muted">
                  Participant uploads photos with captions — &quot;show me what
                  matters to you about this place.&quot;
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-brand-rule p-3 hover:border-brand">
              <input
                type="checkbox"
                checked={mappingEnabled}
                onChange={(e) => setMappingEnabled(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-brand"
              />
              <span className="flex-1">
                <span className="block text-sm font-medium text-ink">
                  Mapping
                </span>
                <span className="mt-1 block text-xs text-ink-muted">
                  Participant drops pins on a map to mark concerns, important
                  places, or affected areas.
                </span>
                {mappingEnabled && (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={mapLat}
                      onChange={(e) => setMapLat(e.target.value)}
                      placeholder="Center lat (e.g. 19.6)"
                      className="w-full rounded-md border border-brand-rule p-1.5 text-xs focus:border-brand focus:outline-none"
                    />
                    <input
                      type="text"
                      value={mapLng}
                      onChange={(e) => setMapLng(e.target.value)}
                      placeholder="Center lng (e.g. -155.97)"
                      className="w-full rounded-md border border-brand-rule p-1.5 text-xs focus:border-brand focus:outline-none"
                    />
                  </div>
                )}
              </span>
            </label>
          </div>
        </fieldset>

        <button
          type="button"
          onClick={submit}
          disabled={
            busy ||
            !name.trim() ||
            !location.trim() ||
            !brief.trim() ||
            researchQuestionIds.length < 3 ||
            researchQuestionIds.length > 7 ||
            signifierIds.length < 4 ||
            signifierIds.length > 6
          }
          className="rounded-md bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Create project'}
        </button>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-brand-rule p-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      />
    </label>
  );
}
