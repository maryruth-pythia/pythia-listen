'use client';

import { useState } from 'react';
import Link from 'next/link';
import MonitoredSources from './MonitoredSources';
import ChannelWeights from './ChannelWeights';
import FileWeights from './FileWeights';
import RedTeam from './RedTeam';

interface Watch {
  id: string;
  name: string;
  kind: 'site' | 'general';
  badge: string;
  meta?: string;
  blurb: string;
  routing: string;
  analysisFocus?: string;
  exclusions?: string;
  publicComments?: { id: string; text: string; source: string; stakeholderType?: string }[];
}

/**
 * Configure a Project: tweak the "what belongs here" routing cues (the keywords
 * the classifier uses) and manage which civic sources feed the dashboard. Works
 * for built-in Projects too — the edit is stored as an override.
 */
export default function ConfigureWatch({ watch }: { watch: Watch }) {
  const [routing, setRouting] = useState(watch.routing);
  const [focus, setFocus] = useState(watch.analysisFocus ?? '');
  const [exclusions, setExclusions] = useState(watch.exclusions ?? '');
  const [background, setBackground] = useState(
    (watch.publicComments ?? []).map((c) => c.text).join('\n')
  );

  const [urlInput, setUrlInput] = useState('');
  const [importing, setImporting] = useState(false);
  const [importErr, setImportErr] = useState<string | null>(null);

  async function importFromUrl() {
    const url = urlInput.trim();
    if (!url || importing) return;
    setImporting(true);
    setImportErr(null);
    const NL = String.fromCharCode(10);
    try {
      const res = await fetch('/api/manage/context-from-url', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setImportErr(data?.error ?? 'Could not import from that link.');
      } else {
        const lines: string[] = Array.isArray(data.lines) ? data.lines : [];
        if (lines.length === 0) {
          setImportErr('No community concerns found on that page.');
        } else {
          const add: string = typeof data.text === 'string' ? data.text : lines.join(NL);
          setBackground((prev) => (prev.trim() ? prev.trimEnd() + NL : '') + add);
          setSaved(false);
          setUrlInput('');
        }
      }
    } catch {
      setImportErr('Network error reaching the importer.');
    } finally {
      setImporting(false);
    }
  }
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [resorting, setResorting] = useState(false);
  const [resortMsg, setResortMsg] = useState<string | null>(null);

  const dirty =
    routing.trim() !== watch.routing.trim() ||
    focus.trim() !== (watch.analysisFocus ?? '').trim() ||
    exclusions.trim() !== (watch.exclusions ?? '').trim() ||
    background.trim() !==
      (watch.publicComments ?? []).map((c) => c.text).join('\n').trim();

  async function save(): Promise<boolean> {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: watch.id,
          name: watch.name,
          kind: watch.kind,
          badge: watch.badge,
          meta: watch.meta,
          blurb: watch.blurb,
          routing,
          analysisFocus: focus,
          exclusions,
          publicComments: background
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean)
            .map((text, i) => ({ id: `bg-${i}`, text, source: 'operator background' })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'Could not save.');
        return false;
      }
      setSaved(true);
      return true;
    } catch {
      setError('Network error saving.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function resort() {
    setResorting(true);
    setResortMsg(null);
    try {
      // Save any pending keyword edits first so the re-sort uses them.
      if (dirty) {
        const ok = await save();
        if (!ok) {
          setResorting(false);
          return;
        }
      }
      const res = await fetch('/api/campaigns/backfill', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ campaignId: watch.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResortMsg(data?.error ?? 'Re-sort failed.');
      } else {
        setResortMsg(
          data.moved > 0
            ? `Pulled ${data.moved} matching signal${data.moved === 1 ? '' : 's'} into "${watch.name}" (scanned ${data.scanned}).`
            : `No additional signals matched (scanned ${data.scanned}).`
        );
      }
    } catch {
      setResortMsg('Network error during re-sort.');
    } finally {
      setResorting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-ink-muted">
        This is where you <strong>tune the model</strong> for this Project —
        what belongs, what it&rsquo;s for, and what to ignore. Each dashboard
        section&rsquo;s <em>Tune</em> button brings you here.
      </p>
      {/* Section 1 — routing keywords */}
      <section className="rounded-lg border border-brand-rule bg-white p-4">
        <h3 className="mb-1 font-serif text-base font-semibold text-brand-dark">
          Keywords to use
        </h3>
        <p className="mb-3 text-sm text-ink-muted">
          These cues are what Pythia uses to sort incoming email &amp; documents
          into this Project. Name the places, projects, people, dockets, and
          keywords that mark a message as belonging here — and what to keep out.
        </p>
        <textarea
          value={routing}
          onChange={(e) => {
            setRouting(e.target.value);
            setSaved(false);
          }}
          rows={7}
          className="w-full rounded-md border border-brand-rule px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={save}
            disabled={saving || !dirty || !routing.trim()}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save keywords'}
          </button>
          <button
            onClick={resort}
            disabled={resorting}
            className="rounded-lg border border-brand-rule px-3 py-2 text-sm text-brand-dark disabled:opacity-50"
            title="Re-check existing signals against these keywords and pull matches into this Project"
          >
            {resorting ? 'Re-sorting…' : 'Re-sort existing signals →'}
          </button>
          {saved && <span className="text-sm" style={{ color: '#2F6B3C' }}>Saved.</span>}
          {error && <span className="text-sm text-[#B23A2E]">{error}</span>}
        </div>
        {resortMsg && (
          <p className="mt-2 text-sm" style={{ color: '#2F6B3C' }}>{resortMsg}</p>
        )}
        <p className="mt-2 text-xs text-ink-subtle">
          Editing keywords changes how <em>future</em> data is sorted. Use
          &ldquo;Re-sort existing signals&rdquo; to also re-check what&rsquo;s
          already here.
        </p>
      </section>

      {/* Section 2 — source weighting (global by channel) */}
      {/* Section 1b — analysis focus: the lens the analyses reason through */}
      <section id="tune" className="scroll-mt-24 rounded-lg border border-brand-rule bg-white p-4">
        <h3 className="mb-1 font-serif text-base font-semibold text-brand-dark">
          Focus for the analysis
        </h3>
        <p className="mb-3 text-sm text-ink-muted">
          Tell Pythia what matters here — who the stakeholders are, what decision
          this informs, and what you want to learn. The analyses (cross-source
          synthesis, top questions, opinion camps) reason through this lens
          instead of the default community-sentiment view. Leave blank to use the
          default.
        </p>
        <textarea
          value={focus}
          onChange={(e) => {
            setFocus(e.target.value);
            setSaved(false);
          }}
          rows={5}
          placeholder="e.g. Assess whether Pythia is viable, defensible, and fundable. Stakeholders: funders, advisors, CBOs. Surface where they converge and diverge on the product, the business model, and the risks — and whose view is missing."
          className="w-full rounded-md border border-brand-rule px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={save}
            disabled={saving || !dirty}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Saving\u2026' : 'Save focus'}
          </button>
          {saved && <span className="text-sm" style={{ color: '#2F6B3C' }}>Saved.</span>}
          {error && <span className="text-sm text-[#B23A2E]">{error}</span>}
        </div>
        <p className="mt-2 text-xs text-ink-subtle">
          Saving re-runs the dashboard analyses through this lens on next load.
        </p>
      </section>

      {/* Section 1c — what to ignore (relevance exclusions) */}
      <section className="rounded-lg border border-brand-rule bg-white p-4">
        <h3 className="mb-1 font-serif text-base font-semibold text-brand-dark">
          What to ignore
        </h3>
        <p className="mb-3 text-sm text-ink-muted">
          Things the analyses should NOT treat as outside signal — e.g. your own
          internal/promotional documents, or organisations that only show up as
          cited research. Named here, every AI section will exclude them.
        </p>
        <textarea
          value={exclusions}
          onChange={(e) => {
            setExclusions(e.target.value);
            setSaved(false);
          }}
          rows={3}
          placeholder="e.g. Pythia's own applications, team bios and internal goals; think-tanks/institutes that only appear as cited research (Brookings, Danish Institute, IHRB)."
          className="w-full rounded-md border border-brand-rule px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={save}
            disabled={saving || !dirty}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Saving\u2026' : 'Save exclusions'}
          </button>
          {saved && <span className="text-sm" style={{ color: '#2F6B3C' }}>Saved.</span>}
          {error && <span className="text-sm text-[#B23A2E]">{error}</span>}
        </div>
        <p className="mt-2 text-xs text-ink-subtle">
          Applies to every AI section on the next refresh.
        </p>
      </section>

      {/* Section 1d — background "civic-record" samples (grounding, esp. cold-start) */}
      <section className="rounded-lg border border-brand-rule bg-white p-4">
        <h3 className="mb-1 font-serif text-base font-semibold text-brand-dark">
          Background context &mdash; sample concerns
        </h3>
        <p className="mb-3 text-sm text-ink-muted">
          A few illustrative community concerns for this project area &mdash; one per line.
          These are <strong>background samples</strong> (from the civic record or similar
          projects), kept separate from your real survey data. They let the AI ask smart
          questions on a brand-new project with no responses yet, and give you a baseline to
          contrast against your actual results.
        </p>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Paste a news or article link to pull concerns from…"
            className="min-w-0 flex-1 rounded-md border border-brand-rule px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
          />
          <button
            type="button"
            onClick={importFromUrl}
            disabled={importing || !urlInput.trim()}
            className="rounded-lg border border-brand-rule bg-brand-vlight px-3 py-2 text-sm font-medium text-brand disabled:opacity-50"
          >
            {importing ? 'Reading…' : 'Import from link'}
          </button>
        </div>
        {importErr && <p className="mb-2 text-sm text-[#B23A2E]">{importErr}</p>}
        <textarea
          value={background}
          onChange={(e) => {
            setBackground(e.target.value);
            setSaved(false);
          }}
          rows={5}
          placeholder={'e.g. Worried the turbines will spoil the ocean view.\nConcern about noise near homes at night.\nWants local jobs and a community benefit fund.'}
          className="w-full rounded-md border border-brand-rule px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={save}
            disabled={saving || !dirty}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Saving\u2026' : 'Save background context'}
          </button>
          {saved && <span className="text-sm" style={{ color: '#2F6B3C' }}>Saved.</span>}
          {error && <span className="text-sm text-[#B23A2E]">{error}</span>}
        </div>
        <p className="mt-2 text-xs text-ink-subtle">
          Used to ground the survey builder &amp; conversational surveys; never quoted verbatim
          to respondents.
        </p>
      </section>

      <ChannelWeights />

      {/* Section 2b — weight individual already-uploaded files */}
      <FileWeights campaignId={watch.id} />

      {/* Section 3 — civic data sources */}
      <section>
        <h3 className="mb-1 font-serif text-base font-semibold text-brand-dark">
          Which civic data feeds this dashboard
        </h3>
        <p className="mb-3 text-sm text-ink-muted">
          Add local news, county/township pages, dockets, or organized-group
          sites so the dashboard draws on public records too — not just your
          uploaded email &amp; documents.
        </p>
        <MonitoredSources campaignId={watch.id} projectName={watch.name} />
      </section>

      {/* Red-team / accuracy check */}
      <section className="rounded-lg border border-brand-rule bg-white p-4">
        <h3 className="mb-1 font-serif text-base font-semibold text-brand-dark">
          Red-team — is the dashboard grounded?
        </h3>
        <p className="mb-3 text-sm text-ink-muted">
          Run an adversarial check: a skeptical model re-verifies every AI claim
          on this Project&rsquo;s dashboard against the raw signals and flags any
          that aren&rsquo;t supported.
        </p>
        <RedTeam campaignId={watch.id} />
      </section>

      <div>
        <Link
          href={`/operator/dashboard?campaign=${encodeURIComponent(watch.id)}`}
          className="text-sm text-brand underline underline-offset-2 hover:text-brand-dark"
        >
          ← Back to the dashboard
        </Link>
      </div>
    </div>
  );
}
