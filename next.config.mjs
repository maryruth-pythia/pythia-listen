/** @type {import('next').NextConfig} */
// Baseline security headers on every response. Conservative set that breaks
// nothing: HSTS (transport security), MIME-sniff protection, and referrer
// policy. Frame-ancestors/CSP are intentionally deferred — they need testing
// against the embed route and the app's inline styles.
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  // Deny device APIs (camera/mic/geolocation) by default at the browser level.
  // camera + location denied entirely (nothing uses them; also prevents the voice-input
  // 'camera opened instead of mic' surprise). microphone allowed first-party only so
  // talk-to-text still works on our own domain, blocked for third-party embeds.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=(), browsing-topics=()' },
];

const nextConfig = {
  reactStrictMode: true,
  // pdf-parse/pdfjs-dist load a worker file at runtime; bundling them breaks PDF reading.
  serverExternalPackages: ['@fal-ai/client', 'pdf-parse', 'pdfjs-dist'],
  experimental: {
    // Allows server-sent events / streaming responses without buffering.
    serverActions: { allowedOrigins: ['localhost:3000'] },
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
