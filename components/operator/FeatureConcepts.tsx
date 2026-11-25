'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Embeds the Feature Concepts gallery (concept mockups, not production
 * features) in an iframe on /operator/concepts, fed by the gated
 * /operator/concepts/embed route so styles stay isolated and the page
 * inherits the password gate.
 */
export default function FeatureConcepts() {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(6600);

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
      src="/operator/concepts/embed"
      title="Feature Concepts"
      style={{ width: '100%', height, border: 0, display: 'block', borderRadius: 12 }}
    />
  );
}
