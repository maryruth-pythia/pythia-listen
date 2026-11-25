import Link from 'next/link';
import type {
  DashboardData,
  StanceCounts,
  TrendPoint,
  HeatRow,
} from '@/lib/dashboard/aggregate';
import type { SignalSource, SignalStance } from '@/lib/types';
import SignalScout from './SignalScout';

const STANCE_LABEL: Record<SignalStance, string> = {
  opposition: 'Opposed',
  concern: 'Concerned',
  mixed: 'Mixed',
  support: 'Supportive',
  neutral: 'Neutral',
};

function prettify(theme: string): string {
  const s = theme.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function HeatMap({ rows }: { rows: HeatRow[] }) {
  const sources: SignalSource[] = ['civic', 'pythia', 'survey'];
  const SRCLAB: Record<SignalSource, string> = {
    desk: 'Internal',
    civic: 'Civic',
    pythia: 'Internal',
    survey: 'Survey',
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th
              className="pb-2 text-left text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: '#9A8FA6' }}
            >
              Theme
            </th>
            {sources.map((s) => (
              <th
                key={s}
                className="pb-2 text-center text-[11px] font-semibold uppercase tracking-wide"
                style={{
                  color: '#9A8FA6',
                  background: s === 'civic' ? '#FBF7EC' : undefined,
                }}
              >
                {SRCLAB[s]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.theme} style={{ borderTop: '1px solid #E7DCD0' }}>
              <td className="py-2.5 pr-3" style={{ color: '#1F1330' }}>
                {prettify(r.theme)}
              </td>
              {sources.map((s) => {
                const cell = r.cells[s];
                if (!cell.stance) {
                  return (
                    <td
                      key={s}
                      className="py-1.5 text-center"
                      style={{
                        color: '#C9BEB2',
                        background: s === 'civic' ? '#FBF7EC' : undefined,
                      }}
                    >
                      —
                    </td>
                  );
                }
                const color = STANCE_META[cell.stance].color;
                return (
                  <td
                    key={s}
                    className="py-1.5 text-center"
                    style={{ background: s === 'civic' ? '#FBF7EC' : undefined }}
                  >
                    <span
                      className="inline-block rounded-md px-3 py-1.5"
                      style={{ background: `${color}1A`, minWidth: 92 }}
                    >
                      <span
                        className="block text-[13px] font-semibold"
                        style={{ color }}
                      >
                        {STANCE_LABEL[cell.stance]}
                      </span>
                      <span
                        className="block text-[10px] uppercase tracking-wide"
                        style={{ color: '#9A8FA6' }}
                      >
                        {cell.intensity}
                      </span>
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* Brand tokens lifted from the static design so the live one matches it. */
const C = {
  grad: 'linear-gradient(90deg,#FCC029 0%,#EC2BFC 52%,#6A0FC2 100%)',
  cream: '#FCF6C4',
  page: '#F7F5FB',
  plum: '#1F1330',
  ink: '#2E2438',
  muted: '#6A5F74',
  subtle: '#9A8FA6',
  rule: '#E7DCD0',
  shadow:
    '0 1px 2px rgba(59,42,78,.05),0 6px 22px rgba(59,42,78,.07)',
};

const STANCE_META: Record<
  keyof StanceCounts,
  { label: string; color: string }
> = {
  opposition: { label: 'Opposition', color: '#B23A2E' },
  concern: { label: 'Concern', color: '#C77D2A' },
  mixed: { label: 'Mixed', color: '#7A6E88' },
  support: { label: 'Support', color: '#4F8A5C' },
  neutral: { label: 'Neutral', color: '#9A8FA6' },
};

const SOURCE_META: Record<
  SignalSource,
  { label: string; color: string; href: string }
> = {
  civic: { label: 'Civic record', color: '#EC2BFC', href: '/operator/civic' },
  pythia: {
    label: 'Internal docs',
    color: '#6A0FC2',
    href: '/operator/channels',
  },
  desk: { label: 'Internal docs', color: '#6A0FC2', href: '/operator/channels' },
  survey: { label: 'Survey responses', color: '#2F8F6B', href: '/operator/surveys' },
};

function card(): React.CSSProperties {
  return {
    background: '#fff',
    border: `1px solid ${C.rule}`,
    borderRadius: 13,
    boxShadow: C.shadow,
  };
}

function SectionHead({
  n,
  title,
  note,
}: {
  n: string;
  title: string;
  note: string;
}) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-3">
        <span
          className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[7px] font-serif text-[13px] font-semibold text-white"
          style={{ background: C.grad }}
        >
          {n}
        </span>
        <h2
          className="font-serif text-xl font-semibold"
          style={{ color: C.plum }}
        >
          {title}
        </h2>
      </div>
      <p className="mt-1.5 max-w-2xl text-[13.5px]" style={{ color: C.muted }}>
        {note}
      </p>
    </div>
  );
}

function StanceBar({ stance }: { stance: StanceCounts }) {
  const total = Object.values(stance).reduce((a, b) => a + b, 0) || 1;
  const order: (keyof StanceCounts)[] = [
    'opposition',
    'concern',
    'mixed',
    'support',
    'neutral',
  ];
  return (
    <div
      className="flex h-2.5 w-full overflow-hidden rounded-full"
      style={{ background: '#EFE7DA' }}
    >
      {order.map((k) =>
        stance[k] > 0 ? (
          <div
            key={k}
            style={{
              width: `${(stance[k] / total) * 100}%`,
              backgroundColor: STANCE_META[k].color,
            }}
            title={`${STANCE_META[k].label}: ${stance[k]}`}
          />
        ) : null
      )}
    </div>
  );
}

function fmtPeriod(p: string): string {
  const [y, m] = p.split('-');
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const mi = Number(m) - 1;
  return `${months[mi] ?? m} '${y.slice(2)}`;
}

const TREND_SERIES: { key: SignalSource | 'overall'; label: string; color: string; width: number; dash?: string }[] = [
  { key: 'overall', label: 'All sources', color: '#1F1330', width: 3 },
  { key: 'civic', label: 'Civic record', color: '#EC2BFC', width: 2 },
  { key: 'pythia', label: 'Internal docs', color: '#6A0FC2', width: 2 },
  { key: 'survey', label: 'Survey responses', color: '#2F8F6B', width: 2 },
];

function TrendChart({ trend }: { trend: TrendPoint[] }) {
  if (trend.length < 2) {
    return (
      <p className="text-xs" style={{ color: C.subtle }}>
        Not enough dated signal yet to chart a trend — it fills in as more
        records land across time.
      </p>
    );
  }
  const W = 660;
  const H = 240;
  const padL = 30;
  const padR = 14;
  const padT = 12;
  const padB = 30;
  const xs = (i: number) =>
    padL + (i * (W - padL - padR)) / (trend.length - 1);
  const ys = (v: number) => padT + (1 - v / 100) * (H - padT - padB);
  const gridVals = [0, 25, 50, 75, 100];

  // Which series actually have data (>=2 points) — keep the chart legible.
  const scoreAt = (t: TrendPoint, key: SignalSource | 'overall') =>
    key === 'overall' ? t.score : t.sources[key];
  const active = TREND_SERIES.filter(
    (s) => trend.filter((t) => scoreAt(t, s.key) != null).length >= 2
  );

  // Thin the x-axis month labels so they never overlap, however many periods
  // there are — keep the last one (and the first when it has room), evenly
  // spaced from the right so end labels like "Jul '26" / "Aug '26" don't collide.
  const usableW = W - padL - padR;
  const maxLabels = Math.max(2, Math.floor(usableW / 48));
  const labelStep = Math.max(1, Math.ceil(trend.length / maxLabels));
  const labelIdx = new Set<number>();
  for (let i = trend.length - 1; i >= 0; i -= labelStep) labelIdx.add(i);
  if (Math.min(...labelIdx) >= Math.ceil(labelStep * 0.6)) labelIdx.add(0);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {gridVals.map((v) => (
          <g key={v}>
            <line x1={padL} y1={ys(v)} x2={W - padR} y2={ys(v)} stroke={C.rule} strokeWidth={1} />
            <text x={padL - 6} y={ys(v) + 3} textAnchor="end" fontSize={10} fill={C.subtle}>
              {v}
            </text>
          </g>
        ))}
        {trend.map((t, i) =>
          labelIdx.has(i) ? (
            <text
              key={i}
              x={xs(i)}
              y={H - 10}
              textAnchor={i === 0 ? 'start' : i === trend.length - 1 ? 'end' : 'middle'}
              fontSize={10}
              fill={C.muted}
            >
              {fmtPeriod(t.period)}
            </text>
          ) : null
        )}
        {active.map((s) => {
          // Connect only the periods where this series has a value.
          const pts = trend
            .map((t, i) => ({ i, v: scoreAt(t, s.key) }))
            .filter((p) => p.v != null) as { i: number; v: number }[];
          const path = pts.map((p) => `${xs(p.i)},${ys(p.v)}`).join(' ');
          return (
            <g key={s.key}>
              <polyline
                points={path}
                fill="none"
                stroke={s.color}
                strokeWidth={s.width}
                strokeLinejoin="round"
                strokeDasharray={s.dash}
              />
              {pts.map((p) => (
                <circle key={p.i} cx={xs(p.i)} cy={ys(p.v)} r={3.5} fill="#fff" stroke={s.color} strokeWidth={2} />
              ))}
            </g>
          );
        })}
      </svg>
      {/* legend */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {active.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: C.muted }}>
            <span className="inline-block h-2.5 w-4 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function Bars({
  items,
  color,
}: {
  items: { label: string; count: number }[];
  color: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <ul className="space-y-2">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-3 text-[13px]">
          <span
            className="w-40 shrink-0 truncate"
            style={{ color: C.muted }}
            title={it.label}
          >
            {it.label.replace(/_/g, ' ')}
          </span>
          <span className="flex-1">
            <span
              className="inline-block h-3.5 rounded-[3px] align-middle"
              style={{
                width: `${(it.count / max) * 100}%`,
                backgroundColor: color,
              }}
            />
          </span>
          <span className="w-6 text-right" style={{ color: C.subtle }}>
            {it.count}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function LiveDashboard({ data }: { data: DashboardData }) {
  if (data.total === 0) {
    return (
      <div
        className="rounded-lg p-6 text-sm"
        style={{ ...card(), color: C.muted }}
      >
        No signal yet for this Project. Seed the{' '}
        <Link href="/operator/civic" className="underline" style={{ color: C.plum }}>
          Civic record
        </Link>{' '}
        and connect the{' '}
        <Link href="/operator/channels" className="underline" style={{ color: C.plum }}>
          Listening inbox
        </Link>{' '}
        to populate the dashboard.
      </div>
    );
  }

  // Drift: change in score from earliest to latest period.
  const drift =
    data.trend.length >= 2
      ? data.trend[data.trend.length - 1].score - data.trend[0].score
      : 0;
  const driftDir = drift < 0 ? 'opposition' : 'support';
  const cap =
    `This Project sits in “${data.band.label.toLowerCase()}” territory` +
    (Math.abs(drift) >= 1
      ? `, and has moved ${Math.abs(drift)} point${
          Math.abs(drift) !== 1 ? 's' : ''
        } toward ${driftDir} across the record.`
      : `.`);

  return (
    <div className="space-y-8">
      {/* Social-licence hero */}
      <div
        className="grid items-center gap-6 p-6 md:grid-cols-[200px_1fr]"
        style={card()}
      >
        <div className="text-center">
          <div
            className="text-[10.5px] uppercase tracking-[0.12em]"
            style={{ color: C.subtle }}
          >
            Project sentiment
          </div>
          <div
            className="font-serif text-[52px] font-semibold leading-none"
            style={{ color: C.plum }}
          >
            {data.score}
          </div>
          <div
            className="text-sm font-semibold"
            style={{ color: '#8A5A00' }}
          >
            {data.band.label}
          </div>
          {Math.abs(drift) >= 1 && (
            <div
              className="mt-1.5 text-xs font-medium"
              style={{ color: drift < 0 ? '#B23A2E' : '#4F8A5C' }}
            >
              {drift < 0 ? '▼' : '▲'} {Math.abs(drift)} pts toward {driftDir}
            </div>
          )}
        </div>
        <div>
          <div
            className="relative rounded-lg"
            title={`Social-licence bands (0–100): Opposition 0–24 · Contested 25–44 · Acceptance 45–61 · Approval 62–79 · Co-ownership 80–100. This project: ${data.score}, ${data.band.label}.`}
            style={{
              height: 38,
              background:
                'linear-gradient(90deg,#B23A2E,#C77D2A,#D9B24A,#7FA35A,#3E8E6E)',
            }}
          >
            <span
              className="absolute"
              style={{
                left: `calc(${Math.max(1, Math.min(99, data.score))}% - 1.5px)`,
                top: -9,
                width: 3,
                height: 56,
                background: C.plum,
              }}
            />
          </div>
          <div
            className="mt-3 flex justify-between text-[10.5px]"
            style={{ color: C.muted }}
          >
            {([
              ['Opposition', '0–24'],
              ['Contested', '25–44'],
              ['Acceptance', '45–61'],
              ['Approval', '62–79'],
              ['Co-ownership', '80–100'],
            ] as const).map(([name, range]) => (
              <span
                key={name}
                className="flex flex-col leading-tight"
                title={`${name}: sentiment score ${range} out of 100`}
              >
                <span>{name}</span>
                <span className="text-[9.5px]" style={{ color: C.subtle }}>{range}</span>
              </span>
            ))}
          </div>
          <p className="mt-3 text-[12.5px]" style={{ color: C.muted }}>
            {cap} {data.total} signals across {data.sources.length} source
            {data.sources.length !== 1 ? 's' : ''}.
          </p>
        </div>
      </div>

      {/* 01 — sentiment over time */}
      <section>
        <SectionHead
          n="01"
          title="How sentiment moved over time"
          note="Community sentiment tracked across the life of this project, from the earliest record to the latest."
        />
        <div className="p-5" style={card()}>
          <TrendChart trend={data.trend} />
        </div>
      </section>

      {/* 02 — Signal Scout */}
      <section>
        <SectionHead
          n="02"
          title="Signal Scout · check-in"
          note="The human stays in the loop — Scout reports what’s shifting and asks whether it matches what you’re hearing."
        />
        <SignalScout campaignId={data.campaignId} />
      </section>

      {/* 03 — heat map */}
      <section>
        <SectionHead
          n="03"
          title="Signal by theme, across sources"
          note="Where a theme is loud in one source but faint in another."
        />
        <div className="p-5" style={card()}>
          {data.heatmap.length ? (
            <HeatMap rows={data.heatmap} />
          ) : (
            <p className="text-xs" style={{ color: C.subtle }}>
              No themes tagged yet.
            </p>
          )}
        </div>
      </section>

      {/* 04 — sources */}
      <section>
        <SectionHead
          n="04"
          title="Where the signal comes from"
          note="How much signal each source is contributing, and which way each one leans."
        />
        <div className="grid gap-4 sm:grid-cols-3">
          {data.sources.map((s) => {
            const m = SOURCE_META[s.source];
            return (
              <Link key={s.source} href={m.href}>
                <div className="p-4" style={card()}>
                  <div className="flex items-center justify-between">
                    <span
                      className="text-sm font-semibold"
                      style={{ color: m.color }}
                    >
                      {m.label}
                    </span>
                    <span className="text-xs" style={{ color: C.subtle }}>
                      {s.count}
                    </span>
                  </div>
                  <p className="mt-1 text-xs" style={{ color: C.subtle }}>
                    score {s.score}/100
                  </p>
                  <div className="mt-2">
                    <StanceBar stance={s.stance} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 04 — coalition + 05 latest */}
      <div className="grid gap-6 md:grid-cols-2">
        <section>
          <SectionHead
            n="05"
            title="Coalition & trusted messengers"
            note="The organisations, roles, and voices appearing in the record, sized by how often they come up — the map of who the community actually listens to."
          />
          <div className="p-5" style={card()}>
            {data.actors.length ? (
              <Bars
                items={data.actors.map((a) => ({
                  label: a.actor,
                  count: a.count,
                }))}
                color="#8A5A00"
              />
            ) : (
              <p className="text-xs" style={{ color: C.subtle }}>
                No named organisations yet.
              </p>
            )}
          </div>
        </section>

        <section>
          <SectionHead
            n="06"
            title="Latest signal"
            note="The most recent items to land — newest first."
          />
          <div className="p-5" style={card()}>
            <ul className="space-y-2.5">
              {data.recent.map((s) => (
                <li key={s.id} className="text-[13px]">
                  <span
                    className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle"
                    style={{
                      backgroundColor:
                        STANCE_META[s.stance as SignalStance]?.color ?? '#888',
                    }}
                  />
                  <span style={{ color: C.ink }}>{s.title}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

    </div>
  );
}
