'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import AccountMenu from './operator/AccountMenu';

/**
 * Operator top nav — three project-scoped doors plus a project switcher.
 *
 * Dashboard · Surveys · Briefs are the everyday doors; each carries the
 * currently-selected project (?campaign=…) so switching sections keeps you on
 * the same project. Deeper sources/analysis and one-time Organization setup are
 * secondary, kept out of the three primary doors so the loop stays legible.
 */
const PRIMARY = [
  { href: '/operator/dashboard', label: 'Dashboard' },
  { href: '/operator/surveys', label: 'Surveys' },
  { href: '/operator/report', label: 'Briefs' },
  { href: '/operator/agents', label: 'Agents' },
];

const SECONDARY = [  { href: '/operator/onboarding', label: 'Organization' },
];

export default function OperatorNav() {
  const pathname = usePathname();
  const params = useSearchParams();
  const campaign = params.get('campaign') ?? '';
  const q = campaign ? `?campaign=${encodeURIComponent(campaign)}` : '';

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  return (
    <nav className="border-b border-brand-rule bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-6 py-2.5">
        <Link href="/" className="flex items-center" aria-label="Pythia home">
          <img src="/pythia-logo.svg" alt="Pythia" style={{ height: 22, width: 'auto' }} />
        </Link>
        <span className="text-xs uppercase tracking-[0.15em] text-ink-subtle">
          Operator
        </span>

        <div className="ml-auto flex items-center gap-4 text-sm">
          {PRIMARY.map((n) => (
            <Link
              key={n.href}
              href={`${n.href}${q}`}
              className={
                isActive(n.href)
                  ? 'font-medium text-brand-dark underline underline-offset-4'
                  : 'text-ink-muted hover:text-brand-dark'
              }
            >
              {n.label}
            </Link>
          ))}

          <span className="hidden h-4 w-px bg-brand-rule md:inline-block" />

          <div className="hidden items-center gap-4 md:flex">
            {SECONDARY.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={
                  isActive(n.href)
                    ? 'text-xs font-medium text-brand-dark'
                    : 'text-xs text-ink-subtle hover:text-brand-dark'
                }
              >
                {n.label}
              </Link>
            ))}
          </div>

          <AccountMenu />
        </div>
      </div>
    </nav>
  );
}
