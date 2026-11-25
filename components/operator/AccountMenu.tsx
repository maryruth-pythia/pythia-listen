'use client';
import { useEffect, useRef, useState } from 'react';
import { authClient } from '@/lib/auth-client';

interface Org { id: string; name: string; slug: string; }

export default function AccountMenu() {
  const [email, setEmail] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await authClient.getSession();
        if (cancelled || !data?.user) return;
        setEmail(data.user.email ?? null);
        const activeId = (data.session as { activeOrganizationId?: string | null } | undefined)?.activeOrganizationId ?? null;
        const list = await authClient.organization.list();
        if (cancelled) return;
        const orgs = (list.data ?? []) as Org[];
        const active = orgs.find((o) => o.id === activeId) ?? orgs[0];
        setOrgName(active?.name ?? null);
        setOrgs(orgs);
        setActiveId(active?.id ?? null);
      } catch { /* accounts disabled (password mode) or signed out — show nothing */ }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  // Switch the active org (e.g. Pythia staff opening a client's boards), then reload so every
  // list and board re-scopes to it.
  async function switchOrg(id: string) {
    if (id === activeId) { setOpen(false); return; }
    setBusy(true);
    try {
      await authClient.organization.setActive({ organizationId: id });
      window.location.href = '/operator/dashboard';
    } catch {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    try { await authClient.signOut(); } catch { /* ignore */ }
    window.location.href = '/signin';
  }

  if (!email) return null;

  return (
    <>
      <span className="hidden h-4 w-px bg-brand-rule md:inline-block" />
      <div ref={ref} className="relative">
        <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open}
          className="flex items-center gap-1.5 text-xs text-ink-subtle hover:text-brand-dark">
          <span className="max-w-[10rem] truncate">{orgName ?? email}</span>
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
        </button>
        {open && (
          <div role="menu" className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-brand-rule bg-white p-1 shadow-lg">
            <div className="px-3 py-2">
              <div className="truncate text-sm font-medium text-brand-dark">{orgName ?? 'Your organization'}</div>
              <div className="truncate text-xs text-ink-subtle">{email}</div>
            </div>
            {orgs.length > 1 && (
              <>
                <div className="my-1 h-px bg-brand-rule" />
                <div className="px-3 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-ink-subtle">Switch organization</div>
                {orgs.map((o) => (
                  <button key={o.id} type="button" role="menuitemradio" aria-checked={o.id === activeId}
                    onClick={() => switchOrg(o.id)} disabled={busy}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm text-brand-dark hover:bg-black/5 disabled:opacity-60">
                    <span className="w-3 flex-none text-brand">{o.id === activeId ? '✓' : ''}</span>
                    <span className="truncate">{o.name}</span>
                  </button>
                ))}
              </>
            )}
            <div className="my-1 h-px bg-brand-rule" />
            <button type="button" role="menuitem" onClick={signOut} disabled={busy}
              className="w-full rounded-md px-3 py-2 text-left text-sm text-brand-dark hover:bg-black/5 disabled:opacity-60">
              {busy ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
