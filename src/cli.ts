#!/usr/bin/env node
/**
 * CLI: md-to-pdf input.plan.md output.pdf
 */

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseMarkdown } from './parser.js';
import { renderAllMermaidBlocks } from './renderer.js';
import { markdownToHtml } from './html.js';
import { generatePdf } from './pdf.js';

const USAGE = `
  md-to-pdf <input.md> <output.pdf>

  Converts a Markdown file (e.g. Cursor .plan.md) with Mermaid diagrams
  into a high-quality A4 PDF. Mermaid code blocks are rendered as SVG images.

  Example:
    md-to-pdf my.plan.md my.pdf
    npx md-to-pdf ./docs/plan.md ./out/plan.pdf
`;

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  if (args.length < 2) {
    console.error(USAGE);
    process.exit(1);
  }

  const [inputPath, outputPath] = args;
  const inputFile = resolve(process.cwd(), inputPath);
  const outputFile = resolve(process.cwd(), outputPath);

  try {
    const raw = await readFile(inputFile, 'utf-8');
    const { markdown, mermaidBlocks } = parseMarkdown(raw);

    let diagrams: Awaited<ReturnType<typeof renderAllMermaidBlocks>> = [];
    if (mermaidBlocks.length > 0) {
      console.error(`Rendering ${mermaidBlocks.length} Mermaid diagram(s)...`);
      diagrams = await renderAllMermaidBlocks(mermaidBlocks);
      const failed = diagrams.filter((d) => !d.svg);
      if (failed.length > 0) {
        console.error(
          `Warning: ${failed.length} diagram(s) could not be rendered and will show an error placeholder.`
        );
      }
    }

    const html = markdownToHtml(markdown, diagrams);
    console.error('Generating PDF...');
    await generatePdf({ html, outputPath: outputFile });
    console.error(`Done: ${outputFile}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}

main();
