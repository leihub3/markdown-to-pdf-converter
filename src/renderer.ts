/**
 * Mermaid renderer: converts Mermaid source to SVG via mermaid-cli (mmdc).
 * Fails gracefully with an error placeholder when rendering fails.
 */

import { execFile, spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MermaidBlock, RenderedDiagram } from './types.js';

const isWindows = process.platform === 'win32';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT_DIR = join(__dirname, '..');

/** Resolve mmdc from project node_modules (mermaid-cli binary). */
function getMmdcPath(): string {
  const binDir = join(ROOT_DIR, 'node_modules', '.bin');
  const mmdc = join(binDir, 'mmdc');
  const mmdcCmd = join(binDir, 'mmdc.cmd');
  if (existsSync(mmdcCmd)) return mmdcCmd;
  if (existsSync(mmdc)) return mmdc;
  return 'mmdc'; // fallback to PATH
}

/** Path to Puppeteer config for mmdc (--no-sandbox etc.). Used when running as root (e.g. Docker). */
function getPuppeteerConfigPath(): string | null {
  const configPath = join(ROOT_DIR, 'puppeteer-config.json');
  return existsSync(configPath) ? configPath : null;
}

function runMmdc(mmdcPath: string, inputPath: string, outputPath: string): Promise<void> {
  const args = ['-i', inputPath, '-o', outputPath, '-b', 'transparent'];
  const puppeteerConfig = getPuppeteerConfigPath();
  if (puppeteerConfig) args.unshift('-p', puppeteerConfig);
  return new Promise((resolve, reject) => {
    if (isWindows && mmdcPath.endsWith('.cmd')) {
      spawn('cmd.exe', ['/c', mmdcPath, ...args], {
        stdio: 'ignore',
        windowsHide: true,
      })
        .on('error', reject)
        .on('close', (code) => (code === 0 ? resolve() : reject(new Error(`mmdc exited with code ${code}`))));
    } else {
      execFile(mmdcPath, args, { maxBuffer: 10 * 1024 * 1024 }, (err) =>
        err ? reject(err) : resolve()
      );
    }
  });
}

/**
 * Renders a single Mermaid diagram to SVG using mmdc. Returns SVG string or null with error message.
 */
export async function renderMermaidToSvg(block: MermaidBlock): Promise<RenderedDiagram> {
  const dir = await mkdtemp(join(tmpdir(), 'md2pdf-'));
  const inputPath = join(dir, `diag-${block.index}.mmd`);
  const outputPath = join(dir, `diag-${block.index}.svg`);

  try {
    await writeFile(inputPath, block.source, 'utf-8');
    const mmdc = getMmdcPath();
    await runMmdc(mmdc, inputPath, outputPath);
    const svg = await readFile(outputPath, 'utf-8');
    return { id: block.id, svg };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      id: block.id,
      svg: null,
      error: `Mermaid render failed: ${message}`,
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/**
 * Renders all Mermaid blocks to SVG. Resolves when all are done (some may fail).
 */
export async function renderAllMermaidBlocks(
  blocks: MermaidBlock[]
): Promise<RenderedDiagram[]> {
  return Promise.all(blocks.map(renderMermaidToSvg));
}
