/**
 * Parser module: extracts Mermaid blocks from Markdown and produces
 * a normalized document with placeholders for diagrams.
 */

import type { MermaidBlock } from './types.js';

const MERMAID_BLOCK_REGEX = /^```mermaid\s*\n([\s\S]*?)```$/gm;

export interface ParseResult {
  /** Markdown with Mermaid blocks replaced by placeholders. */
  markdown: string;
  /** Extracted Mermaid blocks in order. */
  mermaidBlocks: MermaidBlock[];
}

/**
 * Extracts all Mermaid code blocks from raw Markdown and replaces them
 * with unique placeholders. Returns the modified Markdown and the list
 * of blocks for rendering.
 */
export function parseMarkdown(raw: string): ParseResult {
  const mermaidBlocks: MermaidBlock[] = [];
  let index = 0;

  const markdown = raw.replace(MERMAID_BLOCK_REGEX, (_, source: string) => {
    const id = `mermaid-placeholder-${index}`;
    mermaidBlocks.push({
      id,
      source: source.trim(),
      index: index++,
    });
    // Block-level HTML placeholder so Markdown doesn't wrap in <p>
    return `\n<figure data-mermaid-id="${id}"></figure>\n`;
  });

  return { markdown, mermaidBlocks };
}
