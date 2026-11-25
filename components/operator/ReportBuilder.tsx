'use client';

import { useState, useEffect, useRef, Fragment, type ChangeEvent } from 'react';
import type { DashboardData, TrendPoint } from '@/lib/dashboard/aggregate';
import type { CoalitionAnalysis } from '@/lib/analysis/coalition';
import type { QuestionAnalysis } from '@/lib/analysis/questions';
import type { ClusterAnalysis } from '@/lib/analysis/clusters';
import type { MetaResult } from '@/lib/synthesis/meta';
import type { CountyDemographics } from '@/lib/reference/demographics';
import type { OrgProfile } from '@/lib/org-profile';
import type { RepresentationAnalysis } from '@/lib/analysis/representation';
import type { ProjectCard } from '@/lib/reference/content';
import { TrendCard, HeatMapCard } from '@/components/operator/DashboardSections';
import OpinionClusters from '@/components/operator/OpinionClusters';
import TopQuestions from '@/components/operator/TopQuestions';
import CoalitionTable from '@/components/operator/CoalitionTable';
import OriginationMap from '@/components/operator/OriginationMap';
import RepresentationPanel from '@/components/operator/RepresentationPanel';
import SurveyFindings from '@/components/operator/SurveyFindings';
import StateOfPlay from '@/components/operator/StateOfPlay';
import type { StateOfPlay as SoPType } from '@/app/api/manage/state-of-play/route';
import type { SurveyFindingsResult } from '@/lib/analysis/survey-findings';

const PLUM = '#1F1330';
const GRAD = 'linear-gradient(90deg,#FCC029 0%,#EC2BFC 52%,#6A0FC2 100%)';
const RULE = '#E7DCD0';

const STANCE = [
  { key: 'opposition', label: 'Opposition', color: '#B23A2E' },
  { key: 'concern', label: 'Concern', color: '#C77D2A' },
  { key: 'mixed', label: 'Mixed', color: '#7A6E88' },
  { key: 'support', label: 'Support', color: '#4F8A5C' },
  { key: 'neutral', label: 'Neutral', color: '#9A8FA6' },
] as const;
const STANCE_COLOR: Record<string, string> = Object.fromEntries(STANCE.map((s) => [s.key, s.color]));
const SOURCE_LABEL: Record<string, string> = { desk: 'Internal docs', civic: 'Civic record', pythia: 'Internal docs', survey: 'Survey responses' };
const SOURCES = ['civic', 'pythia', 'survey'] as const;

const ALL_SECTIONS = [
  { id: 'summary', label: 'Summary & context (your text)' },
  { id: 'projectfacts', label: 'Project facts' },
  { id: 'overview', label: 'Community sentiment score' },
  { id: 'sentiment', label: 'Sentiment breakdown' },
  { id: 'trend', label: 'Sentiment over time' },
  { id: 'sources', label: 'The three signal sources' },
  { id: 'meta', label: 'Meta-synthesis (all sources)' },
  { id: 'clusters', label: 'Opinion clusters & common ground' },
  { id: 'questions', label: 'Top questions people ask' },
  { id: 'survey', label: 'What the survey found (agree / disagree)' },
  { id: 'stateofplay', label: 'State of play (live legal & permitting)' },
  { id: 'heatmap', label: 'Issue heat map' },
  { id: 'coalition', label: 'Coalition & influencers' },
  { id: 'origination', label: 'Signal by place' },
  { id: 'missingVoices', label: 'Whose voice is missing' },
] as const;

type SectionId = (typeof ALL_SECTIONS)[number]['id'];

