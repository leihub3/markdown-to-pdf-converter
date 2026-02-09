/**
 * HTML assembly: Markdown → HTML with diagram placeholders replaced by SVG/error blocks.
 */

import { marked } from 'marked';
import type { RenderedDiagram, HtmlOptions } from './types.js';

const PAGE_BREAK_STYLES = `
  @media print {
    h1, h2, h3 { page-break-after: avoid; }
    /* Keep diagram with the heading above; avoid blank page after a heading */
    figure.mermaid-diagram, figure.mermaid-error {
      page-break-before: avoid;
      page-break-inside: avoid;
    }
    /* Prefer keeping at least 2 lines with a heading when breaking */
    h1, h2, h3 { orphans: 2; }
  }
`;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Builds a complete HTML document from Markdown body and rendered diagrams.
 * Replaces each placeholder with the diagram SVG or an error box.
 * Optional htmlOptions.diagramMaxWidth controls the max width of Mermaid figures (e.g. '80%').
 */
export function markdownToHtml(
  markdown: string,
  diagrams: RenderedDiagram[],
  htmlOptions?: HtmlOptions
): string {
  const rawHtml = marked.parse(markdown, { async: false }) as string;

  let html = rawHtml;
  for (const d of diagrams) {
    const placeholder = `<figure data-mermaid-id="${d.id}"></figure>`;
    let replacement: string;
    if (d.svg) {
      replacement = `<figure class="mermaid-diagram">${d.svg}</figure>`;
    } else {
      const msg = d.error ? escapeHtml(d.error) : 'Diagram could not be rendered.';
      replacement = `<figure class="mermaid-error"><pre>${msg}</pre></figure>`;
    }
    html = html.split(placeholder).join(replacement);
  }

  return wrapInDocument(html, htmlOptions);
}

function wrapInDocument(bodyHtml: string, htmlOptions?: HtmlOptions): string {
  const diagramMaxWidth = htmlOptions?.diagramMaxWidth ?? '100%';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Plan</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      max-width: 210mm;
      margin: 0 auto;
      padding: 20px;
    }
    h1 { font-size: 1.75rem; border-bottom: 2px solid #333; padding-bottom: 0.3em; }
    h2 { font-size: 1.35rem; margin-top: 1.5em; }
    h3 { font-size: 1.15rem; margin-top: 1.25em; }
    pre, code { font-family: 'Consolas', 'Monaco', monospace; background: #f5f5f5; }
    pre {
      padding: 12px;
      border-radius: 6px;
      max-width: 100%;
      white-space: pre-wrap;
      word-break: break-word;
      overflow-wrap: break-word;
      overflow-x: visible;
    }
    code { padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
    pre code { padding: 0; background: none; white-space: pre-wrap; word-break: break-word; overflow-wrap: break-word; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f5f5f5; font-weight: 600; }
    figure.mermaid-diagram { margin: 1.5em 0; text-align: center; max-width: ${diagramMaxWidth}; margin-left: auto; margin-right: auto; }
    figure.mermaid-diagram svg { max-width: 100%; height: auto; }
    figure.mermaid-error { margin: 1.5em 0; padding: 12px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; }
    figure.mermaid-error pre { margin: 0; background: transparent; color: #856404; }
    ${PAGE_BREAK_STYLES}
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}
