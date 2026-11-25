/**
 * Health check — confirms the Anthropic API key works and the model is reachable.
 * Run with: npm run health
 */
import { config } from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';

// Next.js convention: .env.local takes precedence over .env
config({ path: '.env.local' });
config({ path: '.env' });

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEY not set in .env.local');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });

  console.log('→ Pinging Anthropic API with claude-sonnet-4-5...');
  const start = Date.now();

  const resp = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 64,
    messages: [
      { role: 'user', content: 'Reply with exactly: PYTHIA_HEALTH_OK' },
    ],
  });

  const elapsed = Date.now() - start;
  const text = resp.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { text: string }).text)
    .join('');

  console.log(`← Response (${elapsed}ms):`, text.trim());
  console.log('   Model:', resp.model);
  console.log('   Tokens in/out:', resp.usage.input_tokens, '/', resp.usage.output_tokens);

  if (text.includes('PYTHIA_HEALTH_OK')) {
    console.log('✅ API key valid, model reachable, end-to-end OK.');
  } else {
    console.log('⚠️  API call worked but model did not echo expected token. Probably still fine.');
  }
}

main().catch((err) => {
  console.error('❌ Health check failed:', err.message || err);
  process.exit(1);
});
