import {
  getProjectCard,
  PROJECT_CARDS,
  type ProjectCard,
} from '@/lib/reference/content';
import { DEFAULT_CAMPAIGN_ID } from '@/lib/campaigns';
import ProjectReference from '@/components/reference/ProjectReference';
import FactSheetEditor from '@/components/reference/FactSheetEditor';
import OperatorNav from '@/components/OperatorNav';
import { getCache } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Project Reference · Pythia' };

export default async function ReferencePage(
  props: {
    searchParams?: Promise<{ campaign?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const requested = searchParams?.campaign;
  const base: ProjectCard =
    (requested && getProjectCard(requested)) ||
    getProjectCard(DEFAULT_CAMPAIGN_ID) ||
    PROJECT_CARDS['frasier-solar-knox-oh'];
  let card: ProjectCard = base;
  try {
    const ov = await getCache(`factsheet:${base.campaignId}`);
    if (ov?.value && typeof ov.value === 'object') {
      card = { ...base, ...(ov.value as Partial<ProjectCard>) };
    }
  } catch {
    /* fall back to the built-in card */
  }

  return (
    <div className="min-h-screen" style={{ background: '#F7F5FB' }}>
      <OperatorNav />
      <header className="pythia-reeded relative flex flex-col justify-center overflow-hidden rounded-3xl text-white" style={{ minHeight: 252 }}>
        <img src="/pythia-mark-white.png" alt="" aria-hidden className="pointer-events-none absolute" style={{ right: -18, top: -16, width: 200, opacity: 0.13, zIndex: 1 }} />
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(26,8,38,.34) 0%, rgba(26,8,38,0) 60%)', zIndex: 5 }} />
        <div className="relative z-10 mx-auto max-w-3xl px-6 py-8">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="text-[11px] font-semibold uppercase tracking-[0.2em]"
              style={{ color: 'rgba(255,255,255,.85)' }}
            >
              Community project reference
            </span>
          </div>
          <h1 className="mt-4 font-serif text-3xl font-semibold text-white">
            Know the facts before you weigh in
          </h1>
          <p
            className="mt-2 max-w-2xl text-[13.5px]"
            style={{ color: 'rgba(255,255,255,.9)' }}
          >
            A plain-language look at the project on the table, and honest answers
            — with sources — to the questions neighbors are asking. Built to help
            you make up your own mind.
          </p>
        </div>
      </header>

      <main className="px-6 py-8">
        <FactSheetEditor campaignId={card.campaignId} card={card} />
        <ProjectReference card={card} />
      </main>
    </div>
  );
}
