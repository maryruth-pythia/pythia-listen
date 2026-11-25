import { DATA_HTML_B64 } from '../_data-html';
export function GET() {
  const html = Buffer.from(DATA_HTML_B64, 'base64').toString('utf8');
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}
