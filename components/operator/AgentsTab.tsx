'use client';
import { useEffect, useRef, useState } from 'react';
export default function AgentsTab() {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(3400);
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const data = e.data as { pmsd?: boolean; height?: number } | null;
      if (data && data.pmsd && typeof data.height === 'number') setHeight(Math.max(600, Math.ceil(data.height) + 16));
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);
  return (<iframe ref={ref} src="/operator/agents/embed" title="Agents"
    style={{ width: '100%', height, border: 0, display: 'block', borderRadius: 12 }} />);
}
