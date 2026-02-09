/**
 * Web UI server: serves the app and exposes /api/preview and /api/pdf.
 */

import express, { type Request, type Response } from 'express';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMarkdown } from '../parser.js';
import { renderAllMermaidBlocks } from '../renderer.js';
import { markdownToHtml } from '../html.js';
import { generatePdfToBuffer } from '../pdf.js';
import type { PdfOptions, HtmlOptions } from '../types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '2mb' }));

const ROOT_DIR = join(__dirname, '..', '..');
const PUBLIC_DIR = join(ROOT_DIR, 'public');
const MAX_MARKDOWN_LENGTH = 500_000; // ~500 KB

function validateMarkdown(markdown: unknown): { ok: true; value: string } | { ok: false; status: number; error: string } {
  if (typeof markdown !== 'string') {
    return { ok: false, status: 400, error: 'Markdown must be a string.' };
  }
  if (markdown.length === 0) {
    return { ok: false, status: 400, error: 'Markdown cannot be empty.' };
  }
  if (markdown.length > MAX_MARKDOWN_LENGTH) {
    return { ok: false, status: 413, error: 'Markdown is too long. Max 500 KB.' };
  }
  return { ok: true, value: markdown };
}

function sanitizePdfFilename(name: string): string {
  const base = name.replace(/^.*[/\\]/, '').replace(/[^a-zA-Z0-9._-]/g, '_');
  const trimmed = base.trim() || 'document';
  return trimmed.toLowerCase().endsWith('.pdf') ? trimmed : trimmed + '.pdf';
}

app.use(express.static(PUBLIC_DIR));

app.get('/', (_req: Request, res: Response) => {
  res.sendFile(join(PUBLIC_DIR, 'index.html'));
});

app.get('/sample.plan.md', (_req: Request, res: Response) => {
  res.sendFile(join(ROOT_DIR, 'sample.plan.md'), (err: NodeJS.ErrnoException | null) => {
    if (err) res.status(404).send('Sample file not found');
  });
});

/** POST /api/preview — body: { markdown, diagramMaxWidth? }. Returns { html }. */
app.post('/api/preview', async (req: Request, res: Response) => {
  const validated = validateMarkdown(req.body?.markdown);
  if (!validated.ok) {
    res.status(validated.status).json({ error: validated.error });
    return;
  }
  try {
    const markdown = validated.value;
    const htmlOptions: HtmlOptions = { diagramMaxWidth: req.body?.diagramMaxWidth };
    const { markdown: mdWithPlaceholders, mermaidBlocks } = parseMarkdown(markdown);
    const diagrams = mermaidBlocks.length > 0 ? await renderAllMermaidBlocks(mermaidBlocks) : [];
    const html = markdownToHtml(mdWithPlaceholders, diagrams, htmlOptions);
    res.json({ html });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

/** POST /api/pdf — body: { markdown, options? }. options may include diagramMaxWidth, filename. Returns PDF file. */
app.post('/api/pdf', async (req: Request, res: Response) => {
  const validated = validateMarkdown(req.body?.markdown);
  if (!validated.ok) {
    res.status(validated.status).json({ error: validated.error });
    return;
  }
  try {
    const markdown = validated.value;
    const options: Partial<PdfOptions> & { diagramMaxWidth?: string; filename?: string } = req.body?.options ?? {};
    const { diagramMaxWidth, filename, ...pdfOptions } = options;
    const htmlOptions: HtmlOptions | undefined = diagramMaxWidth != null ? { diagramMaxWidth } : undefined;
    const { markdown: mdWithPlaceholders, mermaidBlocks } = parseMarkdown(markdown);
    const diagrams = mermaidBlocks.length > 0 ? await renderAllMermaidBlocks(mermaidBlocks) : [];
    const html = markdownToHtml(mdWithPlaceholders, diagrams, htmlOptions);
    const buffer = await generatePdfToBuffer({ html, ...pdfOptions });
    const pdfFilename = typeof filename === 'string' && filename.trim() ? sanitizePdfFilename(filename.trim()) : 'document.pdf';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdfFilename}"`);
    res.send(buffer);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

const PORT = Number(process.env.PORT) || 3333;
app.listen(PORT, () => {
  console.log(`Markdown to PDF UI: http://localhost:${PORT}`);
});
