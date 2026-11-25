'use client';

import { useEffect, useRef, useState } from 'react';

type TurnstileAPI = {
  render: (el: HTMLElement, opts: { sitekey: string; callback: (token: string) => void }) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileAPI;
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/**
 * Cloudflare Turnstile bot-check. Invisible/low-friction "Managed" mode.
 * Renders nothing unless NEXT_PUBLIC_TURNSTILE_SITE_KEY is set, so the survey
 * is unchanged until you configure the (free) keys.
 */
export default function Turnstile({ onVerify }: { onVerify: (token: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!SITE_KEY) return;
    if (document.getElementById('cf-turnstile-script')) {
      setReady(true);
      return;
    }
    const sc = document.createElement('script');
    sc.id = 'cf-turnstile-script';
    sc.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    sc.async = true;
    sc.defer = true;
    sc.onload = () => setReady(true);
    document.head.appendChild(sc);
  }, []);

  useEffect(() => {
    if (!SITE_KEY || !ready || !ref.current || !window.turnstile) return;
    const widgetId = window.turnstile.render(ref.current, {
      sitekey: SITE_KEY,
      callback: (token: string) => onVerify(token),
    });
    return () => {
      try {
        window.turnstile?.remove(widgetId);
      } catch {
        /* ignore */
      }
    };
  }, [ready, onVerify]);

  if (!SITE_KEY) return null;
  return <div ref={ref} className="mt-3" />;
}