export default function ReportBuilder({
  campaignName,
  today,
  data,
  coalition,
  questions,
  clusters,
  meta,
  demo,
  excludedByRedTeam = 0,
  orgProfile,
  representation,
  projectCard,
  surveyFindings,
  preset,
  audience,
  onAudience,
}: {
  campaignName: string;
  today: string;
  data: DashboardData;
  coalition: CoalitionAnalysis;
  questions: QuestionAnalysis;
  clusters: ClusterAnalysis;
  meta: MetaResult;
  demo: CountyDemographics | null;
  excludedByRedTeam?: number;
  orgProfile: OrgProfile | null;
  representation: RepresentationAnalysis;
  projectCard: ProjectCard | null;
  surveyFindings: SurveyFindingsResult;
  preset: 'fact' | 'report';
  audience: 'community' | 'developer';
  onAudience: (a: 'community' | 'developer') => void;
}) {
  const [title, setTitle] = useState(`${campaignName} — Community Signal Report`);
  const [subtitle, setSubtitle] = useState('Community sentiment read');
  const [preparedBy, setPreparedBy] = useState(orgProfile?.name ?? '');
  const [dateStr, setDateStr] = useState(today);
  const [summaryText, setSummaryText] = useState('');
  const [order, setOrder] = useState<SectionId[]>(ALL_SECTIONS.map((s) => s.id));
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(ALL_SECTIONS.map((s) => [s.id, s.id !== 'summary']))
  );
  const [dragId, setDragId] = useState<SectionId | null>(null);

  const [density, setDensity] = useState<'skimmable' | 'balanced' | 'detailed'>('skimmable');
  const [factsOpen, setFactsOpen] = useState(true);
  const previewRef = useRef<HTMLDivElement>(null);
  const [caseText, setCaseText] = useState('');
  const [surveyPick, setSurveyPick] = useState<string>(surveyFindings.surveys[0]?.surveyId ?? '');
  const [fmtWeb, setFmtWeb] = useState(true);
  const [fmtPdf, setFmtPdf] = useState(true);
  const [customBlocks, setCustomBlocks] = useState<{ id: string; title: string; body: string }[]>([]);
  const [cta, setCta] = useState('');
  const [ctaPos, setCtaPos] = useState<'top' | 'bottom' | 'both'>('bottom');
  const [narrative, setNarrative] = useState<Record<string, { synthesis: string; paragraphs: string[]; bullets: string[] }> | null>(null);
  const [narrating, setNarrating] = useState(false);
  const [narrErr, setNarrErr] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [summErr, setSummErr] = useState<string | null>(null);
  const [sopSources, setSopSources] = useState<{ label: string; url: string }[]>([]);
  const [sopState, setSopState] = useState<SoPType | null>(null);
  const [tuning, setTuning] = useState(false);
  const [tuneNote, setTuneNote] = useState<string | null>(null);
  async function tuneFromPurpose() {
    const aim = caseText.trim();
    if (!aim || tuning) return;
    setTuning(true);
    setTuneNote(null);
    try {
      const avail = ALL_SECTIONS.filter((sec) => has[sec.id]).map((sec) => ({ id: sec.id, label: sec.label }));
      const res = await fetch('/api/manage/brief-tune', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ purpose: aim, sections: avail, preset }),
      });
      const d = await res.json();
      if (!res.ok) { setTuneNote(d?.error ?? 'Could not tune the brief.'); return; }
      if (Array.isArray(d.sections) && d.sections.length > 0) {
        setEnabled(Object.fromEntries(ALL_SECTIONS.map((sec) => [sec.id, (d.sections as string[]).includes(sec.id)])));
      }
      if (d.density === 'skimmable' || d.density === 'balanced' || d.density === 'detailed') setDensity(d.density);
      if (typeof d.caseText === 'string' && d.caseText.trim()) setCaseText(d.caseText.trim());
      setTuneNote(d.note || 'Tuned the brief to your purpose.');
    } catch {
      setTuneNote('Network error reaching the tuner.');
    } finally {
      setTuning(false);
    }
  }
  const [factFields, setFactFields] = useState<Record<string, boolean>>({
    whatItIs: false, where: true, size: true, developer: true, process: true, status: true, benefits: false, commitments: false,
  });
  const [factOrder, setFactOrder] = useState<string[]>(['whatItIs', 'where', 'size', 'developer', 'process', 'status']);
  function moveFact(k: string, dir: -1 | 1) {
    setFactOrder((o) => {
      const i = o.indexOf(k);
      const j = i + dir;
      if (j < 0 || j >= o.length) return o;
      const n = [...o];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  }
  const REPORT_PREAMBLE: Record<string, string> = {
    overview: "The community's overall standing on this project, built from every source separately.",
    sentiment: "How the signals break down by stance — never averaged into one verdict.",
    trend: "Community sentiment across the life of the project, each source on its own line.",
    sources: "What each source is saying, kept separate so no single channel dominates.",
    meta: "Where the public record and direct listening agree, where they diverge, and whose voice is thin.",
    clusters: "A community is 4–5 camps, not for-vs-against — the value is the common ground across them.",
    questions: "The questions the community keeps asking, ranked by how often they come up.",
    survey: "What the community said directly in the survey \u2014 each statement on its own, never averaged into one number.",
    stateofplay: "The current legal and permitting picture, pulled live from the web \u2014 laws, timeline, and what to do next.",
    heatmap: "The same signal by issue and source — where concerns cluster and where sources agree.",
    coalition: "The people and groups who shape this conversation, by role and reach.",
    origination: "Where the community\u2019s signal concentrates, and how sentiment varies place to place.",
    missingVoices: "Who the record represents, whose voice is thin, and constructive paths forward.",
  };
  const SECTION_HEADING: Record<string, string> = {
    projectfacts: 'Project facts',
    overview: 'Community sentiment score',
    sentiment: 'Sentiment breakdown',
    trend: 'How sentiment moved over time',
    meta: 'Meta-synthesis across all sources',
    clusters: 'Opinion clusters & common ground',
    questions: 'Questions people keep asking',
    coalition: 'Coalition & community influencers',
    missingVoices: "Representation — who's in, who's missing",
    survey: 'What Pythia\u2019s survey found',
  };

  const has: Record<string, boolean> = {
    summary: true,
    projectfacts: !!projectCard,
    overview: data.total > 0,
    sentiment: data.total > 0,
    trend: data.trend.filter((t) => typeof t.score === 'number').length >= 2,
    sources: data.sources.length > 0,
    meta: meta.agreements.length + meta.tensions.length + meta.missingVoices.length > 0,
    clusters: clusters.generated && clusters.camps.length > 0,
    questions: questions.generated && questions.questions.length > 0,
    heatmap: data.heatmap.length > 0,
    coalition: coalition.generated && coalition.members.length > 0,
    origination: data.places.length > 0,
    missingVoices: representation.generated,
    survey: surveyFindings.generated,
    stateofplay: true,
  };
  const visibleOrder = order.filter((id) => has[id]);
  const pickedFinding =
    surveyFindings.surveys.find((sv) => sv.surveyId === surveyPick) ??
    surveyFindings.surveys[0] ??
    null;
  const citedRefs = Array.from(
    new Map(
      coalition.members
        .flatMap((m) => m.signals)
        .filter((sg) => sg.url)
        .map((sg) => [sg.url as string, sg])
    ).values()
  ).slice(0, 8);
  const limit = density === 'skimmable' ? 3 : density === 'balanced' ? 6 : 99;

  const FACT_SECTIONS: SectionId[] = ['summary', 'projectfacts', 'overview', 'clusters', 'questions', 'survey', 'stateofplay', 'origination'];
  const REPORT_SECTIONS: SectionId[] = ['summary', 'overview', 'sentiment', 'trend', 'meta', 'clusters', 'survey', 'stateofplay', 'coalition', 'missingVoices'];
  function applyDerived(p: 'fact' | 'report') {
    setDensity(p === 'fact' ? 'skimmable' : 'detailed');
    const want = p === 'fact' ? FACT_SECTIONS : REPORT_SECTIONS;
    setEnabled(
      Object.fromEntries(
        ALL_SECTIONS.map((sec) => [sec.id, want.includes(sec.id) && (has[sec.id] || sec.id === 'summary')])
      )
    );
  }
  useEffect(() => {
    applyDerived(preset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset]);
  useEffect(() => {
    if (preset !== 'report') return;
    const root = previewRef.current;
    if (!root) return;
    const PAGE = 1056;
    const GAP = 30;
    const paginate = () => {
      try {
        const secs = Array.from(root.querySelectorAll(':scope > .report-section')) as HTMLElement[];
        secs.forEach((s) => { s.style.marginTop = ''; });
        const rootTop = root.getBoundingClientRect().top;
        let boundary = PAGE;
        for (const s of secs) {
          const r = s.getBoundingClientRect();
          const top = r.top - rootTop;
          const h = r.height;
          if (h < PAGE && top < boundary && top + h > boundary) {
            const push = boundary - top + GAP;
            const curMt = parseFloat(getComputedStyle(s).marginTop) || 0;
            s.style.marginTop = `${curMt + push}px`;
            boundary = boundary + PAGE + GAP;
          } else {
            while (top + h > boundary) boundary += PAGE + GAP;
          }
        }
      } catch { /* preview-only cosmetic */ }
    }
    let raf = requestAnimationFrame(paginate);
    const rerun = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(paginate); };
    const clear = () => { const secs = Array.from(root.querySelectorAll(':scope > .report-section')) as HTMLElement[]; secs.forEach((s) => { s.style.marginTop = ''; }); };
    window.addEventListener('beforeprint', clear);
    window.addEventListener('afterprint', rerun);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('beforeprint', clear); window.removeEventListener('afterprint', rerun); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, order, enabled, density, narrative, summaryText, caseText, cta, customBlocks, title, subtitle, factFields, factOrder]);

  function move(id: SectionId, dir: -1 | 1) {
    setOrder((o) => {
      const i = o.indexOf(id);
      const j = i + dir;
      if (j < 0 || j >= o.length) return o;
      const next = [...o];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function drop(targetId: SectionId) {
    setOrder((o) => {
      if (!dragId || dragId === targetId) return o;
      const next = o.filter((x) => x !== dragId);
      next.splice(next.indexOf(targetId), 0, dragId);
      return next;
    });
    setDragId(null);
  }
  const labelOf = (id: SectionId) => ALL_SECTIONS.find((s) => s.id === id)!.label;

  const NARRATIVE_IDS: SectionId[] = ['overview', 'sentiment', 'trend', 'meta', 'clusters', 'questions', 'coalition', 'missingVoices', 'survey'];
  function sectionContext(id: SectionId): unknown {
    switch (id) {
      case 'overview': return { score: data.score, band: data.band.label, totalSignals: data.total, sources: data.sources.map((s) => ({ source: s.source, count: s.count, score: s.score })) };
      case 'sentiment': return { totalSignals: data.total, stance: data.stance };
      case 'trend': return { points: data.trend.filter((t) => typeof t.score === 'number').slice(-8).map((t) => ({ period: t.period, score: t.score })) };
      case 'meta': return { agreements: meta.agreements, tensions: meta.tensions, missingVoices: meta.missingVoices };
      case 'clusters': return { camps: clusters.camps.map((c) => ({ label: c.label, share: c.share, gist: c.gist })), consensus: clusters.consensus.map((c) => ({ statement: c.statement, note: c.note })), divides: clusters.divides.map((d) => ({ statement: d.statement, camps: d.camps })) };
      case 'questions': return { questions: questions.questions.slice(0, 8).map((q) => q.question) };
      case 'coalition': return { members: coalition.members.slice(0, 10).map((m) => ({ name: m.name, role: m.role, influence: m.influence, stance: m.stance })) };
      case 'missingVoices': return { segments: representation.segments.map((sg) => ({ name: sg.name, share: sg.share, gist: sg.gist })), missing: representation.missing, pathsForward: representation.pathsForward };
      case 'survey': return pickedFinding ? { title: pickedFinding.title, responses: pickedFinding.n, statements: pickedFinding.statements.map((st) => ({ statement: st.label, mean: st.mean, agreePct: st.agreePct, disagreePct: st.disagreePct, poleLow: st.poleLow, poleHigh: st.poleHigh })), stanceShift: pickedFinding.stanceShift } : null;
      default: return null;
    }
  }
  async function writeNarrative() {
    if (narrating) return;
    const secs = order
      .filter((id) => enabled[id] && has[id] && NARRATIVE_IDS.includes(id))
      .map((id) => ({ id, label: labelOf(id), context: sectionContext(id) }))
      .filter((sc) => sc.context);
    if (secs.length === 0) { setNarrErr('Turn on some report sections first.'); return; }
    setNarrating(true);
    setNarrErr(null);
    try {
      const res = await fetch('/api/manage/report-narrative', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ audience, caseText, campaignName, density, sections: secs }),
      });
      const d = await res.json();
      if (!res.ok || !d.narrative) { setNarrErr(d?.error ?? 'Could not write the narrative.'); return; }
      setNarrative(d.narrative);
      // Also draft the summary in the same click, if it's on and empty.
      if (enabled.summary && !summaryText.trim()) void draftSummary();
    } catch {
      setNarrErr('Network error reaching the narrative writer.');
    } finally {
      setNarrating(false);
    }
  }
  async function draftSummary() {
    if (summarizing) return;
    const secs = order
      .filter((id) => enabled[id] && has[id] && NARRATIVE_IDS.includes(id))
      .map((id) => ({ id, label: labelOf(id), context: sectionContext(id) }))
      .filter((sc) => sc.context);
    if (secs.length === 0) { setSummErr('Turn on some sections first.'); return; }
    setSummarizing(true);
    setSummErr(null);
    try {
      const res = await fetch('/api/manage/brief-summary', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ campaignName, audience, caseText, sections: secs }),
      });
      const d = await res.json();
      if (!res.ok || !d.summary) { setSummErr(d?.error ?? 'Could not draft a summary.'); return; }
      setSummaryText(d.summary);
    } catch {
      setSummErr('Network error drafting the summary.');
    } finally {
      setSummarizing(false);
    }
  }
  function sectionToDoc(id: SectionId): { paras: string[]; bullets: string[] } {
    const out = { paras: [] as string[], bullets: [] as string[] };
    switch (id) {
      case 'overview': out.paras.push(`Community sentiment: ${data.score}/100 (${data.band.label}), from ${data.total} signals across your sources.`); break;
      case 'sentiment': STANCE.forEach((st) => { const c = data.stance[st.key as keyof typeof data.stance] ?? 0; const p = data.total ? Math.round((c / data.total) * 100) : 0; if (c) out.bullets.push(`${st.label}: ${p}% (${c})`); }); break;
      case 'trend': { const tp = data.trend.filter((t) => typeof t.score === 'number'); if (tp.length >= 2) out.paras.push(`Community sentiment moved ${tp[0].score} → ${tp[tp.length - 1].score} over ${tp.length} months.`); break; }
      case 'meta': meta.agreements.slice(0, 5).forEach((a) => out.bullets.push(`Shared ground — ${a.title}: ${a.detail}`)); meta.tensions.slice(0, 5).forEach((t) => out.bullets.push(`Tension — ${t.title}: ${t.detail}`)); break;
      case 'clusters': clusters.camps.forEach((c) => out.bullets.push(`${c.label} (~${c.share}%): ${c.gist}`)); clusters.consensus.slice(0, 6).forEach((c) => out.bullets.push(`Common ground: ${c.statement}`)); break;
      case 'questions': questions.questions.slice(0, 8).forEach((q) => out.bullets.push(q.question)); break;
      case 'coalition': coalition.members.slice(0, 10).forEach((m) => out.bullets.push(`${m.name} — ${m.role}`)); break;
      case 'missingVoices': representation.missing.slice(0, 6).forEach((mv) => out.bullets.push(`${mv.who} — ${mv.why}`)); break;
      case 'survey': if (pickedFinding) { out.paras.push(`From ${pickedFinding.n} anonymous survey responses.`); pickedFinding.statements.slice(0, 8).forEach((st) => out.bullets.push(`${st.label}: ${st.mean}/100 (${st.agreePct}% lean ${st.poleHigh})`)); } break;
      default: break;
    }
    return out;
  }
  async function downloadDocx() {
    const blocks: { heading: string; lead?: string; paras?: string[]; bullets?: string[] }[] = [];
    for (const id of order.filter((id) => enabled[id] && has[id])) {
      if (id === 'summary') continue; // carried in payload.summary
      if (id === 'projectfacts') {
        if (projectCard) {
          const facts = factOrder.filter((k) => factFields[k] && FACT_LABEL[k]).map((k) => `${FACT_LABEL[k]}: ${factValue(projectCard, k)}`);
          if (factFields.benefits && projectCard.benefits.length) facts.push(`Benefits: ${projectCard.benefits.join(', ')}`);
          if (factFields.commitments && projectCard.commitments.length) facts.push(`Commitments: ${projectCard.commitments.join(', ')}`);
          if (facts.length) blocks.push({ heading: 'Project facts', bullets: facts });
        }
        continue;
      }
      const heading = (SECTION_HEADING[id] as string) || labelOf(id);
      const nar = narrative?.[id];
      if (nar) { blocks.push({ heading, lead: nar.synthesis, paras: nar.paragraphs, bullets: nar.bullets }); continue; }
      if (id === 'stateofplay') {
        if (sopState) {
          const bl: string[] = [];
          sopState.laws.forEach((l) => bl.push(`${l.title}${l.date ? ` (${l.date})` : ''}${l.detail ? ` — ${l.detail}` : ''}`));
          sopState.timeline.forEach((t) => bl.push(`${t.when} — ${t.label} [${t.status}]`));
          sopState.actions.forEach((a) => bl.push(`Next: ${a}`));
          if (sopState.headline || bl.length) blocks.push({ heading: 'State of play', lead: sopState.headline, bullets: bl });
        } else if (projectCard && projectCard.commitments.length) {
          blocks.push({ heading: 'State of play', bullets: projectCard.commitments });
        }
        continue;
      }
      const d = sectionToDoc(id);
      if (d.paras.length || d.bullets.length) blocks.push({ heading, paras: d.paras, bullets: d.bullets });
    }
    const payload = {
      filename: `${campaignName} brief`,
      title, subtitle, orgName: orgProfile?.name ?? preparedBy,
      dateStr, preparedBy, caseText, cta,
      summary: enabled.summary ? summaryText : '',
      blocks,
    };
    const res = await fetch('/api/manage/brief-docx', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(campaignName || 'brief').replace(/[^a-z0-9\-_]+/gi, '_')}.docx`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-5xl px-4">
      <style
        dangerouslySetInnerHTML={{
          __html: `@media print {
            /* Print ONLY the brief, not the operator chrome or the beige page. */
            body * { visibility: hidden !important; }
            .report-preview, .report-preview * { visibility: visible !important; }
            .report-preview {
              position: absolute !important; left: 0 !important; top: 0 !important;
              width: 100% !important; margin: 0 !important; padding: 0 !important;
              box-shadow: none !important; border: none !important; border-radius: 0 !important;
              background-image: none !important; background: #fff !important;
            }
            .no-print { display: none !important; }
            /* Keep the brand colours (gradient band, chips, bars) in the PDF. */
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            html, body { background: #fff !important; }
            .report-section { break-inside: avoid; margin-top: 10px !important; }
            /* Don't split a paragraph, list item, or card across a page. */
            .report-preview p, .report-preview li, .report-preview .rounded-lg, .report-preview .rounded-xl, .report-preview svg { break-inside: avoid; }
          }
          @page { margin: 12mm; }`,
        }}
      />
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Controls */}
        <aside className="report-controls">
          <div className="rounded-xl border bg-white p-4" style={{ borderColor: RULE }}>
            <h2 className="font-serif text-lg font-semibold" style={{ color: PLUM }}>Build the brief</h2>
            {excludedByRedTeam > 0 && (
              <p className="mt-1.5 rounded-md px-2 py-1.5 text-[11.5px]" style={{ background: '#EAF3EC', color: '#2F6B3C' }}>
                🛡 {excludedByRedTeam} unsupported claim{excludedByRedTeam !== 1 ? 's' : ''} held back by the red-team — this report only carries grounded findings.
              </p>
            )}
            <p className="mt-1 text-[12px]" style={{ color: '#6A5F74' }}>
              Building a <b>{preset === 'fact' ? 'fact sheet' : 'report'}</b> for {audience === 'community' ? 'a community audience' : 'a developer audience'} — switch either at the top of the page. Then work down: header, your case, what to include, summary, export.
            </p>

            <p className="mt-4 mb-0.5 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: '#9A8FA6' }}>① Header</p>
            <div className="mt-4 space-y-2.5">
              <Field label="Title" value={title} onChange={setTitle} />
              <Field label="Subtitle" value={subtitle} onChange={setSubtitle} />
              <Field label="Prepared by" value={preparedBy} onChange={setPreparedBy} placeholder="Your name / org" />
              <Field label="Date" value={dateStr} onChange={setDateStr} />
            </div>

            {has.survey && surveyFindings.surveys.length > 1 && (
              <>
                <p className="mt-3 mb-1 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: '#9A8FA6' }}>Survey to feature</p>
                <select
                  value={surveyPick}
                  onChange={(e) => setSurveyPick(e.target.value)}
                  className="w-full rounded-md border px-2 py-1.5 text-[12.5px]"
                  style={{ borderColor: RULE, color: PLUM }}
                >
                  {surveyFindings.surveys.map((sv) => (
                    <option key={sv.surveyId} value={sv.surveyId}>{sv.title} ({sv.n})</option>
                  ))}
                </select>
              </>
            )}

            <p className="mt-3 mb-1 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: '#9A8FA6' }}>② The case you&rsquo;re making</p>
            <textarea value={caseText} onChange={(e) => setCaseText(e.target.value)} rows={3} placeholder="What are you arguing for? e.g. Approve only with a bonded decommissioning guarantee and farmland protection." className="w-full resize-y rounded-lg border p-2 text-[12.5px] outline-none" style={{ borderColor: RULE, color: PLUM }} />
            <p className="mt-1 text-[11px]" style={{ color: '#9A8FA6' }}>Prints on the brief word-for-word as your headline ask &mdash; and Pythia can tune which sections show around it.</p>
            <button type="button" onClick={tuneFromPurpose} disabled={tuning || !caseText.trim()} className="mt-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-50" style={{ background: '#6A0FC2' }}>{tuning ? 'Tuning…' : 'Tune sections to this'}</button>
            {tuneNote && <p className="mt-1 text-[11.5px]" style={{ color: '#2F6B3C' }}>{tuneNote}</p>}

            {preset === 'report' && (
              <div className="mt-3 rounded-lg border border-dashed p-3" style={{ borderColor: '#E2D6F0', background: '#FBF8F2' }}>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: '#9A8FA6' }}>Report length</p>
                <Seg options={[['skimmable', 'Skimmable'], ['balanced', 'Balanced'], ['detailed', 'Detailed']]} value={density} onChange={(v) => setDensity(v as 'skimmable' | 'balanced' | 'detailed')} />
                <button type="button" onClick={writeNarrative} disabled={narrating} className="mt-2 w-full rounded-md px-3 py-2 text-[12.5px] font-semibold text-white disabled:opacity-50" style={{ background: GRAD }}>{narrating ? 'Writing the narrative…' : narrative ? '↻ Rewrite the narrative' : '✍ Write the narrative'}</button>
                <p className="mt-1 text-[11px]" style={{ color: '#9A8FA6' }}>Writes a synthesis + prose for each section from your data, angled to the audience &amp; the case above. Don&rsquo;t like it? Edit the case and rewrite. Cached.</p>
                {narrative && <p className="mt-1 text-[11px]" style={{ color: '#2F6B3C' }}>Narrative written &amp; showing in the preview.</p>}
                {narrErr && <p className="mt-1 text-[11px]" style={{ color: '#B23A2E' }}>{narrErr}</p>}
              </div>
            )}

            <p className="mt-3 mb-1 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: '#9A8FA6' }}>Call to action</p>
            <input value={cta} onChange={(e) => setCta(e.target.value)} placeholder="e.g. Sign the petition · Come to the July 12 hearing" className="w-full rounded-lg border p-2 text-[12.5px] outline-none" style={{ borderColor: RULE, color: PLUM }} />
            {cta.trim() && <div className="mt-1.5"><Seg options={[['top', 'Top'], ['bottom', 'Bottom'], ['both', 'Both']]} value={ctaPos} onChange={(v) => setCtaPos(v as 'top' | 'bottom' | 'both')} /></div>}



            <p className="mt-4 mb-0.5 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: '#9A8FA6' }}>③ Sections · drag to reorder</p>
            <p className="mb-1.5 text-[11px]" style={{ color: '#B9A9CE' }}>Which blocks appear{preset === 'fact' ? ' on the sheet' : ' in the report'}, and in what order.</p>
            <ul className="space-y-1">
              {visibleOrder.map((id, i) => (
                <Fragment key={id}>
                  <li
                    draggable
                    onDragStart={() => setDragId(id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => drop(id)}
                    onDragEnd={() => setDragId(null)}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5"
                    style={{ background: dragId === id ? '#F1EAF6' : id === 'projectfacts' ? '#F1EAF6' : '#FBF7F0', cursor: 'grab' }}
                  >
                    <span className="select-none text-[13px]" style={{ color: '#B9A9CE' }} aria-hidden>⠿</span>
                    {id === 'projectfacts' ? (
                      <button type="button" onClick={() => setFactsOpen((v) => !v)} className="text-[11px]" style={{ color: '#6A0FC2', width: 12 }} aria-label={factsOpen ? 'Collapse facts' : 'Expand facts'}>{factsOpen ? '▾' : '▸'}</button>
                    ) : null}
                    <input type="checkbox" checked={!!enabled[id]} onChange={(e) => setEnabled((m) => ({ ...m, [id]: e.target.checked }))} className="h-3.5 w-3.5" />
                    <span className="flex-1 text-[12.5px]" style={{ color: enabled[id] ? PLUM : '#B9A9CE', fontWeight: id === 'projectfacts' ? 600 : 400 }}>{labelOf(id)}</span>
                    <button type="button" onClick={() => move(id, -1)} disabled={i === 0} className="px-1 text-[13px] disabled:opacity-30" style={{ color: '#6A0FC2' }} aria-label="Move up">↑</button>
                    <button type="button" onClick={() => move(id, 1)} disabled={i === visibleOrder.length - 1} className="px-1 text-[13px] disabled:opacity-30" style={{ color: '#6A0FC2' }} aria-label="Move down">↓</button>
                  </li>
                  {id === 'projectfacts' && factsOpen && projectCard && (
                    <li className="ml-6 rounded-md px-2 py-2" style={{ borderLeft: '2px solid #EDE4F5', background: '#FCFAFE' }}>
                      <p className="mb-1 text-[10.5px]" style={{ color: '#B9A9CE' }}>Which facts appear in the box, and in what order.</p>
                      <div className="flex flex-col gap-1">
                        {factOrder.map((k, fi) => (
                          <div key={k} className="flex items-center gap-2 text-[12px]" style={{ color: '#6A5F74' }}>
                            <input type="checkbox" checked={!!factFields[k]} onChange={(e) => setFactFields((m) => ({ ...m, [k]: e.target.checked }))} />
                            <span className="flex-1">{FACT_LABEL[k]}</span>
                            <button type="button" onClick={() => moveFact(k, -1)} disabled={fi === 0} className="px-1 disabled:opacity-30" style={{ color: '#6A0FC2' }} aria-label="Move up">↑</button>
                            <button type="button" onClick={() => moveFact(k, 1)} disabled={fi === factOrder.length - 1} className="px-1 disabled:opacity-30" style={{ color: '#6A0FC2' }} aria-label="Move down">↓</button>
                          </div>
                        ))}
                        {(['benefits', 'commitments'] as const).map((k) => (
                          <label key={k} className="flex items-center gap-2 text-[12px]" style={{ color: '#6A5F74' }}>
                            <input type="checkbox" checked={!!factFields[k]} onChange={(e) => setFactFields((m) => ({ ...m, [k]: e.target.checked }))} /> {k === 'benefits' ? 'Benefits' : 'Commitments'}
                          </label>
                        ))}
                      </div>
                    </li>
                  )}
                </Fragment>
              ))}
            </ul>
            {enabled.summary && (
              <div className="mt-3">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: '#9A8FA6' }}>④ Summary text</p>
                <textarea value={summaryText} onChange={(e) => setSummaryText(e.target.value)} rows={5} placeholder="Write the framing / headline — or draft it from the page and edit here." className="w-full resize-y rounded-lg border p-2 text-[12.5px] outline-none" style={{ borderColor: RULE, color: PLUM }} />
                <button type="button" onClick={draftSummary} disabled={summarizing} className="mt-1 rounded-md px-3 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-50" style={{ background: '#6A0FC2' }}>{summarizing ? 'Drafting…' : summaryText.trim() ? '↻ Redraft from the page' : '✨ Draft from the page'}</button>
                <p className="mt-1 text-[11px]" style={{ color: '#9A8FA6' }}>Generates a summary from your enabled sections &amp; case — then edit it right here.</p>
                {summErr && <p className="mt-1 text-[11px]" style={{ color: '#B23A2E' }}>{summErr}</p>}
              </div>
            )}
            <p className="mt-4 mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: '#9A8FA6' }}>Add your own</p>
            <AddYourOwn onAdd={(bl) => setCustomBlocks((cb) => [...cb, bl])} />
            {customBlocks.length > 0 && (
              <ul className="mb-2 space-y-1">
                {customBlocks.map((bl) => (
                  <li key={bl.id} className="flex items-center gap-2 rounded-md px-2 py-1 text-[12px]" style={{ background: '#F7F4FB', color: PLUM }}>
                    <span className="min-w-0 flex-1 truncate">{bl.title}</span>
                    <button type="button" onClick={() => setCustomBlocks((cb) => cb.filter((x) => x.id !== bl.id))} className="flex-none text-[11px]" style={{ color: '#B23A2E' }}>remove</button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 mb-1 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: '#9A8FA6' }}>⑤ Export</p>
            <div className="mb-2 flex gap-4 text-[12.5px]" style={{ color: '#6A5F74' }}>
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={fmtWeb} onChange={(e) => setFmtWeb(e.target.checked)} /> Web link</label>
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={fmtPdf} onChange={(e) => setFmtPdf(e.target.checked)} /> Printable PDF</label>
            </div>
            <button type="button" onClick={() => window.print()} className="mt-1 w-full rounded-lg px-3 py-2 text-sm font-semibold text-white" style={{ background: PLUM }}>Download PDF ↓</button>
            <p className="mt-1.5 text-[11px]" style={{ color: '#9A8FA6' }}>Opens your browser’s print dialog — choose “Save as PDF”.</p>
            <button type="button" onClick={downloadDocx} className="mt-2 w-full rounded-lg border px-3 py-2 text-sm font-semibold" style={{ borderColor: RULE, color: PLUM }}>Download .docx (editable) ↓</button>
            <p className="mt-1 text-[11px]" style={{ color: '#9A8FA6' }}>A Word document of the text — edit it anywhere. Charts stay in the PDF/web versions.</p>
            <a href="/operator/onboarding" target="_blank" rel="noopener noreferrer" className="mt-3 block w-full rounded-lg border px-3 py-2 text-center text-[12.5px] font-medium hover:bg-brand-light" style={{ borderColor: RULE, color: '#6A0FC2' }}>
              Edit organization info ↗
            </a>
            <p className="mt-1 text-[11px]" style={{ color: '#9A8FA6' }}>Your org name, logo &amp; contact on the brief — opens in a new tab.</p>
          </div>
        </aside>

        {/* Report */}
        <div ref={previewRef} className="report-preview min-w-0 rounded-xl border bg-white p-8" style={{ borderColor: RULE, boxShadow: '0 6px 22px rgba(59,42,78,.07)' }}>
          {preset === 'report' && <p className="no-print mb-2 text-[10.5px]" style={{ color: '#9A8FA6' }}>Blocks that would straddle a US-Letter page break are pushed to the next page here, so the gaps show where pages split — matching how the PDF avoids splitting a card or paragraph. Use density &amp; section toggles to control length.</p>}
          <div className="report-section" style={{ borderBottom: '2px solid #1F1330', paddingBottom: 14 }}>
            <div style={{ height: 6, borderRadius: 3, background: GRAD, marginBottom: 14 }} />
            <div className="flex items-center gap-2">
              {orgProfile?.logoDataUrl ? (
                <img src={orgProfile.logoDataUrl} alt="" style={{ height: 30, maxWidth: 160, objectFit: 'contain' }} />
              ) : (
                <span className="font-serif text-[22px] font-semibold" style={{ color: PLUM }}>{orgProfile?.name || 'Pythia'}</span>
              )}
              {orgProfile?.logoDataUrl && orgProfile?.name && (
                <span className="font-serif text-[16px] font-semibold" style={{ color: PLUM }}>{orgProfile.name}</span>
              )}
            </div>
            <h1 className="mt-3 font-serif text-[26px] font-semibold leading-tight" style={{ color: PLUM }}>{title}</h1>
            {subtitle && <p className="mt-1 text-[14px]" style={{ color: '#6A5F74' }}>{subtitle}</p>}
            <p className="mt-2 text-[12px]" style={{ color: '#9A8FA6' }}>{dateStr}{preparedBy ? ` · Prepared by ${preparedBy}` : ''}</p>
            {caseText.trim() && (
              <p className="mt-3 rounded-md px-3 py-2 text-[13.5px] font-medium" style={{ background: '#F7F4FB', color: PLUM, borderLeft: '3px solid #6A0FC2' }}>{caseText}</p>
            )}
            {cta.trim() && (ctaPos === 'top' || ctaPos === 'both') && (
              <div className="mt-3 rounded-lg px-4 py-2.5 text-center text-[14px] font-semibold text-white" style={{ background: GRAD }}>{cta}</div>
            )}
          </div>

          {preset === 'fact' ? (
            <>
              {order.filter((id) => enabled[id] && has[id]).map((id) => {
                let body: React.ReactNode = null;
                switch (id) {
                  case 'summary':
                    body = summaryText.trim() ? (<Block title="Summary & context"><p className="whitespace-pre-wrap text-[13px] leading-relaxed" style={{ color: '#2E2438' }}>{summaryText}</p></Block>) : null;
                    break;
                  case 'projectfacts':
                    body = projectCard && (factFields.whatItIs || factFields.where || factFields.size || factFields.developer || factFields.process || factFields.status || factFields.benefits || factFields.commitments) ? (
                      <Block title="Project facts">
                        <dl className="grid gap-y-1.5" style={{ gridTemplateColumns: 'auto 1fr', columnGap: 14 }}>
                          {factOrder.filter((k) => factFields[k] && FACT_LABEL[k]).map((k) => (
                            <Fragment key={k}>
                              <dt style={{ color: '#9A8FA6', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', paddingTop: 2 }}>{FACT_LABEL[k]}</dt>
                              <dd className="text-[12.5px]" style={{ color: '#2E2438' }}>{factValue(projectCard, k)}</dd>
                            </Fragment>
                          ))}
                        </dl>
                        {factFields.benefits && projectCard.benefits.length > 0 && (
                          <div className="mt-3">
                            <p className="text-[11px] font-bold uppercase tracking-[0.06em]" style={{ color: '#6A5F74' }}>Benefits</p>
                            <div className="mt-1 flex flex-wrap gap-2">{projectCard.benefits.map((b, bi) => <span key={bi} className="rounded-full px-2.5 py-1 text-[11.5px]" style={{ background: '#EAF3EC', color: '#2F6B3C' }}>{b}</span>)}</div>
                          </div>
                        )}
                        {factFields.commitments && projectCard.commitments.length > 0 && (
                          <div className="mt-3">
                            <p className="text-[11px] font-bold uppercase tracking-[0.06em]" style={{ color: '#6A5F74' }}>Commitments</p>
                            <div className="mt-1 flex flex-wrap gap-2">{projectCard.commitments.map((c, ci) => <span key={ci} className="rounded-full px-2.5 py-1 text-[11.5px]" style={{ background: '#EDE6F6', color: '#5b3f86' }}>{c}</span>)}</div>
                          </div>
                        )}
                      </Block>
                    ) : null;
                    break;
                  case 'overview':
                    body = (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <StatTile n={String(data.score)} unit="/100" k={data.band.label} />
                        <StatTile n={String(data.total)} k="signals · 3 sources" />
                        {questions.generated && <StatTile n={String(questions.questions.length)} k="top questions" />}
                        {clusters.generated && <StatTile n={String(clusters.consensus.length)} unit={` vs ${clusters.divides.length}`} k="agreements vs tensions" />}
                      </div>
                    );
                    break;
                  case 'questions':
                    body = questions.generated && questions.questions.length > 0 ? (
                      <Block title="Top questions people keep asking">
                        <ol className="list-decimal space-y-1 pl-5 text-[13px]" style={{ color: '#2E2438' }}>
                          {questions.questions.slice(0, density === 'skimmable' ? 3 : density === 'balanced' ? 5 : 8).map((q, qi) => <li key={qi}>{q.question}</li>)}
                        </ol>
                      </Block>
                    ) : null;
                    break;
                  case 'clusters':
                    body = clusters.generated && clusters.consensus.length > 0 ? (
                      <Block title="Where there is common ground">
                        <ul className="list-disc space-y-1 pl-5 text-[13px]" style={{ color: '#2E2438' }}>
                          {clusters.consensus.slice(0, density === 'skimmable' ? 3 : density === 'balanced' ? 5 : 8).map((c, ci) => <li key={ci}>{c.statement}</li>)}
                        </ul>
                      </Block>
                    ) : null;
                    break;
                  case 'survey':
                    body = pickedFinding ? (<Block title="What Pythia’s survey found"><SurveyFindings finding={pickedFinding} density={density} /></Block>) : null;
                    break;
                  case 'stateofplay':
                    body = (<Block title="State of play"><StateOfPlay campaignId={data.campaignId} baselineCommitments={projectCard?.commitments ?? []} baselineSource={projectCard ? `${projectCard.process} — full conditions in the siting record.` : ''} density={density} onSources={setSopSources} onState={setSopState} /></Block>);
                    break;
                  case 'sources':
                    body = data.sources.length > 0 ? (
                      <Block title="Signal by source">
                        <div className="grid grid-cols-3 gap-3">
                          {SOURCES.map((src) => {
                            const so = data.sources.find((x) => x.source === src);
                            return (
                              <div key={src} className="rounded-lg border p-3" style={{ borderColor: RULE }}>
                                <p className="text-[10px] font-bold uppercase tracking-[0.06em]" style={{ color: '#6A5F74' }}>{SOURCE_LABEL[src]}</p>
                                <p className="mt-1 font-serif text-[26px] font-semibold" style={{ color: PLUM }}>{so?.count ?? 0}</p>
                                <p className="text-[11px]" style={{ color: '#9A8FA6' }}>signals{so ? ` · ${so.score}/100` : ''}</p>
                              </div>
                            );
                          })}
                        </div>
                      </Block>
                    ) : null;
                    break;
                  case 'sentiment':
                    body = data.total > 0 ? (
                      <Block title="Where sentiment sits">
                        <div className="space-y-1.5">
                          {STANCE.map((st) => {
                            const cnt = data.stance[st.key as keyof typeof data.stance] ?? 0;
                            const pct = data.total > 0 ? Math.round((cnt / data.total) * 100) : 0;
                            return (
                              <div key={st.key} className="flex items-center gap-3">
                                <span className="flex-none text-[12px]" style={{ width: 78, color: '#6A5F74' }}>{st.label}</span>
                                <div className="h-3 flex-1 overflow-hidden rounded-full" style={{ background: '#F1EAE0' }}><div className="h-full rounded-full" style={{ width: `${pct}%`, background: st.color }} /></div>
                                <span className="flex-none text-right text-[12px] tabular-nums" style={{ width: 44, color: '#6A5F74' }}>{pct}%</span>
                              </div>
                            );
                          })}
                        </div>
                      </Block>
                    ) : null;
                    break;
                  case 'trend':
                    body = (() => {
                      const tp = data.trend.filter((t) => typeof t.score === 'number');
                      if (tp.length < 2) return null;
                      const first = tp[0].score as number; const last = tp[tp.length - 1].score as number;
                      const up = last > first;
                      return (
                        <Block title="Sentiment trend">
                          <div className="flex items-baseline gap-2">
                            <span className="font-serif text-[22px] font-semibold" style={{ color: PLUM }}>{first}</span>
                            <span style={{ color: '#9A8FA6' }}>→</span>
                            <span className="font-serif text-[22px] font-semibold" style={{ color: up ? '#2F6B3C' : '#B23A2E' }}>{last}</span>
                            <span className="text-[12.5px]" style={{ color: '#6A5F74' }}>/100 over {tp.length} months — {up ? 'warming' : last < first ? 'cooling' : 'flat'}.</span>
                          </div>
                        </Block>
                      );
                    })();
                    break;
                  case 'meta':
                    body = (meta.agreements.length + meta.tensions.length > 0) ? (
                      <Block title="Agreement & tension">
                        {meta.agreements.length > 0 && (
                          <div className="mb-2">
                            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em]" style={{ color: '#4F8A5C' }}>Shared ground</p>
                            <div className="flex flex-wrap gap-2">{meta.agreements.slice(0, 3).map((a, ai) => <span key={ai} className="rounded-full px-2.5 py-1 text-[11.5px]" style={{ background: '#EAF3EC', color: '#2F6B3C' }}>{a.title}</span>)}</div>
                          </div>
                        )}
                        {meta.tensions.length > 0 && (
                          <div>
                            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em]" style={{ color: '#C77D2A' }}>Tensions</p>
                            <div className="flex flex-wrap gap-2">{meta.tensions.slice(0, 3).map((t, ti) => <span key={ti} className="rounded-full px-2.5 py-1 text-[11.5px]" style={{ background: '#FAF0E2', color: '#B26A1E' }}>{t.title}</span>)}</div>
                          </div>
                        )}
                      </Block>
                    ) : null;
                    break;
                  case 'coalition':
                    body = coalition.members.length > 0 ? (
                      <Block title="Who's shaping this">
                        <div className="flex flex-wrap gap-2">{coalition.members.slice(0, 6).map((m, mi) => <span key={mi} className="rounded-full border px-2.5 py-1 text-[11.5px]" style={{ borderColor: RULE, color: PLUM }}>{m.name}<span style={{ color: '#9A8FA6' }}> · {m.role}</span></span>)}</div>
                      </Block>
                    ) : null;
                    break;
                  case 'missingVoices':
                    body = representation.missing.length > 0 ? (
                      <Block title="Whose voice is thin">
                        <div className="flex flex-wrap gap-2">{representation.missing.slice(0, 5).map((mv, mi) => <span key={mi} className="rounded-full px-2.5 py-1 text-[11.5px]" style={{ background: '#EDE6F6', color: '#5b3f86' }}>{mv.who}</span>)}</div>
                      </Block>
                    ) : null;
                    break;
                  case 'origination':
                    body = data.places.length > 0 ? (<Block title="Signal by place"><OriginationMap places={data.places} campaignId={data.campaignId} /></Block>) : null;
                    break;
                  case 'heatmap':
                    body = data.heatmap.length > 0 ? (<Block title="Signal across issues & sources"><HeatMapCard rows={data.heatmap} /></Block>) : null;
                    break;
                  default:
                    body = null;
                }
                return body ? <section key={id} className="report-section mt-6">{body}</section> : null;
              })}
            </>
          ) : (
            order.filter((id) => enabled[id] && has[id]).map((id) => (
            <section key={id} className="report-section mt-7">
              {narrative && narrative[id] && ['meta', 'questions', 'coalition', 'missingVoices'].includes(id) && SECTION_HEADING[id] && (
                <h3 className="mb-1.5 font-serif text-[17px] font-semibold" style={{ color: PLUM }}>{SECTION_HEADING[id]}</h3>
              )}
              {narrative && narrative[id]?.synthesis
                ? <p className="mb-2 text-[13.5px] font-medium leading-snug" style={{ color: PLUM }}>{narrative[id].synthesis}</p>
                : REPORT_PREAMBLE[id] ? <p className="mb-1.5 text-[12.5px]" style={{ color: '#6A5F74', fontStyle: 'italic' }}>{REPORT_PREAMBLE[id]}</p> : null}
              {narrative && narrative[id] && (narrative[id].paragraphs.length > 0 || narrative[id].bullets.length > 0) && (
                <div className="mb-3">
                  {narrative[id].paragraphs.map((p, i) => (<p key={i} className="mt-2 text-[13px] leading-relaxed" style={{ color: '#2E2438' }}>{p}</p>))}
                  {narrative[id].bullets.length > 0 && (<ul className="mt-2 list-disc space-y-0.5 pl-5 text-[12.5px]" style={{ color: '#2E2438' }}>{narrative[id].bullets.map((bl, i) => (<li key={i}>{bl}</li>))}</ul>)}
                </div>
              )}
              {id === 'summary' && summaryText.trim() && (
                <Block title="Summary & context"><p className="whitespace-pre-wrap text-[13.5px] leading-relaxed" style={{ color: '#2E2438' }}>{summaryText}</p></Block>
              )}
              {id === 'projectfacts' && projectCard && (
                <Block title="Project facts">
                  <dl className="grid gap-y-1.5" style={{ gridTemplateColumns: 'auto 1fr', columnGap: 14 }}>
                    {factOrder.filter((k) => factFields[k] && FACT_LABEL[k]).map((k) => (
                      <Fragment key={k}>
                        <dt style={{ color: '#9A8FA6', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', paddingTop: 2 }}>{FACT_LABEL[k]}</dt>
                        <dd className="text-[12.5px]" style={{ color: '#2E2438' }}>{factValue(projectCard, k)}</dd>
                      </Fragment>
                    ))}
                  </dl>
                  {factFields.benefits && projectCard.benefits.length > 0 && (
                    <div className="mt-3"><p className="text-[11px] font-bold uppercase tracking-[0.06em]" style={{ color: '#6A5F74' }}>Benefits</p><div className="mt-1 flex flex-wrap gap-2">{projectCard.benefits.map((b, bi) => <span key={bi} className="rounded-full px-2.5 py-1 text-[11.5px]" style={{ background: '#EAF3EC', color: '#2F6B3C' }}>{b}</span>)}</div></div>
                  )}
                  {factFields.commitments && projectCard.commitments.length > 0 && (
                    <div className="mt-3"><p className="text-[11px] font-bold uppercase tracking-[0.06em]" style={{ color: '#6A5F74' }}>Commitments</p><div className="mt-1 flex flex-wrap gap-2">{projectCard.commitments.map((c, ci) => <span key={ci} className="rounded-full px-2.5 py-1 text-[11.5px]" style={{ background: '#EDE6F6', color: '#5b3f86' }}>{c}</span>)}</div></div>
                  )}
                </Block>
              )}
              {id === 'overview' && (
                <Block title="Community sentiment score">
                  <div className="flex items-baseline gap-3">
                    <span className="font-serif text-[40px] font-semibold leading-none" style={{ color: PLUM }}>{data.score}</span>
                    <span className="text-[14px]" style={{ color: '#6A5F74' }}>/ 100 &middot; {data.band.label}</span>
                  </div>
                  <p className="mt-2 text-[13px]" style={{ color: '#6A5F74' }}>Built from {data.total} signal{data.total === 1 ? '' : 's'} across your sources &mdash; never blended into one number.</p>
                </Block>
              )}
              {id === 'sentiment' && (
                <Block title="Sentiment breakdown">
                  <div className="space-y-1.5">
                    {STANCE.map((st) => {
                      const cnt = data.stance[st.key as keyof typeof data.stance] ?? 0;
                      const pct = data.total > 0 ? Math.round((cnt / data.total) * 100) : 0;
                      return (
                        <div key={st.key} className="flex items-center gap-3">
                          <span className="flex-none text-[12px]" style={{ width: 78, color: '#6A5F74' }}>{st.label}</span>
                          <div className="h-3 flex-1 overflow-hidden rounded-full" style={{ background: '#F1EAE0' }}><div className="h-full rounded-full" style={{ width: `${pct}%`, background: st.color }} /></div>
                          <span className="flex-none text-right text-[12px] tabular-nums" style={{ width: 58, color: '#6A5F74' }}>{cnt} &middot; {pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </Block>
              )}
              {id === 'trend' && <Block title="How sentiment moved over time"><TrendCard trend={data.trend} stance={data.stance} total={data.total} /></Block>}
              {id === 'sources' && (
                <Block title="The three signal sources">
                  <div className="grid grid-cols-3 gap-3">
                    {SOURCES.map((src) => {
                      const so = data.sources.find((x) => x.source === src);
                      return (
                        <div key={src} className="rounded-lg border p-3" style={{ borderColor: RULE }}>
                          <p className="text-[11px] font-bold uppercase tracking-[0.06em]" style={{ color: '#6A5F74' }}>{SOURCE_LABEL[src]}</p>
                          <p className="mt-1 font-serif text-[24px] font-semibold" style={{ color: PLUM }}>{so?.count ?? 0}</p>
                          <p className="text-[11px]" style={{ color: '#9A8FA6' }}>signals{so ? ` · ${so.score}/100` : ''}</p>
                        </div>
                      );
                    })}
                  </div>
                </Block>
              )}
              {id === 'meta' && !narrative?.[id] && (
                <Block title="Meta-synthesis across all sources">
                  {meta.agreements.length + meta.tensions.length + meta.missingVoices.length > 0 ? (
                    <div className="space-y-3">
                      <MetaCol label="Shared agreement" items={meta.agreements} color="#4F8A5C" />
                      <MetaCol label="Tensions" items={meta.tensions} color="#C77D2A" />
                      <MetaCol label="Whose voice is under-represented" items={meta.missingVoices} color="#6A0FC2" />
                    </div>
                  ) : (
                    <p className="text-[12px]" style={{ color: '#9A8FA6' }}>No cross-source synthesis available for this run.</p>
                  )}
                </Block>
              )}
              {id === 'clusters' && <Block title="Opinion clusters & common ground"><OpinionClusters data={clusters} visualOnly={!!narrative?.[id]} /></Block>}
              {id === 'questions' && !narrative?.[id] && <Block title="Questions people keep asking"><TopQuestions data={questions} density={density} /></Block>}
              {id === 'survey' && pickedFinding && <Block title="What Pythia’s survey found"><SurveyFindings finding={pickedFinding} density={density} /></Block>}
              {id === 'stateofplay' && <Block title="State of play"><StateOfPlay campaignId={data.campaignId} baselineCommitments={projectCard?.commitments ?? []} baselineSource={projectCard ? `${projectCard.process} \u2014 full conditions in the siting record.` : ''} density={density} onSources={setSopSources} onState={setSopState} /></Block>}
              {id === 'heatmap' && <Block title="Signal across issues & sources"><HeatMapCard rows={data.heatmap} /></Block>}
              {id === 'coalition' && !narrative?.[id] && <Block title="Coalition & community influencers"><CoalitionTable data={coalition} density={density} /></Block>}
              {id === 'origination' && <Block title="Signal by place"><OriginationMap places={data.places} campaignId={data.campaignId} /></Block>}
              {id === 'missingVoices' && !narrative?.[id] && <Block title="Representation — who's in, who's missing"><RepresentationPanel data={representation} density={density} /></Block>}
            </section>
            ))
          )}

          {cta.trim() && (ctaPos === 'bottom' || ctaPos === 'both') && (
            <section className="report-section mt-7">
              <div className="rounded-lg px-4 py-3 text-center text-[14px] font-semibold text-white" style={{ background: GRAD }}>{cta}</div>
            </section>
          )}
          {customBlocks.map((bl) => (
            <section key={bl.id} className="report-section mt-7">
              <Block title={bl.title}><div className="whitespace-pre-wrap text-[13px] leading-relaxed" style={{ color: '#2E2438' }}>{bl.body}</div></Block>
            </section>
          ))}

          <section className="report-section mt-8">
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.06em]" style={{ color: '#9A8FA6' }}>Sources &amp; method</p>
            <p className="text-[11px] leading-relaxed" style={{ color: '#6A5F74' }}>
              Community figures are drawn from {data.total} signal{data.total === 1 ? '' : 's'} across the civic record, internal docs, and survey responses &mdash; kept separate, never blended into one number.{excludedByRedTeam > 0 ? ` ${excludedByRedTeam} AI-written claim${excludedByRedTeam === 1 ? '' : 's'} an automated red-team could not ground in the signals ${excludedByRedTeam === 1 ? 'was' : 'were'} withheld.` : ' Every AI-written claim was re-checked against the source signals.'}
            </p>
            {[
              { label: 'Coalition & community signal', items: citedRefs.map((sg) => ({ label: (sg.title as string) || (sg.url as string), url: sg.url as string })) },
              { label: 'State of play (live web)', items: sopSources },
              { label: 'Representation baseline', items: demo?.source ? [{ label: demo.source.label, url: demo.source.url }] : [] },
              { label: 'Project facts & permitting', items: projectCard?.process ? [{ label: projectCard.process, url: '' }] : [] },
            ].filter((g) => g.items.length > 0).map((g) => (
              <div key={g.label} className="mt-2">
                <p className="text-[11px] font-semibold" style={{ color: '#6A5F74' }}>{g.label}</p>
                <ol className="list-decimal space-y-0.5 pl-4 text-[11px]" style={{ color: '#6A5F74' }}>
                  {g.items.map((it, i) => (
                    <li key={i}>
                      {it.url ? (
                        <a href={it.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2" style={{ color: '#6A0FC2' }}>{it.label}</a>
                      ) : it.label}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </section>

          <div className="report-section mt-8 pt-3" style={{ borderTop: '1px solid #E7DCD0' }}>
            {(orgProfile?.name || orgProfile?.website || orgProfile?.email) && (
              <div className="rounded-lg px-3 py-2.5 text-[12px]" style={{ background: '#FBF7F0', color: '#6A5F74' }}>
                {orgProfile?.name && <span className="font-semibold" style={{ color: PLUM }}>{orgProfile.name}</span>}
                {orgProfile?.website && <span> &middot; {orgProfile.website}</span>}
                {orgProfile?.email && <span> &middot; {orgProfile.email}</span>}
              </div>
            )}
            <div className="mt-2 flex items-center justify-between text-[11px]" style={{ color: '#9A8FA6' }}>
              <span>Made with Pythia &middot; thepythia.ai</span>
              <span>{dateStr}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrendMini({ trend }: { trend: TrendPoint[] }) {
  const pts = trend.filter((t) => typeof t.score === 'number');
  if (pts.length < 2) return <p className="text-[12px]" style={{ color: '#9A8FA6' }}>Not enough dated signal to chart a trend yet — set a demo date-spread or ingest dated messages.</p>;
  const W = 560, H = 120, pad = 22;
  const xs = (i: number) => pad + (i * (W - 2 * pad)) / (pts.length - 1);
  const ys = (v: number) => pad + (1 - v / 100) * (H - 2 * pad);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block w-full" style={{ maxHeight: 150 }}>
      {[0, 50, 100].map((v) => <line key={v} x1={pad} y1={ys(v)} x2={W - pad} y2={ys(v)} stroke={RULE} />)}
      <polyline points={pts.map((t, i) => `${xs(i)},${ys(t.score)}`).join(' ')} fill="none" stroke="#6A0FC2" strokeWidth={2} />
      {pts.map((t, i) => <circle key={i} cx={xs(i)} cy={ys(t.score)} r={2.5} fill="#6A0FC2" />)}
    </svg>
  );
}

function MetaCol({ label, items, color }: { label: string; items: { title: string; detail: string }[]; color: string }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="text-[12px] font-semibold" style={{ color }}>{label}</p>
      <ul className="mt-1 space-y-1 text-[12.5px]" style={{ color: '#2E2438' }}>
        {items.map((f, i) => (
          <li key={i}><span className="font-semibold">{f.title}.</span> <span style={{ color: '#6A5F74' }}>{f.detail}</span></li>
        ))}
      </ul>
    </div>
  );
}

const FACT_LABEL: Record<string, string> = {
  whatItIs: 'What it is', where: 'Location', size: 'Size', developer: 'Developer', process: 'Permitting', status: 'Status',
};
function factValue(pc: ProjectCard, k: string): string {
  const v = (pc as unknown as Record<string, unknown>)[k];
  return typeof v === 'string' ? v : '';
}

function AddYourOwn({ onAdd }: { onAdd: (b: { id: string; title: string; body: string }) => void }) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [instruction, setInstruction] = useState('');
  const [fileText, setFileText] = useState('');
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 1000000) { setErr('That file is over 1 MB — please use a smaller text file.'); return; }
    const reader = new FileReader();
    reader.onload = () => { setFileText(typeof reader.result === 'string' ? reader.result : ''); setFileName(f.name); setErr(null); };
    reader.readAsText(f);
  }

  async function add() {
    if (busy) return;
    if (!url.trim() && !fileText.trim()) { setErr('Paste a link or upload a text file first.'); return; }
    setBusy(true); setErr(null);
    try {
      const res = await fetch('/api/manage/brief-block', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: url.trim() || undefined, text: fileText.trim() || undefined, instruction: instruction.trim() }),
      });
      const d = await res.json();
      if (!res.ok) { setErr(d?.error ?? 'Could not pull that in.'); }
      else {
        onAdd({ id: 'c' + Math.random().toString(36).slice(2), title: title.trim() || 'Added information', body: (d.body ?? '').toString() });
        setTitle(''); setUrl(''); setInstruction(''); setFileText(''); setFileName('');
      }
    } catch { setErr('Network error.'); }
    finally { setBusy(false); }
  }

  const field = 'w-full rounded-lg border p-2 text-[12.5px] outline-none';
  return (
    <div className="mb-2 rounded-lg border p-2.5" style={{ borderColor: '#E7DCD0' }}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Section title (optional)" className={field} style={{ borderColor: '#E7DCD0', color: '#1F1330' }} />
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste a link…" className={`${field} mt-1.5`} style={{ borderColor: '#E7DCD0', color: '#1F1330' }} />
      <div className="mt-1.5 flex items-center gap-2">
        <input ref={fileRef} type="file" accept=".txt,.md,.csv,text/*" onChange={onFile} className="hidden" />
        <button type="button" onClick={() => fileRef.current?.click()} className="rounded-md border px-2.5 py-1 text-[12px]" style={{ borderColor: '#E7DCD0', color: '#6A0FC2' }}>Upload text file</button>
        {fileName && <span className="min-w-0 flex-1 truncate text-[11px]" style={{ color: '#6A5F74' }}>{fileName}</span>}
      </div>
      <textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} rows={2} placeholder="What should we pull from it? (e.g. the three main objections)" className={`${field} mt-1.5 resize-y`} style={{ borderColor: '#E7DCD0', color: '#1F1330' }} />
      <div className="mt-1.5 flex items-center gap-2">
        <button type="button" onClick={add} disabled={busy} className="rounded-md px-3 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-50" style={{ background: '#6A0FC2' }}>{busy ? 'Reading…' : 'Add to brief'}</button>
        {err && <span className="text-[11.5px]" style={{ color: '#B23A2E' }}>{err}</span>}
      </div>
    </div>
  );
}

function StatTile({ n, unit, k }: { n: string; unit?: string; k: string }) {
  return (
    <div className="rounded-xl border p-3.5" style={{ borderColor: '#E7DCD0', background: '#FBF7F0' }}>
      <div className="font-serif font-semibold leading-none" style={{ color: '#1F1330', fontSize: 30 }}>
        {n}
        {unit && <span style={{ fontSize: 14, color: '#6A5F74', fontWeight: 400 }}>{unit}</span>}
      </div>
      <div className="mt-1 text-[11px]" style={{ color: '#6A5F74' }}>{k}</div>
    </div>
  );
}

function Seg({ options, value, onChange }: { options: [string, string][]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex overflow-hidden rounded-lg border" style={{ borderColor: '#E7DCD0' }}>
      {options.map(([v, label], i) => (
        <button key={v} type="button" onClick={() => onChange(v)} className="flex-1 px-2 py-1.5 text-[12px] font-medium" style={{ borderLeft: i === 0 ? 'none' : '1px solid #E7DCD0', background: value === v ? '#6A0FC2' : '#fff', color: value === v ? '#fff' : '#6A5F74' }}>{label}</button>
      ))}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: '#9A8FA6' }}>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-0.5 w-full rounded-lg border px-2 py-1.5 text-[13px] outline-none" style={{ borderColor: RULE, color: PLUM }} />
    </label>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 font-serif text-[17px] font-semibold" style={{ color: PLUM }}>{title}</h2>
      {children}
    </div>
  );
}
