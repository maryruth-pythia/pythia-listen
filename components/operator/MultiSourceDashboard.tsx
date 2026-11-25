'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Embeds the self-contained Multi-Source Signal Dashboard in an iframe.
 * The iframe is fed by the gated /operator/dashboard/embed route, so its
 * styles stay isolated from the rest of the operator UI and it inherits the
 * password gate. The child page posts its scrollHeight so we can size the
 * frame to fit (including when a theme row is expanded).
 */
export default function MultiSourceDashboard() {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(4900);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const data = e.data as { pmsd?: boolean; height?: number } | null;
      if (data && data.pmsd && typeof data.height === 'number') {
        setHeight(Math.max(600, Math.ceil(data.height) + 16));
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <iframe
      ref={ref}
      src="/operator/dashboard/embed"
      title="Multi-Source Signal Dashboard"
      style={{ width: '100%', height, border: 0, display: 'block', borderRadius: 12 }}
    />
  );
}
