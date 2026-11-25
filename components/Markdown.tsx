/**
 * Tiny markdown renderer for Pythia chat content.
 *
 * Handles: paragraphs, **bold**, *italic*, simple `- ` and `* ` bullet lists.
 * Deliberately minimal — we don't need full CommonMark for the conversational
 * content we control. Keeps the bundle small (no extra dependency).
 */

import React from 'react';

function renderInline(text: string): React.ReactNode {
  // **bold** and *italic* — process bold first to avoid nesting issues.
  const tokens: Array<{ kind: 'b' | 'i' | 't'; text: string }> = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index === undefined) continue;
    if (m.index > last) tokens.push({ kind: 't', text: text.slice(last, m.index) });
    if (m[0].startsWith('**')) {
      tokens.push({ kind: 'b', text: m[0].slice(2, -2) });
    } else {
      tokens.push({ kind: 'i', text: m[0].slice(1, -1) });
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) tokens.push({ kind: 't', text: text.slice(last) });

  return tokens.map((tok, i) => {
    if (tok.kind === 'b') return <strong key={i}>{tok.text}</strong>;
    if (tok.kind === 'i') return <em key={i}>{tok.text}</em>;
    return <React.Fragment key={i}>{tok.text}</React.Fragment>;
  });
}

interface Block {
  kind: 'paragraph' | 'list';
  lines: string[];
}

function blocksFor(markdown: string): Block[] {
  const blocks: Block[] = [];
  const paragraphs = markdown.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  for (const p of paragraphs) {
    const lines = p.split('\n');
    const isList = lines.every((ln) => /^[-*]\s+/.test(ln.trim()));
    if (isList) {
      blocks.push({ kind: 'list', lines: lines.map((ln) => ln.replace(/^[-*]\s+/, '')) });
    } else {
      blocks.push({ kind: 'paragraph', lines });
    }
  }
  return blocks;
}

export function Markdown({ content, className = '' }: { content: string; className?: string }) {
  const blocks = blocksFor(content);

  return (
    <div className={className}>
      {blocks.map((b, bi) => {
        if (b.kind === 'list') {
          return (
            <ul key={bi} className="my-2 list-disc space-y-1 pl-5">
              {b.lines.map((ln, li) => (
                <li key={li}>{renderInline(ln)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={bi} className={bi === 0 ? '' : 'mt-3'}>
            {b.lines.map((ln, li) => (
              <React.Fragment key={li}>
                {li > 0 && <br />}
                {renderInline(ln)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
