import Link from 'next/link';
import React from 'react';

/**
 * Signature brand gradient (amber → magenta → purple). The animated "reeded"
 * treatment — the fluting + the light sweeping across it — lives in
 * globals.css as `.pythia-reeded` (and freezes under prefers-reduced-motion).
 */
export const GRAD =
  'linear-gradient(90deg,#FCC029 0%,#EC2BFC 52%,#6A0FC2 100%)';
/** Reverse marks/logo are white on the gradient. */
export const CREAM = '#FFFFFF';

function Square({ offset }: { offset: number }) {
  return (
    <span
      className="absolute"
      style={{ left: offset, top: offset, width: 21, height: 21, border: '2.5px solid #fff', borderRadius: 3 }}
    />
  );
}

export function PythiaMark() {
  return (
    <span className="relative inline-block" style={{ width: 30, height: 30 }}>
      <Square offset={0} />
      <Square offset={6} />
    </span>
  );
}

/** A top-nav button in the gradient header. primary = the white CTA. */
export function HeaderButton({
  href,
  children,
  primary,
}: {
  href: string;
  children: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-1.5 text-[13px] ${primary ? 'font-semibold' : 'font-medium'}`}
      style={
        primary
          ? { background: '#fff', color: '#6A0FC2' }
          : { background: 'rgba(255,255,255,.16)', color: '#fff' }
      }
    >
      {children}
    </Link>
  );
}

/**
 * Shared gradient header used across pages so the whole app reads as one system.
 * Breaks out of the operator layout's padding to sit flush and full-width.
 */
export default function GradientHeader({
  eyebrow,
  title,
  actions,
  children,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  actions?: React.ReactNode;
  /** Optional content rendered below the title (e.g. a picker, a subtitle). */
  children?: React.ReactNode;
}) {
  return (
    <header
      className="pythia-reeded relative -mx-6 -mt-8 mb-6 flex flex-col justify-center overflow-hidden text-white"
      style={{ minHeight: 252 }}
    >
      <img src="/pythia-mark-white.png" alt="" aria-hidden className="pointer-events-none absolute" style={{ right: -28, top: -24, width: 240, opacity: 0.13, zIndex: 1 }} />
      {/* legibility scrim: keeps white text readable when the amber part of the sweep passes behind it */}
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(26,8,38,.34) 0%, rgba(26,8,38,0) 60%)', zIndex: 5 }} />
      <div className="relative z-10 px-6 py-8">
        {actions && (
          <div className="relative z-10 mb-3 flex flex-wrap items-center justify-end gap-2">
            {actions}
          </div>
        )}
        {eyebrow && (
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,.85)' }}>
            {eyebrow}
          </div>
        )}
        <h1 className="mt-1 text-3xl font-semibold text-white" style={{ textShadow: '0 1px 12px rgba(50,6,60,.4)' }}>
          {title}
        </h1>
        {children && <div className="mt-3">{children}</div>}
      </div>
    </header>
  );
}
