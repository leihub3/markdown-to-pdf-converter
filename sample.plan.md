# System Design Plan

## Overview

This plan describes the architecture for the **markdown-to-pdf** pipeline.

## Architecture

```mermaid
flowchart TD
  A[.plan.md] --> B[Parser]
  B --> C[Markdown + placeholders]
  B --> D[Mermaid blocks]
  D --> E[Renderer]
  E --> F[SVG]
  C --> G[HTML builder]
  F --> G
  G --> H[HTML]
  H --> I[Playwright]
  I --> J[PDF]
```

## Components

| Component  | Responsibility                    |
|-----------|------------------------------------|
| Parser    | Extract Mermaid, replace with placeholders |
| Renderer  | Mermaid → SVG (or error placeholder)       |
| HTML      | Markdown → HTML, inject diagrams           |
| PDF       | HTML → A4 PDF via Playwright               |

## Sequence

```mermaid
sequenceDiagram
  participant User
  participant CLI
  participant Parser
  participant Renderer
  participant PDF
  User->>CLI: md-to-pdf in.md out.pdf
  CLI->>Parser: parse(md)
  Parser-->>CLI: markdown, mermaidBlocks
  CLI->>Renderer: renderAll(mermaidBlocks)
  Renderer-->>CLI: diagrams[]
  CLI->>CLI: markdownToHtml(markdown, diagrams)
  CLI->>PDF: generatePdf(html, path)
  PDF-->>User: out.pdf
```

## Code block example

```typescript
export function parseMarkdown(raw: string): ParseResult {
  const mermaidBlocks: MermaidBlock[] = [];
  const markdown = raw.replace(MERMAID_BLOCK_REGEX, (_, source) => {
    // ...
  });
  return { markdown, mermaidBlocks };
}
```

## Next steps

1. Run `npm run build`
2. Run `md-to-pdf sample.plan.md sample.pdf`
3. Open `sample.pdf`
