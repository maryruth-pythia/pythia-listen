'use client';
import { useEffect, useRef, useState } from 'react';
export default function DataConnectors() {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(5600);
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const data = e.data as { pmsd?: boolean; height?: number } | null;
      if (data && data.pmsd && typeof data.height === 'number') setHeight(Math.max(600, Math.ceil(data.height) + 16));
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);
  return (<iframe ref={ref} src="/operator/data/embed" title="Data & Connectors"
    style={{ width: '100%', height, border: 0, display: 'block', borderRadius: 12 }} />);
}
