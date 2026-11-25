'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * ConversationUpload — upload exported chats/emails or Drive documents and turn
 * them into direct-listening signal, with no Google Drive service-account setup.
 *
 * Supports picking individual files OR a whole folder (recurses into subfolders).
 * A folder contains all sorts of files, so we filter to the readable types on the
 * client before sending. Reusable: takes an optional campaignId + onIngested.
 */

const CHANNELS = [
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'viber', label: 'Viber' },
  { key: 'signal', label: 'Signal' },
  { key: 'email', label: 'Email' },
  { key: 'documents', label: 'Documents / Drive' },
  { key: 'other', label: 'Other' },
];

const INSTRUCTIONS: Record<string, string> = {
  whatsapp:
    'In WhatsApp: open the chat → the contact/group name → Export chat → “Without media” → save or email the .txt file, then upload it here.',
  viber:
    'In Viber: open the chat → menu → “Send / Email chat history” → save the file, then upload it here.',
  signal:
    'Signal has no simple per-chat export (that’s the point — it’s the most private). You can copy-paste the messages into a plain .txt file and upload that; Signal is the hardest to bring in.',
  email:
    'Two ways: save a single thread as .eml, OR export many at once via Google Takeout (takeout.google.com → Mail → export as .mbox) and upload the .mbox — Pythia splits it into individual messages automatically.',
  documents:
    'Upload documents from your Drive: PDF, Word (.docx), or text (.txt/.md/.csv). Use “choose a folder” to bring in a whole folder at once — Pythia reads the text out of each and skips anything it can’t read. (Excel support is coming later.)',
  other:
    'Upload any plain-text (.txt), email (.eml), CSV, or JSON export of the conversation.',
};

const READABLE = [
  '.txt', '.eml', '.mbox', '.csv', '.json', '.md', '.pdf', '.docx', '.html', '.htm',
];
function isReadable(name: string): boolean {
  const n = name.toLowerCase();
  return READABLE.some((ext) => n.endsWith(ext));
}

/**
 * Split any .mbox archive into one small .eml-named file per message, IN THE
 * BROWSER, before any size check. A Google Takeout mail export is a single huge
 * file; without this it trips the per-file size cap and the whole inbox is
 * skipped. Splitting here makes each email a tiny file that ingests (and
 * dedupes) individually — and sidesteps the server's per-mbox message cap.
 * Non-mbox files pass through untouched.
 */
async function expandMbox(files: File[]): Promise<File[]> {
  const out: File[] = [];
  for (const f of files) {
    if (!f.name.toLowerCase().endsWith('.mbox')) {
      out.push(f);
      continue;
    }
    let text = '';
    try {
      text = await f.text();
    } catch {
      out.push(f); // fall back to server-side parsing if we can't read it
      continue;
    }
    const msgs = text.split(/\r?\n(?=From )/);
    let n = 0;
    for (const msg of msgs) {
      const body = msg.replace(/^From .*\r?\n/, '');
      if (body.trim().length < 20) continue;
      n += 1;
      const idx = String(n).padStart(5, '0');
      out.push(
        new File([body], `${f.name}.msg${idx}.eml`, { type: 'message/rfc822' })
      );
    }
  }
  return out;
}

