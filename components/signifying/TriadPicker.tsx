'use client';

import { useRef, useState } from 'react';
import type { Triad } from '@/lib/signifiers';

/**
 * Triad picker — screen-mode capture of three-pole self-signification.
 * Participant clicks (or taps) inside the triangle to position themselves.
 * Stores barycentric coordinates a/b/c summing to 1.
 *
 * Triangle vertices:
 *   pole A (top)            → (cx, top)
 *   pole B (bottom-right)   → (cx + r, bottom)
 *   pole C (bottom-left)    → (cx - r, bottom)
 */
export default function TriadPicker({
  triad,
  coords,
  onChange,
}: {
  triad: Triad;
  coords: { a: number; b: number; c: number } | undefined;
  onChange: (c: { a: number; b: number; c: number } | undefined) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [touched, setTouched] = useState(coords !== undefined);

  // Visual triangle — positioned inside a wider canvas so bottom pole
  // labels have room to render without clipping.
  // ViewBox: "-50 -20 300 230" gives 50px extra left/right, 20px top, 40px bottom.
  const top = { x: 100, y: 20 };
  const br = { x: 180, y: 170 };
  const bl = { x: 20, y: 170 };

  const dotPos = coords
    ? barycentricToCartesian(coords, top, br, bl)
    : { x: 100, y: 120 }; // centroid-ish default

  function handleClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 200;
    const y = ((e.clientY - rect.top) / rect.height) * 200;
    const bc = cartesianToBarycentric({ x, y }, top, br, bl);
    if (bc.a < 0 || bc.b < 0 || bc.c < 0) return; // outside triangle
    setTouched(true);
    onChange(bc);
  }

  return (
    <fieldset className="rounded-lg border border-brand-rule bg-white p-5">
      <legend className="px-2 text-sm font-semibold text-brand-dark">
        {triad.label}
      </legend>
      <p className="mb-4 text-sm text-ink">{triad.prompt}</p>

      <div className="flex flex-col items-center">
        <svg
          ref={svgRef}
          viewBox="-50 -20 300 230"
          onClick={handleClick}
          className="h-64 w-full max-w-xs cursor-crosshair select-none overflow-visible"
          style={{ overflow: 'visible' }}
          role="img"
          aria-label={`Triad: ${triad.poles.join(', ')}`}
        >
          {/* Triangle fill */}
          <polygon
            points={`${top.x},${top.y} ${br.x},${br.y} ${bl.x},${bl.y}`}
            fill="#F4F9F9"
            stroke="#1F6E6E"
            strokeWidth={1.5}
          />
          {/* Pole labels — placed outside triangle with room to breathe */}
          <text x={top.x} y={top.y - 8} textAnchor="middle" fontSize="11" fontWeight="600" fill="#155454">
            {triad.poles[0]}
          </text>
          <text x={br.x + 8} y={br.y + 16} textAnchor="start" fontSize="11" fontWeight="600" fill="#155454">
            {triad.poles[1]}
          </text>
          <text x={bl.x - 8} y={bl.y + 16} textAnchor="end" fontSize="11" fontWeight="600" fill="#155454">
            {triad.poles[2]}
          </text>
          {/* Participant dot */}
          {touched && (
            <circle
              cx={dotPos.x}
              cy={dotPos.y}
              r={6}
              fill="#1F6E6E"
              stroke="white"
              strokeWidth={2}
            />
          )}
        </svg>

        {!touched && (
          <p className="mt-3 text-center text-xs italic text-ink-subtle">
            Tap inside the triangle to position yourself. Closer to a corner
            means that one matters most to you.
          </p>
        )}

        {touched && coords && (
          <div className="mt-3 flex items-center gap-4 text-xs">
            <span className="text-ink-subtle">
              {triad.poles[0]}: <span className="font-medium text-ink">{Math.round(coords.a * 100)}%</span>
            </span>
            <span className="text-ink-subtle">
              {triad.poles[1]}: <span className="font-medium text-ink">{Math.round(coords.b * 100)}%</span>
            </span>
            <span className="text-ink-subtle">
              {triad.poles[2]}: <span className="font-medium text-ink">{Math.round(coords.c * 100)}%</span>
            </span>
          </div>
        )}
        {touched && (
          <button
            type="button"
            onClick={() => {
              setTouched(false);
              onChange(undefined);
            }}
            className="mt-3 text-xs text-brand hover:underline"
          >
            Reset / skip
          </button>
        )}
      </div>
    </fieldset>
  );
}

// ---- Barycentric coordinate helpers ----
function barycentricToCartesian(
  bc: { a: number; b: number; c: number },
  A: { x: number; y: number },
  B: { x: number; y: number },
  C: { x: number; y: number }
): { x: number; y: number } {
  return {
    x: bc.a * A.x + bc.b * B.x + bc.c * C.x,
    y: bc.a * A.y + bc.b * B.y + bc.c * C.y,
  };
}

function cartesianToBarycentric(
  p: { x: number; y: number },
  A: { x: number; y: number },
  B: { x: number; y: number },
  C: { x: number; y: number }
): { a: number; b: number; c: number } {
  // Solve [B-A, C-A] [b; c] = P-A
  const v0 = { x: B.x - A.x, y: B.y - A.y };
  const v1 = { x: C.x - A.x, y: C.y - A.y };
  const v2 = { x: p.x - A.x, y: p.y - A.y };
  const den = v0.x * v1.y - v1.x * v0.y;
  const b = (v2.x * v1.y - v1.x * v2.y) / den;
  const c = (v0.x * v2.y - v2.x * v0.y) / den;
  const a = 1 - b - c;
  return { a, b, c };
}
