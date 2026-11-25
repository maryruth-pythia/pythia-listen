'use client';

import { useState } from 'react';
import { copyFor } from '@/lib/i18n';
import type { Language, PhotovoiceEntry } from '@/lib/types';

/**
 * PhotovoicePanel — participant submits one or more photos with captions.
 * Images are client-side resized to max 1280px / JPEG q=0.7 before upload
 * to keep payloads under ~200KB each.
 *
 * Optional, skippable. Works on mobile (uses native camera via file input).
 */
export default function PhotovoicePanel({
  sessionId,
  language,
  onSubmitted,
}: {
  sessionId: string;
  language: Language;
  onSubmitted: () => void;
}) {
  const c = copyFor(language);
  const [entries, setEntries] = useState<Array<{ id: string; imageDataUrl: string; caption: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setErr(null);
    setBusy(true);
    try {
      const newEntries: Array<{ id: string; imageDataUrl: string; caption: string }> = [];
      for (const file of Array.from(files)) {
        const resized = await resizeImage(file, 1280, 0.7);
        newEntries.push({
          id: crypto.randomUUID(),
          imageDataUrl: resized,
          caption: '',
        });
      }
      setEntries((prev) => [...prev, ...newEntries]);
    } catch (e) {
      setErr((e as Error).message ?? 'Could not process image');
    } finally {
      setBusy(false);
    }
  }

  function setCaption(id: string, caption: string) {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, caption } : e))
    );
  }

  function removeEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  async function submit(skip = false) {
    setBusy(true);
    setErr(null);
    try {
      const payload: PhotovoiceEntry[] = skip
        ? []
        : entries.map((e) => ({
            id: e.id,
            imageDataUrl: e.imageDataUrl,
            caption: e.caption.trim(),
            capturedAt: new Date().toISOString(),
          }));
      const res = await fetch(`/api/sessions/${sessionId}/photovoice`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ entries: payload }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? 'Could not save photos');
      }
      onSubmitted();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const heading = c.panels.photo.heading;

  const intro = c.panels.photo.intro;

  const addPhoto = c.panels.photo.add;
  const captionPlaceholder = c.panels.photo.captionPlaceholder;
  const submitLabel = c.panels.photo.submit;
  const skipLabel = c.panels.photo.skip;

  return (
    <section className="mt-8">
      <h2 className="font-serif text-xl font-semibold text-brand-dark">
        {heading}
      </h2>
      <p className="mt-1 text-sm text-ink-muted">{intro}</p>

      <div className="mt-4">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-brand-rule bg-white px-4 py-2 text-sm font-medium text-brand-dark hover:border-brand">
          <span>{addPhoto}</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            disabled={busy}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
      </div>

      {entries.length > 0 && (
        <ul className="mt-5 space-y-4">
          {entries.map((e) => (
            <li
              key={e.id}
              className="overflow-hidden rounded-lg border border-brand-rule bg-white"
            >
              <div className="bg-brand-vlight">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={e.imageDataUrl}
                  alt="Participant photo"
                  className="mx-auto block max-h-64 w-auto"
                />
              </div>
              <div className="p-3">
                <textarea
                  value={e.caption}
                  onChange={(ev) => setCaption(e.id, ev.target.value)}
                  rows={2}
                  placeholder={captionPlaceholder}
                  className="w-full resize-none rounded-md border border-brand-rule p-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
                <button
                  type="button"
                  onClick={() => removeEntry(e.id)}
                  className="mt-2 text-xs text-red-700 hover:underline"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {err && (
        <p className="mt-3 rounded border border-red-300 bg-red-50 p-2 text-sm text-red-800">
          {err}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => submit(false)}
          disabled={busy || entries.length === 0}
          className="rounded-md bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {busy ? '…' : submitLabel}
        </button>
        <button
          type="button"
          onClick={() => submit(true)}
          disabled={busy}
          className="rounded-md border border-brand-rule bg-white px-4 py-2 text-sm text-ink-muted hover:border-brand disabled:opacity-50"
        >
          {skipLabel}
        </button>
      </div>
    </section>
  );
}

/**
 * Client-side image resize. Loads file → canvas → exports JPEG.
 * Caps dimensions at maxDim while preserving aspect ratio.
 */
async function resizeImage(file: File, maxDim: number, quality: number): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read image file'));
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('Could not load image'));
    i.src = dataUrl;
  });
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', quality);
}