export default function ConversationUpload({
  campaignId,
  compact,
  onIngested,
  channelLock,
}: {
  campaignId?: string;
  compact?: boolean;
  onIngested?: (r: { created: number; updated: number; extracted: number }) => void;
  /** When set, force this source type and hide the picker (used by the guided wizard). */
  channelLock?: string;
}) {
  const [channel, setChannel] = useState(channelLock ?? 'whatsapp');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);

  // webkitdirectory isn't a typed React prop; set it on the element directly.
  useEffect(() => {
    if (folderRef.current) {
      folderRef.current.setAttribute('webkitdirectory', '');
      folderRef.current.setAttribute('directory', '');
    }
  }, []);

  async function upload() {
    const picked = [
      ...(fileRef.current?.files ? Array.from(fileRef.current.files) : []),
      ...(folderRef.current?.files ? Array.from(folderRef.current.files) : []),
    ];
    // Split .mbox archives into per-message files BEFORE the size checks below.
    const expanded = await expandMbox(picked);
    const readable = expanded.filter((f) => isReadable(f.name));
    if (readable.length === 0) {
      setErr(
        expanded.length > 0
          ? 'None of those files are readable yet (try PDF, Word, text, .mbox, or .eml).'
          : 'Choose files or a folder first.'
      );
      return;
    }

    const MAX_FILE_BYTES = 20 * 1024 * 1024;
    const MAX_BATCH_BYTES = 8 * 1024 * 1024;
    const MAX_BATCH_FILES = 25;

    const oversize = readable.filter((f) => f.size > MAX_FILE_BYTES);
    const usable = readable.filter((f) => f.size <= MAX_FILE_BYTES);

    const batches: File[][] = [];
    let cur: File[] = [];
    let curBytes = 0;
    for (const f of usable) {
      if (cur.length >= MAX_BATCH_FILES || curBytes + f.size > MAX_BATCH_BYTES) {
        if (cur.length) batches.push(cur);
        cur = [];
        curBytes = 0;
      }
      cur.push(f);
      curBytes += f.size;
    }
    if (cur.length) batches.push(cur);
    if (batches.length === 0) {
      setErr('Those files are too large \u2014 narrow your export and try again.');
      return;
    }

    setBusy(true);
    setErr(null);
    setMsg(null);
    const total = usable.length;
    let done = 0;
    let created = 0;
    let updated = 0;
    let filesN = 0;
    try {
      for (let b = 0; b < batches.length; b++) {
        setMsg(
          `Processing ${done} of ${total} files\u2026 ${created} signal${created === 1 ? '' : 's'} so far. Keep this tab open.`
        );
        const fd = new FormData();
        fd.set('channel', channel);
        batches[b].forEach((f) => fd.append('file', f));
        const res = await fetch('/api/ingest/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) {
          setErr(
            `${data?.error ?? 'Upload failed.'} \u2014 stopped after ${done} of ${total} files (${created} signals saved). Re-select the folder to resume; done files are skipped.`
          );
          setBusy(false);
          return;
        }
        created += data.created ?? 0;
        updated += data.updated ?? 0;
        filesN += data.files ?? 0;
        done += batches[b].length;
      }
      const skipped = expanded.length - readable.length;
      setMsg(
        `Done \u2014 ${created} new signal${created === 1 ? '' : 's'} from ${total} file${total === 1 ? '' : 's'}` +
          `${updated ? ` (${updated} already ingested)` : ''}` +
          `${skipped > 0 ? ` \u00b7 skipped ${skipped} unreadable` : ''}` +
          `${oversize.length > 0 ? ` \u00b7 skipped ${oversize.length} too-large` : ''}` +
          `. Pythia auto-routed each to the right Project \u2014 check your dashboards.`
      );
      if (fileRef.current) fileRef.current.value = '';
      if (folderRef.current) folderRef.current.value = '';
      onIngested?.({ created, updated, extracted: created });
    } catch {
      setErr(
        `Network hiccup \u2014 stopped after ${done} of ${total} files (${created} signals saved). Re-select the folder to resume; done files are skipped.`
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-brand-rule bg-white p-4">
      {!compact && (
        <h3 className="mb-1 font-serif text-base font-semibold text-brand-dark">
          Add community conversations
        </h3>
      )}
      <p className="mb-3 text-sm text-ink-muted">
        Upload exported chats, emails, or documents and Pythia turns them into
        signal on your dashboard. Nothing is auto-read from your apps — you choose
        what to share, and no phone numbers or names are stored.
      </p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {!channelLock && (
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="rounded-md border border-brand-rule px-2 py-1.5 text-sm focus:border-brand focus:outline-none"
          >
            {CHANNELS.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        )}
        <label className="flex items-center gap-1.5 text-xs text-ink-subtle">
          Files:
          <input
            ref={fileRef}
            type="file"
            multiple
            accept=".txt,.eml,.mbox,.csv,.json,.md,.pdf,.docx,.html,text/plain"
            className="text-sm"
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-ink-subtle">
          or a folder:
          <input ref={folderRef} type="file" multiple className="text-sm" />
        </label>
        <button
          type="button"
          onClick={upload}
          disabled={busy}
          className="rounded-md bg-brand px-4 py-1.5 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          {busy ? 'Adding…' : 'Add to Pythia'}
        </button>
        <button
          type="button"
          onClick={() => setShowHelp((s) => !s)}
          className="text-xs text-brand underline underline-offset-2 hover:text-brand-dark"
        >
          How do I export?
        </button>
      </div>
      {showHelp && (
        <p className="mt-2 max-w-xl text-xs text-ink-muted">{INSTRUCTIONS[channel]}</p>
      )}
      {msg && <p className="mt-2 text-sm" style={{ color: '#2F6B3C' }}>{msg}</p>}
      {err && <p className="mt-2 text-sm text-[#B23A2E]">{err}</p>}
    </section>
  );
}
