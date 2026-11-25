import { CONCEPTS_HTML_B64 } from '../_concepts-html';

// Serves the self-contained Feature Concepts HTML for the iframe on
// /operator/concepts. Under /operator, so middleware's password gate applies.
export function GET() {
  const html = Buffer.from(CONCEPTS_HTML_B64, 'base64').toString('utf8');
  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}
