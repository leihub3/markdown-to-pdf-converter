# markdown-to-pdf

Convert Cursor `.plan.md` files (and other Markdown with Mermaid diagrams) into high-quality, print-ready PDFs.

## Features

- **Markdown** → Headings, tables, code blocks, and lists are rendered correctly.
- **Mermaid diagrams** → Flowcharts, sequence diagrams, and other Mermaid blocks are rendered as SVG images (no raw code in the PDF).
- **Print-ready PDF** → A4, scale 2 (Playwright max), with page-break rules for headings and diagrams.
- **Graceful fallback** → If a Mermaid diagram fails to render, a clear error placeholder is shown instead of breaking the run.

## Requirements

- **Node.js** 18+
- **Playwright** browsers (installed once via `npx playwright install`)

## Install

```bash
cd markdown-to-pdf
npm install
npx playwright install chromium
npm run build
```

## Usage

```bash
# From project root after build
node dist/cli.js input.plan.md output.pdf

# Or use the bin name (if linked)
md-to-pdf input.plan.md output.pdf

# Example with npx (from this directory)
npx md-to-pdf ./sample.plan.md ./sample.pdf
```

### CLI

```text
md-to-pdf <input.md> <output.pdf>
```

- **input.md** – Path to the Markdown file (e.g. a Cursor plan or any `.md` with Mermaid).
- **output.pdf** – Path where the PDF will be written.

## Architecture

- **`parser`** – Extracts Mermaid code blocks and replaces them with placeholders.
- **`renderer`** – Renders each Mermaid block to SVG via `@mermaid-js/mermaid` (with graceful failure).
- **`html`** – Converts Markdown to HTML and injects rendered diagram SVGs (or error placeholders).
- **`pdf`** – Generates PDF from HTML using Playwright (A4, high scale, print styles).
- **`cli`** – Orchestrates: read file → parse → render Mermaid → build HTML → write PDF.

## Web UI

A local web app lets you upload or paste Markdown, preview with rendered Mermaid diagrams, adjust print options (page size, scale, margins, print background), and download PDF.

```bash
npm run build
npm run ui
```

Then open **http://localhost:3333**. Use **Upload .md** or **Load sample**, click **Update preview** to render diagrams, change **Print options** as needed, and **Download PDF**.

- **Page size:** A4, Letter, Legal, Tabloid, Ledger, A3, A5, A6  
- **Scale:** 0.1–2 (Playwright limit)  
- **Margins:** e.g. `20mm` (applied to all sides)  
- **Print background:** on/off  

## Deploy (sharing with colleagues)

The Web UI can be deployed to **Railway** or **Render** so you can share a URL. The app uses the existing Express server and Playwright; both platforms need Chromium installed in the build step.

**Prerequisites**

- Node 18+
- Build step must run `npx playwright install chromium` so PDF generation works.

**Railway**

1. Connect your repo at [railway.app](https://railway.app).
2. Use the included [railway.toml](railway.toml): build command runs `npm install`, `npx playwright install chromium`, and `npm run build`; start command is `node dist/server/index.js`.
3. Deploy. Railway sets `PORT` automatically.

**Render**

1. Connect your repo at [render.com](https://render.com).
2. Create a Web Service and use the included [render.yaml](render.yaml), or set manually: **Build command** `npm install && npx playwright install chromium && npm run build`, **Start command** `node dist/server/index.js`.
3. Deploy. Render sets `PORT` automatically.

**Note:** The first request after a cold start may be slow while Chromium starts. Markdown is limited to 500 KB per request.

## Run locally (quick)

```bash
npm install
npx playwright install chromium
npm run build
node dist/cli.js sample.plan.md sample.pdf
```

Open `sample.pdf` to verify headings, tables, code, and Mermaid diagrams.

## Mermaid rendering

The app uses **@mermaid-js/mermaid-cli** (`mmdc`) to render each Mermaid code block to SVG via a headless browser. Diagrams are written to a temporary directory, rendered, then the SVG is inlined into the HTML. If a diagram fails (e.g. invalid syntax), a clear error placeholder is shown in the PDF.

## PDF options

- **Format:** A4  
- **Scale:** 2 (Playwright max; higher values are not supported)  
- **Margins:** 20 mm  
- **Print:** Backgrounds printed; headings and figures avoid bad page breaks where possible.

## License

MIT
