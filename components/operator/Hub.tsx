import Link from 'next/link';
import React from 'react';

const GRAD = 'linear-gradient(90deg,#FCC029 0%,#EC2BFC 52%,#6A0FC2 100%)';

/**
 * Hub layout primitives for "pick one of many" operator pages.
 * A prominent HubFeature (the start-here action) over HubGroups of compact
 * HubRows under clear labels — every item carries a one-line description.
 * Page headers are unchanged; these style the body only.
 */

export function HubFeature({
  href,
  title,
  cta = 'Open',
  children,
}: {
  href: string;
  title: string;
  cta?: string;
  children?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="mb-2 flex items-center gap-4 rounded-xl border border-brand-rule bg-brand-vlight px-4 py-4 transition hover:bg-brand-light"
    >
      <div className="min-w-0">
        <div className="font-serif text-base font-semibold text-brand-dark">
          {title}
        </div>
        {children && (
          <div className="mt-0.5 text-[13px] text-ink-muted">{children}</div>
        )}
      </div>
      <span
        className="ml-auto flex-none rounded-lg px-3.5 py-2 text-[13px] font-semibold text-white"
        style={{ background: GRAD }}
      >
        {cta} &rarr;
      </span>
    </Link>
  );
}

export function HubGroup({
  label,
  caption,
  children,
}: {
  label: string;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5">
      <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
        {label}
      </p>
      {caption && <p className="mb-2 text-[12px] text-ink-subtle">{caption}</p>}
      <div className="overflow-hidden rounded-xl border border-brand-rule">
        {children}
      </div>
    </div>
  );
}

export function HubRow({
  href,
  title,
  children,
}: {
  href: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 border-t border-brand-rule px-4 py-3 transition first:border-t-0 hover:bg-brand-vlight"
    >
      <div className="min-w-0">
        <div className="text-[14px] font-semibold text-brand-dark">{title}</div>
        {children && (
          <div className="text-[12.5px] text-ink-muted">{children}</div>
        )}
      </div>
      <span className="ml-auto flex-none text-brand">&rarr;</span>
    </Link>
  );
}
