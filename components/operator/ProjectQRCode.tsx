'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

/**
 * ProjectQRCode — generates a scannable QR code linking directly to the
 * participant start page for a specific project.
 *
 * Used at in-person engagement events: operator shows or prints this and
 * participants scan it with their phone to begin a session.
 */
export default function ProjectQRCode({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const [open, setOpen] = useState(false);

  // Build the URL. In production this is the Vercel deployment; in dev it's localhost.
  // We read from window.location so it works in both environments.
  const url =
    typeof window !== 'undefined'
      ? `${window.location.origin}/start?project=${projectId}`
      : `/start?project=${projectId}`;

  function handlePrint() {
    const win = window.open('', '_blank');
    if (!win) return;
    const svgEl = document.getElementById(`qr-${projectId}`);
    const svgHTML = svgEl?.outerHTML ?? '';
    win.document.write(`
      <html><head><title>Pythia QR – ${projectName}</title>
      <style>
        body { font-family: sans-serif; text-align: center; padding: 40px; }
        h2 { font-size: 18px; margin-bottom: 4px; }
        p { font-size: 12px; color: #555; margin: 0 0 20px; }
        .url { font-size: 10px; color: #888; word-break: break-all; margin-top: 16px; }
      </style></head><body>
      <h2>${projectName}</h2>
      <p>Scan to share your thoughts with Pythia</p>
      ${svgHTML}
      <p class="url">${url}</p>
      </body></html>
    `);
    win.document.close();
    win.print();
  }

  return (
    <section className="rounded-lg border border-brand-rule bg-white p-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
      >
        <h3 className="font-serif text-sm font-semibold uppercase tracking-wider text-brand-dark">
          Participant QR code
        </h3>
        <span className="text-xs text-ink-subtle">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-4 flex flex-col items-center gap-4">
          <div className="rounded-lg border border-brand-rule p-4">
            <QRCodeSVG
              id={`qr-${projectId}`}
              value={url}
              size={200}
              level="M"
              bgColor="#ffffff"
              fgColor="#1F6E6E"
            />
          </div>

          <p className="max-w-[220px] text-center text-xs text-ink-muted">
            Participants scan this at an event to start a session directly for{' '}
            <span className="font-medium text-ink">{projectName}</span>.
          </p>

          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="rounded-md border border-brand-rule bg-white px-3 py-1.5 text-xs text-ink-muted hover:border-brand hover:text-brand-dark"
            >
              Print / save as PDF
            </button>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(url)}
              className="rounded-md border border-brand-rule bg-white px-3 py-1.5 text-xs text-ink-muted hover:border-brand hover:text-brand-dark"
            >
              Copy link
            </button>
          </div>

          <p className="max-w-[220px] break-all text-center text-[10px] text-ink-subtle">
            {url}
          </p>
        </div>
      )}
    </section>
  );
}
