'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { copyFor } from '@/lib/i18n';
import type { Language, MapPin } from '@/lib/types';

/**
 * MappingPanel — participant drops pins on a project-area map to mark
 * concerns, important places, affected areas, or opportunities.
 *
 * Loaded dynamically (ssr: false) from the parent because Leaflet
 * requires window. Uses OpenStreetMap tiles (no API key needed).
 *
 * Each pin: lat, lng, label, optional note, kind. Replaces any prior pins
 * on submit (idempotent).
 */
export default function MappingPanel({
  sessionId,
  language,
  center,
  onSubmitted,
}: {
  sessionId: string;
  language: Language;
  /** Center for the map. If absent, falls back to a Hawai'i Island default. */
  center?: { lat: number; lng: number; zoom?: number };
  onSubmitted: () => void;
}) {
  const c = copyFor(language);
  const mapCenter = center ?? { lat: 19.5, lng: -155.6, zoom: 10 }; // Hawai'i Island default
  const [pins, setPins] = useState<MapPin[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Fix default-marker-icon URLs (Next.js asset paths break Leaflet's auto-resolve).
  useEffect(() => {
    delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
  }, []);

  /** Create a numbered pin icon for a given 1-based index. */
  function makeNumberedIcon(n: number): L.DivIcon {
    return L.divIcon({
      className: '',
      html: `<div style="
        background:#1F6E6E;
        color:white;
        border:2px solid white;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        width:28px;height:28px;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 1px 4px rgba(0,0,0,0.4);
        font-size:11px;font-weight:700;font-family:sans-serif;
      "><span style="transform:rotate(45deg)">${n}</span></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -28],
    });
  }

  function addPin(lat: number, lng: number) {
    const newPin: MapPin = {
      id: crypto.randomUUID(),
      lat,
      lng,
      label: '',
      note: '',
      kind: 'concern',
      capturedAt: new Date().toISOString(),
    };
    setPins((prev) => [...prev, newPin]);
    setEditingId(newPin.id);
  }

  function updatePin(id: string, patch: Partial<MapPin>) {
    setPins((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function removePin(id: string) {
    setPins((prev) => prev.filter((p) => p.id !== id));
    if (editingId === id) setEditingId(null);
  }

  async function submit(skip = false) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/map`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pins: skip ? [] : pins }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? 'Could not save pins');
      }
      onSubmitted();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const heading = c.panels.map.heading;

  const intro = c.panels.map.intro;

  const submitLabel = c.panels.map.submit;
  const skipLabel = c.panels.map.skip;
  const labelPlaceholder = c.panels.map.labelPlaceholder;
  const notePlaceholder = c.panels.map.notePlaceholder;

  return (
    <section className="mt-8">
      <h2 className="font-serif text-xl font-semibold text-brand-dark">
        {heading}
      </h2>
      <p className="mt-1 text-sm text-ink-muted">{intro}</p>

      <div className="mt-4 overflow-hidden rounded-lg border border-brand-rule">
        <MapContainer
          center={[mapCenter.lat, mapCenter.lng]}
          zoom={mapCenter.zoom ?? 11}
          style={{ height: 360, width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickToAddPin onAdd={addPin} />
          {pins.map((p, i) => (
            <Marker
              key={p.id}
              position={[p.lat, p.lng]}
              icon={makeNumberedIcon(i + 1)}
              draggable={true}
              eventHandlers={{
                dragend(e) {
                  const { lat, lng } = (e.target as L.Marker).getLatLng();
                  updatePin(p.id, { lat, lng });
                },
              }}
            >
              <Popup>
                <div className="text-xs">
                  <div className="font-semibold text-brand-dark">Pin {i + 1}</div>
                  <div className="font-medium">{p.label || '(no label)'}</div>
                  {p.note && <div className="mt-1">{p.note}</div>}
                  <p className="mt-1 text-ink-subtle italic">Drag to reposition</p>
                  <button
                    type="button"
                    onClick={() => setEditingId(p.id)}
                    className="mt-1 text-brand hover:underline"
                  >
                    Edit
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {pins.length > 0 && (
        <ul className="mt-5 space-y-3">
          {pins.map((p, i) => (
            <li
              key={p.id}
              className={`rounded-lg border p-3 ${
                editingId === p.id
                  ? 'border-brand bg-brand-light'
                  : 'border-brand-rule bg-white'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-wider text-brand">
                  Pin {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removePin(p.id)}
                  className="text-xs text-red-700 hover:underline"
                >
                  Remove
                </button>
              </div>
              <input
                type="text"
                value={p.label}
                onChange={(e) => updatePin(p.id, { label: e.target.value })}
                placeholder={labelPlaceholder}
                className="mt-2 w-full rounded-md border border-brand-rule p-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
              <textarea
                value={p.note ?? ''}
                onChange={(e) => updatePin(p.id, { note: e.target.value })}
                rows={2}
                placeholder={notePlaceholder}
                className="mt-2 w-full resize-none rounded-md border border-brand-rule p-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
              <select
                value={p.kind ?? 'concern'}
                onChange={(e) =>
                  updatePin(p.id, { kind: e.target.value as MapPin['kind'] })
                }
                className="mt-2 rounded-md border border-brand-rule p-1.5 text-xs"
              >
                <option value="concern">Concern</option>
                <option value="important">Important place</option>
                <option value="affected">Affected area</option>
                <option value="opportunity">Opportunity</option>
                <option value="other">Other</option>
              </select>
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
          disabled={busy || pins.length === 0}
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

function ClickToAddPin({ onAdd }: { onAdd: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onAdd(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}
