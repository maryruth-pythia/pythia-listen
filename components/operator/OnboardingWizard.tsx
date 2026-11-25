'use client';

/**
 * Guided, one-step-at-a-time onboarding wizard.
 *
 * Replaces the old single-scroll onboarding page. Flow:
 *   1. Your organization (once)
 *   2. Set up a project to track (makes the multi-project model explicit)
 *   3. Add input to that project — one source at a time
 *   4. See your dashboard
 *
 * The spoken-voice chooser is deliberately NOT here (admin/settings only).
 */

import { useState } from 'react';
import Link from 'next/link';
import OrgProfileForm from './OrgProfileForm';
import ConversationUpload from './ConversationUpload';

const GRAD = 'linear-gradient(90deg,#FCC029 0%,#EC2BFC 52%,#6A0FC2 100%)';

const STEP_TITLES = [
  'Your organization',
  'Set up a project to track',
  'Add your community’s input',
  'See your dashboard',
];

const SOURCES = [
  { key: 'whatsapp', label: 'WhatsApp messages' },
  { key: 'email', label: 'Email threads' },
  { key: 'documents', label: 'Documents & files' },
];

function Progress({ step }: { step: number }) {
  return (
    <div className="mb-6 flex items-center gap-2">
      {STEP_TITLES.map((t, i) => {
        const n = i + 1;
        const active = n === step;
        const done = n < step;
        return (
          <div key={t} className="flex items-center gap-2">
            <span
              className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-semibold"
              style={
                active || done
                  ? { background: GRAD, color: '#fff' }
                  : { background: '#EFE6FB', color: '#8A7E9C' }
              }
            >
              {done ? '✓' : n}
            </span>
            {i < STEP_TITLES.length - 1 && (
              <span className="h-px w-5 bg-brand-rule" aria-hidden="true" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-brand-rule bg-white p-6 shadow-sm">
      {children}
    </section>
  );
}

export default function OnboardingWizard() {
  const [step, setStep] = useState(1);
  const [sub, setSub] = useState(0); // within step 3
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');

  const [pName, setPName] = useState('');
  const [pAbout, setPAbout] = useState('');
  const [pLocation, setPLocation] = useState('');
  const [creating, setCreating] = useState(false);
  const [pErr, setPErr] = useState('');

  async function createProject() {
    if (!pName.trim() || !pAbout.trim()) {
      setPErr('Add a name and a short description of what to track.');
      return;
    }
    setCreating(true);
    setPErr('');
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: pName.trim(),
          routing: pAbout.trim(),
          kind: 'general',
          jurisdiction: pLocation.trim() || undefined,
          meta: pLocation.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        campaign?: { id?: string };
      };
      if (!res.ok) {
        setPErr(data.error ?? 'Could not create the project.');
        setCreating(false);
        return;
      }
      setProjectId(data.campaign?.id ?? null);
      setProjectName(pName.trim());
      setCreating(false);
      setStep(3);
      setSub(0);
    } catch {
      setPErr('Something went wrong. Please try again.');
      setCreating(false);
    }
  }

  function startAnother() {
    setPName('');
    setPAbout('');
    setPLocation('');
    setProjectId(null);
    setProjectName('');
    setSub(0);
    setStep(2);
  }

  const q = projectId ? `?campaign=${encodeURIComponent(projectId)}` : '';

  return (
    <div className="mx-auto max-w-2xl">
      <Progress step={step} />

      {/* STEP 1 — organization */}
      {step === 1 && (
        <Card>
          <h2 className="mb-1 font-serif text-xl font-semibold text-brand-dark">
            Your organization
          </h2>
          <p className="mb-4 text-sm text-ink-muted">
            Name your organization and add your contact details and logo — these appear
            on the briefs you create. Each person’s raw emails and files stay private to
            them; your team only ever sees the anonymous signal. Save, then continue.
          </p>
          <OrgProfileForm />
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-lg px-5 py-2 text-sm font-semibold text-white"
              style={{ background: GRAD }}
            >
              Next: set up a project →
            </button>
          </div>
        </Card>
      )}

      {/* STEP 2 — create a project */}
      {step === 2 && (
        <Card>
          <h2 className="mb-1 font-serif text-xl font-semibold text-brand-dark">
            Set up a project to track
          </h2>
          <p className="mb-4 text-sm text-ink-muted">
            A project is one issue you want to listen on — a specific development, a policy
            fight, a community question. <strong>You can set up more than one</strong>; each gets
            its own dashboard. Let’s make your first.
          </p>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-[13px] font-semibold text-brand-dark">
                Project name
              </label>
              <input
                id="proj-name"
                value={pName}
                onChange={(e) => setPName(e.target.value)}
                placeholder="e.g. Hawaiʻi Military Leased Lands"
                className="w-full rounded-lg border border-brand-rule px-3 py-2 text-sm focus:border-brand focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-semibold text-brand-dark">
                What should Pythia track here?
              </label>
              <textarea
                id="proj-about"
                value={pAbout}
                onChange={(e) => setPAbout(e.target.value)}
                rows={3}
                placeholder="A sentence or two on the issue, the key places or names, and what counts as relevant — this is how Pythia decides what belongs in this project."
                className="w-full rounded-lg border border-brand-rule px-3 py-2 text-sm focus:border-brand focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-semibold text-brand-dark">
                Location <span className="font-normal text-ink-subtle">(optional)</span>
              </label>
              <input
                id="proj-location"
                value={pLocation}
                onChange={(e) => setPLocation(e.target.value)}
                placeholder="e.g. Oʻahu, Hawaiʻi"
                className="w-full rounded-lg border border-brand-rule px-3 py-2 text-sm focus:border-brand focus:outline-none"
              />
            </div>
          </div>
          {pErr && <p className="mt-3 text-sm text-[#B23A2E]">{pErr}</p>}
          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-sm text-ink-muted hover:text-brand-dark"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={createProject}
              disabled={creating}
              className="rounded-lg px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: GRAD }}
            >
              {creating ? 'Creating…' : 'Create project & add input →'}
            </button>
          </div>
        </Card>
      )}

      {/* STEP 3 — add input, one source at a time */}
      {step === 3 && (
        <Card>
          <div className="mb-1 flex items-baseline justify-between">
            <h2 className="font-serif text-xl font-semibold text-brand-dark">
              Add input to {projectName || 'your project'}
            </h2>
            <span className="text-xs text-ink-subtle">
              Source {sub + 1} of {SOURCES.length}
            </span>
          </div>
          <p className="mb-4 text-sm text-ink-muted">
            Bring in one kind of input at a time. Add what you have and move on — you can
            always add more later. Each upload becomes anonymous signal on this project’s
            dashboard.
          </p>

          <div className="mb-3 rounded-lg px-3 py-2 text-sm font-semibold text-brand-dark" style={{ background: '#EFE6FB' }}>
            {SOURCES[sub].label}
          </div>

          <ConversationUpload
            key={SOURCES[sub].key}
            channelLock={SOURCES[sub].key}
            campaignId={projectId ?? undefined}
          />

          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => (sub > 0 ? setSub(sub - 1) : setStep(2))}
              className="text-sm text-ink-muted hover:text-brand-dark"
            >
              ← Back
            </button>
            {sub < SOURCES.length - 1 ? (
              <button
                type="button"
                onClick={() => setSub(sub + 1)}
                className="rounded-lg border border-brand-rule px-5 py-2 text-sm font-medium text-brand-dark hover:bg-brand-light"
              >
                Skip / Next source →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep(4)}
                className="rounded-lg px-5 py-2 text-sm font-semibold text-white"
                style={{ background: GRAD }}
              >
                Done — see dashboard →
              </button>
            )}
          </div>
        </Card>
      )}

      {/* STEP 4 — dashboard */}
      {step === 4 && (
        <Card>
          <h2 className="mb-1 font-serif text-xl font-semibold text-brand-dark">
            You’re set up
          </h2>
          <p className="mb-4 text-sm text-ink-muted">
            Everything you brought in becomes one clear picture for{' '}
            <strong>{projectName || 'your project'}</strong> — where your community stands, the
            issues that matter, common ground, and who you haven’t heard from. Every number
            comes from your data; nothing is invented.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/operator/dashboard${q}`}
              className="rounded-lg px-5 py-2 text-sm font-semibold text-white"
              style={{ background: GRAD }}
            >
              Open the dashboard →
            </Link>
            <button
              type="button"
              onClick={startAnother}
              className="rounded-lg border border-brand-rule px-5 py-2 text-sm font-medium text-brand-dark hover:bg-brand-light"
            >
              + Set up another project
            </button>
          </div>
        </Card>
      )}

      <p className="mt-6 text-center text-[11px] text-ink-subtle">
        The community owns the data · nothing is shared without the community’s say-so.
      </p>
    </div>
  );
}
