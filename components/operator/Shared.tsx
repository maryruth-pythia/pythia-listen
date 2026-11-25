/**
 * Shared UI primitives used across operator pages.
 * Lives in components/ so Next.js doesn't try to treat it as a page route.
 */

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    active: { bg: 'bg-amber-50', fg: 'text-amber-800', label: 'active' },
    recap: { bg: 'bg-blue-50', fg: 'text-blue-800', label: 'recap' },
    consented: { bg: 'bg-green-50', fg: 'text-green-800', label: 'consented' },
    closed: { bg: 'bg-brand-vlight', fg: 'text-brand-dark', label: 'closed' },
  };
  const v =
    map[status] ?? { bg: 'bg-gray-50', fg: 'text-gray-700', label: status };
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${v.bg} ${v.fg}`}
    >
      {v.label}
    </span>
  );
}

export function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
