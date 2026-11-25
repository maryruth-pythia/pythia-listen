import Link from 'next/link';
import { computeDashboard, type DashboardData } from '@/lib/dashboard/aggregate';
import { canAccessCampaign } from '@/lib/scope';
import { type ClusterAnalysis } from '@/lib/analysis/clusters';
import type { ConcernView } from '@/lib/dashboard/concerns';
import { computeConcernsAI } from '@/lib/analysis/concerns-ai';
import { ConcernClusters, ConcernVenn } from '@/components/operator/ConcernsPanel';
import {
  computeTopQuestions,
  type QuestionAnalysis,
} from '@/lib/analysis/questions';
import {
  DEFAULT_CAMPAIGN_ID,
  FALLBACK_CAMPAIGN_ID,
  getCampaignById,
} from '@/lib/campaigns';
import CampaignPicker from '@/components/operator/CampaignPicker';
import CivicNewsPopup from '@/components/operator/CivicNewsPopup';
import TuneSection from '@/components/operator/TuneSection';
import AutoGloss from '@/components/operator/AutoGloss';
import SignalScout from '@/components/operator/SignalScout';
import MetaSynthesis from '@/components/operator/MetaSynthesis';
import TopQuestions from '@/components/operator/TopQuestions';
import PrecedentPanel from '@/components/operator/PrecedentPanel';
import StateOfPlay from '@/components/operator/StateOfPlay';
import { getProjectCard } from '@/lib/reference/content';
import OutliersPanel from '@/components/operator/OutliersPanel';
import { IslandView, IssuesView, VibrantIndicatorsView } from '@/components/operator/CommunityViewsPanel';
import { computeCommunityViews, type CommunityViews } from '@/lib/dashboard/community-views';
import { listSignals } from '@/lib/db';
import { WatchCoverage, WatchPipeline } from '@/components/operator/WatchPanel';
import { loadWatch } from '@/lib/watch/run';
import type { WatchState } from '@/lib/watch/types';
import RepresentationPanel from '@/components/operator/RepresentationPanel';
import RedTeam from '@/components/operator/RedTeam';
import InfoTip from '@/components/operator/InfoTip';
import DashTabs from '@/components/operator/DashTabs';
import {
  DashHero,
  LensPanel,
  LensStatusLine,
  TrendCard,
  HeatMapCard,
  SourceCards,
  IssueSpectrum,
  CompareCampaigns,
} from '@/components/operator/DashboardSections';
import OriginationMap from '@/components/operator/OriginationMap';
import CoalitionTable from '@/components/operator/CoalitionTable';
import ComparePicker from '@/components/operator/ComparePicker';
import { computeCoalition, type CoalitionAnalysis } from '@/lib/analysis/coalition';
import { computeOutliers, type OutlierAnalysis } from '@/lib/analysis/outliers';
import { computeRepresentation, type RepresentationAnalysis } from '@/lib/analysis/representation';

export const dynamic = 'force-dynamic';
/** Room for the signal lens to keep sorting in the background after the page is sent. */
export const maxDuration = 60;
export const metadata = { title: 'Signal Dashboard · Pythia' };

const GRAD = 'linear-gradient(90deg,#FCC029 0%,#EC2BFC 52%,#6A0FC2 100%)';
const CREAM = '#FFFFFF';

const EMPTY: DashboardData = {
  campaignId: DEFAULT_CAMPAIGN_ID,
  total: 0,
  score: 0,
  band: { key: 'opposition', label: 'Opposition' },
  stance: { opposition: 0, concern: 0, mixed: 0, support: 0, neutral: 0 },
  sources: [],
  themes: [],
  heatmap: [],
  actors: [],
  trend: [],
  spectrum: [],
  places: [],
  recent: [],
  updatedAt: new Date().toISOString(),
};

