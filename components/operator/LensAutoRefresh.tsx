'use client';
/**
 * While the signal lens is still sorting, quietly refresh the dashboard every
 * 20 seconds so progress shows up without reloading. Stops when sorting is
 * done (this component unmounts) or after 15 minutes.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const EVERY_MS = 20000;
const MAX_MS = 15 * 60 * 1000;

export default function LensAutoRefresh() {
  const router = useRouter();
  const [stopped, setStopped] = useState(false);
  useEffect(() => {
    const started = Date.now();
    const t = setInterval(() => {
      if (Date.now() - started > MAX_MS) {
        clearInterval(t);
        setStopped(true);
        return;
      }
      router.refresh();
    }, EVERY_MS);
    return () => clearInterval(t);
  }, [router]);
  return (
    <span className="text-[11.5px]" style={{ color: '#9A8FA6' }}>
      {stopped ? 'Auto-update paused — reload to check progress.' : 'Updating automatically…'}
    </span>
  );
}
