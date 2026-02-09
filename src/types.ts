/**
 * Represents a Mermaid code block extracted from Markdown.
 */
export interface MermaidBlock {
  /** Unique id for replacement (e.g. placeholder in document). */
  id: string;
  /** Raw Mermaid source (e.g. "flowchart TD\n  A --> B"). */
  source: string;
  /** Index in the list of all Mermaid blocks (for ordering). */
  index: number;
}

/**
 * Result of rendering a single Mermaid diagram.
 */
export interface RenderedDiagram {
  id: string;
  /** SVG markup on success. */
  svg: string | null;
  /** Error message if rendering failed. */
  error?: string;
}

/** Playwright-supported page format names. */
export type PdfFormat = 'A4' | 'Letter' | 'Legal' | 'Tabloid' | 'Ledger' | 'A0' | 'A1' | 'A2' | 'A3' | 'A5' | 'A6';

/**
 * Options for HTML/document assembly (preview and PDF).
 */
export interface HtmlOptions {
  /** Max width for Mermaid diagrams (e.g. '100%', '80%'). Helps reduce blank space and control layout. */
  diagramMaxWidth?: string;
}

/**
 * Options for PDF generation.
 */
export interface PdfOptions {
  format?: PdfFormat;
  scale?: number;
  printBackground?: boolean;
  preferCSSPageSize?: boolean;
  margin?: { top?: string; right?: string; bottom?: string; left?: string };
}