function DashSection({
  n,
  title,
  note,
  info,
  tuneCampaignId,
  headerAside,
  children,
}: {
  n: string;
  title: string;
  note: string;
  /** Origin + method explainer shown in the "i" hover tooltip next to the title. */
  info?: string;
  /** If set, show an inline "Tune this section" popover for operator-adjustable sections. */
  tuneCampaignId?: string;
  /** Optional node rendered at the top-right of the section header. */
  headerAside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3">
        <div className="flex items-center gap-3">
          <span
            className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[7px] font-serif text-[13px] font-semibold text-white"
            style={{ background: GRAD }}
          >
            {n}
          </span>
          <h2 className="flex items-center gap-1.5 font-serif text-xl font-semibold" style={{ color: '#1F1330' }}>
            {title}
            {info && <InfoTip text={info} />}
          </h2>
          {(tuneCampaignId || headerAside) && (
            <span className="ml-auto flex flex-none items-center gap-1.5">
              {headerAside}
              {tuneCampaignId && (
                <>
                  <TuneSection campaignId={tuneCampaignId} />
                  <InfoTip text="Adjust what this section pays attention to — its analysis focus and what to ignore — right here. Saving re-runs the analyses." />
                </>
              )}
            </span>
          )}
        </div>
        <p className="mt-1.5 max-w-2xl text-[13.5px]" style={{ color: '#6A5F74' }}><AutoGloss text={note} /></p>
      </div>
      {children}
    </section>
  );
}

