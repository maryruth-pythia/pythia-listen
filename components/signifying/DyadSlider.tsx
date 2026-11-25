'use client';

import { useState } from 'react';
import type { Dyad } from '@/lib/signifiers';

/**
 * Dyad slider — screen-mode capture of a bipolar self-signification.
 * Returns a 0–100 value representing position on the slider, where 0 is
 * the low pole and 100 is the high pole.
 */
export default function DyadSlider({
  dyad,
  value,
  onChange,
}: {
  dyad: Dyad;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  const [touched, setTouched] = useState(value !== undefined);
  const displayValue = value ?? 50;

  return (
    <fieldset className="rounded-lg border border-brand-rule bg-white p-5">
      <legend className="px-2 text-sm font-semibold text-brand-dark">
        {dyad.label}
      </legend>
      <p className="mb-4 text-sm text-ink">{dyad.prompt}</p>

      <div className="flex items-center gap-3">
        <span className="w-32 text-right text-xs text-ink-muted">
          {dyad.poleLow}
        </span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={displayValue}
          onChange={(e) => {
            setTouched(true);
            onChange(Number(e.target.value));
          }}
          className="flex-1 accent-brand"
          aria-label={`${dyad.poleLow} to ${dyad.poleHigh}`}
        />
        <span className="w-32 text-left text-xs text-ink-muted">
          {dyad.poleHigh}
        </span>
      </div>

      {!touched && (
        <p className="mt-3 text-xs italic text-ink-subtle">
          Drag the slider to set your position. Leave it in the middle if
          you're not sure.
        </p>
      )}

      {touched && (
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-ink-subtle">
            Your position: <span className="font-medium text-ink">{displayValue}/100</span>
          </span>
          <button
            type="button"
            onClick={() => {
              setTouched(false);
              onChange(undefined);
            }}
            className="text-brand hover:underline"
          >
            Reset / skip
          </button>
        </div>
      )}
    </fieldset>
  );
}
