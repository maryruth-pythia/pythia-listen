'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';

export default function OrgProfileForm() {
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [email, setEmail] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/manage/org-profile', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        const p = d?.profile;
        if (p) {
          setName(p.name ?? '');
          setWebsite(p.website ?? '');
          setEmail(p.email ?? '');
          setLogo(p.logoDataUrl ?? null);
        }
      })
      .catch(() => {});
  }, []);

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setErr('Please choose an image file.');
      return;
    }
    if (f.size > 500 * 1024) {
      setErr('That logo is over 500 KB — please use a smaller image.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLogo(typeof reader.result === 'string' ? reader.result : null);
      setSaved(false);
      setErr(null);
    };
    reader.readAsDataURL(f);
  }

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch('/api/manage/org-profile', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, website, email, logoDataUrl: logo }),
      });
      const d = await res.json();
      if (!res.ok) setErr(d?.error ?? 'Could not save.');
      else setSaved(true);
    } catch {
      setErr('Network error saving.');
    } finally {
      setSaving(false);
    }
  }

  const field =
    'w-full rounded-md border border-brand-rule px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none';

  return (
    <div className="mt-1 grid gap-3 sm:grid-cols-2">
      <label className="text-xs font-medium text-ink-muted">
        Organization name
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
          placeholder="e.g. Knox Smart Growth"
          className={`mt-1 ${field}`}
        />
      </label>
      <label className="text-xs font-medium text-ink-muted">
        Website
        <input
          value={website}
          onChange={(e) => {
            setWebsite(e.target.value);
            setSaved(false);
          }}
          placeholder="https://…"
          className={`mt-1 ${field}`}
        />
      </label>
      <label className="text-xs font-medium text-ink-muted">
        Contact email
        <input
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setSaved(false);
          }}
          placeholder="hello@yourorg.org"
          className={`mt-1 ${field}`}
        />
      </label>
      <div className="text-xs font-medium text-ink-muted">
        Logo
        <div className="mt-1 flex items-center gap-3">
          {logo ? (
            <img
              src={logo}
              alt="Org logo"
              className="h-10 w-10 rounded-md border border-brand-rule object-contain"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-dashed border-brand-rule text-ink-subtle">
              —
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-md border border-brand-rule bg-brand-vlight px-3 py-1.5 text-sm font-medium text-brand"
          >
            {logo ? 'Change logo' : 'Upload logo'}
          </button>
          {logo && (
            <button
              type="button"
              onClick={() => {
                setLogo(null);
                setSaved(false);
              }}
              className="text-xs text-ink-subtle underline underline-offset-2"
            >
              Remove
            </button>
          )}
        </div>
      </div>
      <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save organization'}
        </button>
        {saved && <span className="text-sm" style={{ color: '#2F6B3C' }}>Saved.</span>}
        {err && <span className="text-sm text-[#B23A2E]">{err}</span>}
      </div>
    </div>
  );
}