export default async function DashboardPage(
  props: {
    searchParams?: Promise<{ campaign?: string; compare?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const requested = searchParams?.campaign;
  const campaign =
    (requested ? await getCampaignById(requested) : undefined) ??
    (await getCampaignById(DEFAULT_CAMPAIGN_ID))!;

  const projectCard = getProjectCard(campaign.id) ?? null;

  // Read-access guard: in accounts mode, deny a project the acting org doesn't
  // own (no-op in password mode — canAccessCampaign is always true there).
  const allowed = await canAccessCampaign(campaign.id);

  let data: DashboardData = { ...EMPTY, campaignId: campaign.id };
  try {
    if (allowed) data = await computeDashboard(campaign.id);
  } catch {
    data = { ...EMPTY, campaignId: campaign.id };
  }

  const emptyClusters: ClusterAnalysis = {
    campaignId: campaign.id, total: 0, analyzed: 0, camps: [], consensus: [], divides: [], updatedAt: new Date().toISOString(), generated: false,
  };
  const emptyQuestions: QuestionAnalysis = {
    campaignId: campaign.id, total: 0, analyzed: 0, questions: [], generated: false, updatedAt: new Date().toISOString(),
  };
  const emptyCoalition: CoalitionAnalysis = {
    campaignId: campaign.id, total: 0, members: [], generated: false, updatedAt: new Date().toISOString(),
  };
  const emptyOutliers: OutlierAnalysis = {
    campaignId: campaign.id, total: 0, considered: 0, items: [], generated: false, updatedAt: new Date().toISOString(),
  };
  const emptyRepresentation: RepresentationAnalysis = {
    campaignId: campaign.id, total: 0, analyzed: 0, segments: [], missing: [], pathsForward: [], generated: false, updatedAt: new Date().toISOString(),
  };

  // Comparison campaign — operator-chosen via ?compare, else a sensible default.
  const requestedCompare = searchParams?.compare;
  const defaultCompareId = campaign.id === FALLBACK_CAMPAIGN_ID ? DEFAULT_CAMPAIGN_ID : FALLBACK_CAMPAIGN_ID;
  const compareId =
    requestedCompare &&
    requestedCompare !== campaign.id &&
    (await getCampaignById(requestedCompare))
      ? requestedCompare
      : defaultCompareId;
  const compareCampaign = await getCampaignById(compareId);

  // General boards with community views (e.g. Hawaiʻi): what people raised by issue and
  // by island, plus Vibrant Hawaiʻi indicator ratings. Rule-based, no AI, so identical
  // for everyone who loads the board.
  const views = campaign.communityViews ?? [];
  // Public-record boards: no direct listening / internal docs / surveys, and no second
  // project of the client's to compare against.
  const pr = !!campaign.publicRecordOnly;
  const showCompare = campaign.kind === 'site' && !pr;
  // Early-warning boards: the pipeline of upcoming projects, read from public filings.
  const watchCfg = campaign.watch;
  const watchState: WatchState | null = allowed && watchCfg ? await loadWatch(campaign.id).catch(() => null) : null;
  const watchCounties = (watchCfg?.counties ?? []).map((c) => ({ name: c.name, label: c.label, agendaNote: c.agendaNote, tier: c.tier }));
  // A watch board with no signals yet shows only the watch (every other section would be empty).
  const watchOnly = !!watchCfg && data.total === 0;
  let community: CommunityViews | null = null;
  if (allowed && (views.includes('issues') || views.includes('islands'))) {
    community = await listSignals(campaign.id).then(computeCommunityViews).catch(() => null);
  }

  // Section 05: AI-grouped concern clusters + Venn (replaced the AI support-level camps 2026-11-23).
  // Falls back to the rule-based issue groups inside computeConcernsAI. Runs alongside the others below.
  const emptyConcerns: ConcernView = { total: 0, method: 'issue-groups', clusters: [], unmatched: 0, venns: [] };
  const concernsP: Promise<ConcernView> = allowed
    ? computeConcernsAI(campaign.id).catch(() => emptyConcerns)
    : Promise.resolve(emptyConcerns);

  const [clusters, questions, compareData, coalition, outliers, representation] = allowed
    ? await Promise.all([
        Promise.resolve(emptyClusters),
        computeTopQuestions(campaign.id).catch(() => emptyQuestions),
        showCompare ? computeDashboard(compareId).catch(() => null) : Promise.resolve(null),
        computeCoalition(campaign.id).catch(() => emptyCoalition),
        computeOutliers(campaign.id).catch(() => emptyOutliers),
        computeRepresentation(campaign.id).catch(() => emptyRepresentation),
      ])
    : [emptyClusters, emptyQuestions, null, emptyCoalition, emptyOutliers, emptyRepresentation];
  const concerns = await concernsP;

  return (
    <div className="-mx-6 -my-8 min-h-screen" style={{ background: '#F7F5FB' }}>
      {/* Gradient header */}
      <header className="pythia-reeded relative flex flex-col justify-center overflow-hidden text-white" style={{ minHeight: 252 }}>
        <img src="/pythia-mark-white.png" alt="" aria-hidden className="pointer-events-none absolute" style={{ right: -28, top: -24, width: 240, opacity: 0.13, zIndex: 1 }} />
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(26,8,38,.34) 0%, rgba(26,8,38,0) 60%)', zIndex: 5 }} />
        <div className="relative z-10 px-6 py-8">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative z-10 ml-auto flex items-center gap-2">
              <Link href={`/operator/watches/${campaign.id}/configure`} className="rounded-lg px-3 py-1.5 text-[13px] font-medium" style={{ background: 'rgba(255,255,255,.16)', color: '#fff' }}>
                Tune the model →
              </Link>
              <Link href="/operator/watches/new" className="rounded-lg px-3 py-1.5 text-[13px] font-semibold" style={{ background: CREAM, color: '#6A0FC2' }}>
                + New Project
              </Link>
            </div>
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,.85)' }}>Operator · Dashboard</div>
          <h1 className="mt-1 font-serif text-3xl font-semibold text-white" style={{ textShadow: '0 1px 12px rgba(50,6,60,.4)' }}>
            {campaign.kind === 'general' ? 'Community Signal' : 'Project Signal'}
          </h1>
          <div className="mt-3">
            <span className="text-[12px] uppercase tracking-[0.1em]" style={{ color: 'rgba(255,255,255,.8)' }}>Project</span>
            <div className="mt-2"><CampaignPicker basePath="/operator/dashboard" activeId={campaign.id} tone="light" /></div>
            {campaign.meta && <div className="mt-2 text-[12.5px]" style={{ color: 'rgba(255,255,255,.9)' }}>{campaign.meta}</div>}
          </div>
        </div>
      </header>

      {/* Body — concept order */}
      <div className="space-y-8 px-6 py-8">
        <CivicNewsPopup campaignId={data.campaignId} />
        {watchCfg && (
          <DashSection
            n="◎"
            title="What’s coming: projects in the pipeline"
            info="Energy projects moving toward approval in the watched counties, read daily from public filings. The map shades each county by how many projects were found; items that are the same project in two sources are linked (by name, or as likely when only the county and size match). Follow this project starts a public-record board for one project. Origin: PJM’s interconnection queue (grid requests), Virginia DEQ’s renewable energy permit spreadsheet and Town Hall notices (state filings), and county and town agenda PDFs (local meetings). Method: rule-based. Each source is filtered to the watched counties; agendas are scanned for words like solar, battery storage and siting agreement. Nothing is AI-written. Each item links to its source."
            note="The earliest public signs of a project, so you can reach a community before approvals are under way. New items and status changes go out in a weekly email."
          >
            <DashTabs
              defaultKey="pipeline"
              tabs={[
                { key: 'pipeline', label: 'Pipeline', hint: 'Every project the watch has found, by how far along it is. New and changed items come first.', node: <WatchPipeline state={watchState} counties={watchCounties} campaignId={campaign.id} /> },
                { key: 'coverage', label: 'Coverage by county', hint: 'What each source holds for each county, and where the watch can’t see (for example, counties that don’t post agendas online).', node: <WatchCoverage state={watchState} counties={watchCounties} campaignId={campaign.id} /> },
              ]}
            />
          </DashSection>
        )}
        {watchOnly ? (
          <div className="rounded-2xl p-5 text-[13px]" style={{ background: '#fff', border: '1px solid #E7DCD0', color: '#6A5F74' }}>
            This board watches for projects before they become public. The community-voice sections (sentiment, issues, who’s missing)
            appear once public-record items such as hearing comments or news are added for a project you decide to follow.
          </div>
        ) : (
        <>
        <DashHero data={data} />
        <LensStatusLine data={data} />
        <DashSection n="01" headerAside={<SignalScout campaignId={data.campaignId} compact />} title={data.trend.length >= 2 ? 'How sentiment moved over time' : 'Where sentiment stands now'} info="Community sentiment across the life of the project, one line per source. Origin: every dated signal — emails/messages, the civic record, desk research. Method: signals are grouped by month and scored 0–100 by stance; the three sources are shown separately, never averaged into one line." note={data.trend.length >= 2 ? 'Community sentiment across the life of this project — each source as its own line, never averaged into one.' : 'Not enough dated signal to chart a trend yet — this is a point-in-time snapshot. A line per source appears once signals span two or more dated months.'}>
          <TrendCard trend={data.trend} stance={data.stance} total={data.total} />
        </DashSection>

        <DashSection
          n="02"
          tuneCampaignId={campaign.id}
          title={pr ? 'What the public record shows' : 'Meta-synthesis across all sources'}
          info={pr
            ? 'Common ground in the record, where it is contested, and which community members are missing from it. Origin: the public record only (filings, hearings, written comments, organisation letters, news). Method: an AI pass reads the record and cites the signals behind each finding; each finding shows how many distinct sources it rests on.'
            : 'Where the public civic record and direct listening agree, where they diverge, and whose voice is missing. Origin: civic + direct-listening signals. Method: an AI pass reconciles the two reads and cites the signals behind each finding.'}
          note={pr
            ? 'What the record agrees on, what is contested, and who is missing from it. Each finding shows how many sources it rests on.'
            : 'Cross-source agreement, real tensions, and whose voice the public record leaves out.'}
        >
          <MetaSynthesis campaignId={campaign.id} refreshKey={!data.lens ? 'off' : data.lens.sorting || data.lens.building || data.lens.pending > 0 ? 'sorting' : 'sorted'} />
        </DashSection>

        {views.length > 0 && (community || views.includes('vibrant')) ? (
        <DashSection n="03" title="Where people stand, by place and issue" info="What communities raised, read three ways. Origin: every signal on this board (community voice and public record; background findings are counted separately). Method: rule-based — an issue counts a signal when the signal's issue tags use that issue's words, so one signal can touch several issues; islands come from the community named in each signal; indicator ratings are copied from the Vibrant Hawaiʻi reports. No AI, so everyone sees the same numbers." note="What people raised, how they feel about it, and how that differs from island to island.">
          <DashTabs
            defaultKey={views.includes('islands') && community ? 'islands' : views.includes('issues') && community ? 'issues' : 'vibrant'}
            tabs={[
              ...(views.includes('islands') && community ? [{ key: 'islands', label: 'By island', hint: 'How much we heard from each island, how people there feel, and which issues stand out compared with the other islands.', node: <IslandView view={community} /> }] : []),
              ...(views.includes('issues') && community ? [{ key: 'issues', label: 'Issues by community', hint: 'Which issues each community raised most, side by side. Section 04 compares sources; this compares places.', node: <IssuesView view={community} /> }] : []),
              ...(views.includes('vibrant') ? [{ key: 'vibrant', label: 'Community indicators', hint: 'Residents’ own ratings of seven community conditions (Vibrant Hawaiʻi, 2026).', node: <VibrantIndicatorsView /> }] : []),
            ]}
          />
        </DashSection>
        ) : null}

        {campaign.kind === 'site' && (
        <DashSection n="03" title="Signal by place" info="A schematic of the project area. Origin: signals that name specific local places. Method: each place is sized by how many signals reference it and coloured by the average stance there (amber opposition → purple co-ownership). Click a pin for the signals behind it." note="A schematic of the project area, with each place sized by how much signal references it and colored by the sentiment there.">
          <OriginationMap places={data.places} campaignId={data.campaignId} />
        </DashSection>
        )}

        {pr ? (
        <DashSection n="04" title="The record, issue by issue" info="Where the public record lands on each issue, and what it is built from. Origin: public-record signals only. Method: signals are sorted into issues and scored by stance; the source tab counts the record and links to every item in it." note="Where the record lands on each issue, and the sources behind it (with links).">
          <DashTabs
            defaultKey="by-issue"
            tabs={[
              { key: 'by-issue', label: 'Where the record lands', hint: 'For each issue, where the public record sits on the opposition-to-support spectrum. Issues are grouped into families; click one to see its specific issues.', node: <IssueSpectrum rows={data.spectrum} families={data.spectrumFamilies} emptyNote={data.lens?.sorting ? 'Sorting signals into issues — this fills in on its own in a few minutes.' : undefined} /> },
              { key: 'by-source', label: 'Sources & links', hint: 'How much is in the record, its stance mix, and a link through to every item and its original source.', node: <SourceCards sources={data.sources} campaignId={campaign.id} only={['civic']} /> },
            ]}
          />
        </DashSection>
        ) : (
        <DashSection n="04" title="Signal across sources & issues" info="The same community signal, three ways — where each source lands on each issue, where concerns cluster by theme, and how much each source is saying. Origin: all ingested signals, kept in three separate buckets. Method: sources are counted and scored separately and never averaged into one number." note="The same signal, three ways — where each source lands on each issue, where concerns cluster, and how much each source is saying.">
          <DashTabs
            defaultKey="by-issue"
            tabs={[
              { key: 'by-issue', label: 'Where each source lands', hint: 'For each issue, a pin per source on the opposition to support spectrum — so you can see exactly where sources agree and diverge. Issues are grouped into families; click one to see its specific issues.', node: <IssueSpectrum rows={data.spectrum} families={data.spectrumFamilies} emptyNote={data.lens?.sorting ? 'Sorting signals into issues — this fills in on its own in a few minutes.' : undefined} /> },
              { key: 'by-source', label: 'By source (volume)', hint: 'Desk research, the public civic record, and direct listening side by side — each counted and scored on its own, never blended into one number.', node: <SourceCards sources={data.sources} campaignId={campaign.id} /> },
            ]}
          />
        </DashSection>
        )}

        <DashSection n="05" tuneCampaignId={campaign.id} title="Biggest concerns + the questions behind them" info="The issues people raise with concern, objection or mixed feelings, ranked; who raises which; and the questions people keep asking. Origin: this Project’s signals, excluding background rows. Method: rule-based — each concern signal is counted under the issues its tags fall into (the board’s own issue list when sorted, else the shared issue groups), so everyone sees the same numbers. The Venn places an issue with a group of communities when at least two of that group’s concern signals raise it. The questions tab is an AI pass that clusters and ranks recurring questions." note="What worries people most, and whether those worries are shared across places or specific to some.">
          <DashTabs
            defaultKey="concerns"
            tabs={[
              { key: 'concerns', label: 'Biggest concerns', hint: 'Issues ranked by how many concern, objection or mixed signals raise them, with the communities raising them and the sources behind each.', node: <ConcernClusters view={concerns} /> },
              { key: 'venn', label: 'Who raises what', hint: 'Which concerns are shared across groups of communities and which are specific to one. Switch between groupings where there is more than one.', node: <ConcernVenn view={concerns} /> },
              { key: 'questions', label: 'Questions people ask', hint: 'The questions the community keeps asking, ranked by how often they come up. These feed the community reference page.', node: <TopQuestions data={questions} /> },
            ]}
          />
        </DashSection>

        <DashSection n="06" tuneCampaignId={campaign.id} title="Outliers & dissent" info="The signals that stand apart from the majority — divergent stances, rare angles, strong minority voices, and views from barely-present sources. Origin: this Project's signals. Method: each item is a real signal shown verbatim (nothing paraphrased); a relevance pass drops the subject's own material and cited references, and operator exclusions apply. The counterweight to consensus." note="Nuance and dissent the consensus would flatten — surfaced verbatim so a lone but important view isn't lost in the average.">
          <OutliersPanel data={outliers} />
        </DashSection>

        <DashSection n="07" tuneCampaignId={campaign.id} title="Representation — who's in, who's missing" info="Who the record actually represents, broken out by stakeholder segment, plus whose voice is thin and constructive paths forward. Origin: this Project's signals, reasoned through its analysis focus. Method: an AI pass disaggregates by segment, flags coverage gaps, and pulls grounded ideas — using roles/organisations, never personal names." note="The range of voices, not the average — who's represented, whose feedback is missing, and where to go from here.">
          <RepresentationPanel data={representation} />
        </DashSection>

        <DashSection n="08" tuneCampaignId={campaign.id} title="Coalition & community influencers" info="Who leads and shapes opinion in the community. Origin: the actors named across signals. Method: an AI pass classifies each into a role — official, organized group, connector, local expert, frontline resident, or the project side — with a note on their influence; reach and ranking are set by ACTUAL mention frequency in the signals, not the model's guess. Click a row for the signals behind it." note="The people and groups who move this conversation — by role: officials, organized groups, the community connector, local experts, and the residents most directly affected.">
          <CoalitionTable data={coalition} />
        </DashSection>

        {campaign.kind === 'site' && (
        <DashSection n="09" title="How comparable projects reached agreement" info="Comparable projects in the same region and of the same type, researched fresh for THIS project. Origin: live web search seeded from the project’s location and type. Method: Pythia suggests nearby look-alikes; pick one and it summarises how that project reached — or failed to reach — agreement, with sources to check. Model-summarised, not hand-verified — follow the links." note="Opposition is common — but projects that get to yes tend to do it the same few ways, by writing the community's concerns into enforceable commitments.">
          <PrecedentPanel campaignId={campaign.id} />
        </DashSection>
        )}

        {showCompare && (
        <DashSection n="10" title="Compare Projects" info="This Project next to another you’re running. Origin: two campaigns’ aggregated signals. Method: the same social-licence score and stance mix are computed for each and shown side by side — useful for comparing a specific project against general sentiment." note="Put this Project next to another you're running — the point of a general Project is to see how sentiment about solar generally compares to sentiment about the specific project.">
          <div className="mb-3"><ComparePicker activeCampaign={campaign.id} compareId={compareId} /></div>
          <CompareCampaigns
            a={{ name: campaign.name, data }}
            b={compareCampaign && compareData ? { name: compareCampaign.name, data: compareData } : null}
          />
        </DashSection>
        )}

        {campaign.kind === 'site' && (
        <DashSection n={pr ? '10' : '11'} title="State of play — legal & permitting" info="The current legal and permitting picture for this project, pulled live from the web on demand. Origin: live web search seeded from the project's location and type. Method: Pythia summarises the relevant rules, the permitting timeline and status, and the next moves, with links to sources; you can steer what it covers. Model-summarised, not hand-verified — follow the links." note="Where this project actually stands in law and permitting right now — the relevant rules, the timeline, and the next moves, pulled live from the web.">
          <StateOfPlay campaignId={campaign.id} baselineCommitments={projectCard?.commitments ?? []} baselineSource={projectCard ? `${projectCard.process} — full conditions in the siting record.` : ''} density="balanced" />
        </DashSection>
        )}

        <DashSection n="✓" title="Red-team — grounded or hallucinated?" info="An adversarial second model re-checks every AI-written claim on this dashboard against the raw signals and flags any that aren't supported. Origin: the dashboard's own analysis outputs. Method: a skeptical auditor pass with the signals as the sole ground truth; runs on demand. Verdicts: grounded / thin / unsupported." note="Run a hallucination check — every AI claim re-verified against the signals, worst-first. Nothing here is taken on faith.">
          <RedTeam campaignId={campaign.id} />
        </DashSection>
        {/* How the signal lens sorted this dashboard's signals — at the bottom, as a method note. */}
        <div id="what-counts" className="scroll-mt-6">
          <LensPanel data={data} />
        </div>
        </>
        )}
      </div>
    </div>
  );
}
