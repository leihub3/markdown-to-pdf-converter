/**
 * PDF generation: HTML → print-ready PDF via Playwright.
 * A4, high scale (effective DPI), page-break aware.
 */

import { chromium } from 'playwright';
import type { PdfOptions } from './types.js';

const DEFAULT_MARGIN = { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' };

// Playwright allows scale in [0.1, 2]; use 2 for highest quality
const DEFAULT_OPTIONS: Required<Omit<PdfOptions, 'margin'>> & { margin: PdfOptions['margin'] } = {
  format: 'A4',
  scale: 2,
  printBackground: true,
  preferCSSPageSize: false,
  margin: undefined,
};

export interface PdfGenerateOptions extends Partial<PdfOptions> {
  /** HTML string for the page body (full document). */
  html: string;
  /** Output file path (omit when using generatePdfToBuffer). */
  outputPath?: string;
}

async function runPdfGeneration(html: string, opts: Required<Omit<PdfOptions, 'margin'>> & { margin: Record<string, string> }): Promise<Buffer> {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: 'networkidle',
      timeout: 30_000,
    });

    const scale = Math.min(2, Math.max(0.1, opts.scale));
    const buffer = await page.pdf({
      format: opts.format,
      scale,
      printBackground: opts.printBackground,
      preferCSSPageSize: opts.preferCSSPageSize,
      margin: opts.margin,
    });
    return Buffer.from(buffer);
  } finally {
    await browser.close();
  }
}

/**
 * Generates a PDF from full HTML and returns it as a Buffer (for API/download).
 */
export async function generatePdfToBuffer(options: Omit<PdfGenerateOptions, 'outputPath'>): Promise<Buffer> {
  const { html, ...pdfOpts } = options;
  const opts = { ...DEFAULT_OPTIONS, ...pdfOpts };
  const margin = { ...DEFAULT_MARGIN, ...opts.margin } as Record<string, string>;
  return runPdfGeneration(html, { ...opts, margin });
}

/**
 * Generates a PDF from full HTML document and writes to outputPath.
 */
export async function generatePdf(options: PdfGenerateOptions): Promise<void> {
  const { html, outputPath, ...pdfOpts } = options;
  if (!outputPath) throw new Error('outputPath is required for generatePdf');
  const opts = { ...DEFAULT_OPTIONS, ...pdfOpts };
  const margin = { ...DEFAULT_MARGIN, ...opts.margin } as Record<string, string>;
  const buffer = await runPdfGeneration(html, { ...opts, margin });
  const { writeFile } = await import('node:fs/promises');
  await writeFile(outputPath, buffer);
}
