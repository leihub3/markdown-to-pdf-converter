const markdownEl = document.getElementById('markdown');
const fileInput = document.getElementById('fileInput');
const loadSampleBtn = document.getElementById('loadSample');
const previewBtn = document.getElementById('previewBtn');
const previewFrame = document.getElementById('previewFrame');
const downloadPdfBtn = document.getElementById('downloadPdf');
const sharePdfBtn = document.getElementById('sharePdf');
const formatEl = document.getElementById('format');
const scaleEl = document.getElementById('scale');
const marginEl = document.getElementById('margin');
const diagramMaxWidthEl = document.getElementById('diagramMaxWidth');
const pdfFilenameEl = document.getElementById('pdfFilename');
const printBackgroundEl = document.getElementById('printBackground');
const statusEl = document.getElementById('status');
const previewEmptyEl = document.getElementById('previewEmpty');
const previewLoadingEl = document.getElementById('previewLoading');

function setStatus(message, type = '') {
  statusEl.textContent = message;
  statusEl.className = 'status' + (type ? ' ' + type : '');
}

function getOptions() {
  const margin = marginEl.value.trim() || '20mm';
  const filename = pdfFilenameEl.value.trim() || 'document.pdf';
  const base = filename.toLowerCase().endsWith('.pdf') ? filename : filename + '.pdf';
  return {
    format: formatEl.value,
    scale: Math.min(2, Math.max(0.1, parseFloat(scaleEl.value) || 2)),
    printBackground: printBackgroundEl.checked,
    margin: { top: margin, right: margin, bottom: margin, left: margin },
    diagramMaxWidth: diagramMaxWidthEl.value,
    filename: base,
  };
}

const PREVIEW_TIMEOUT_MS = 90_000;
let previewAbortController = null;

async function fetchPreview(abortSignal) {
  const markdown = markdownEl.value;
  const res = await fetch('/api/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ markdown, diagramMaxWidth: diagramMaxWidthEl.value }),
    signal: abortSignal,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || res.statusText);
  }
  const data = await res.json();
  return data.html;
}

async function updatePreview() {
  if (previewAbortController) previewAbortController.abort();
  previewAbortController = new AbortController();
  const signal = previewAbortController.signal;
  setStatus('Updating preview…', 'loading');
  previewBtn.disabled = true;
  if (previewLoadingEl) previewLoadingEl.hidden = false;
  const timeoutId = setTimeout(() => previewAbortController?.abort(), PREVIEW_TIMEOUT_MS);
  try {
    const html = await fetchPreview(signal);
    clearTimeout(timeoutId);
    previewAbortController = null;
    previewFrame.srcdoc = html;
    if (previewEmptyEl) previewEmptyEl.hidden = true;
    if (previewFrame) previewFrame.hidden = false;
    if (previewLoadingEl) previewLoadingEl.hidden = true;
    setStatus('Preview updated.', 'success');
  } catch (err) {
    clearTimeout(timeoutId);
    previewAbortController = null;
    if (previewLoadingEl) previewLoadingEl.hidden = true;
    console.error('Preview error:', err);
    const msg = err.name === 'AbortError'
      ? 'Preview timed out. Try fewer or simpler Mermaid diagrams.'
      : 'Preview failed. Check your Markdown and try again.';
    setStatus(msg, 'error');
  } finally {
    previewBtn.disabled = false;
  }
}

async function fetchPdfBlob() {
  const markdown = markdownEl.value;
  const options = getOptions();
  const res = await fetch('/api/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ markdown, options }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || res.statusText);
  }
  return { blob: await res.blob(), filename: options.filename || 'document.pdf' };
}

async function downloadPdf() {
  setStatus('Generating PDF…', 'loading');
  downloadPdfBtn.disabled = true;
  sharePdfBtn.disabled = true;
  try {
    const { blob, filename } = await fetchPdfBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setStatus('PDF downloaded.', 'success');
  } catch (err) {
    console.error('PDF error:', err);
    setStatus('PDF could not be generated. Try reducing the document size or check your Markdown.', 'error');
  } finally {
    downloadPdfBtn.disabled = false;
    sharePdfBtn.disabled = false;
  }
}

let pendingShareBlob = null;
let pendingShareFilename = null;

function doShareNow() {
  if (!pendingShareBlob || !pendingShareFilename) return;
  const blob = pendingShareBlob;
  const filename = pendingShareFilename;
  pendingShareBlob = null;
  pendingShareFilename = null;
  sharePdfBtn.textContent = 'Share (Teams, etc.)';
  sharePdfBtn.disabled = true;
  const base = ((filename || 'document').replace(/\.pdf$/i, '').trim() || 'document').replace(/[^a-zA-Z0-9._-]/g, '_');
  const safeName = base ? base + '.pdf' : 'document.pdf';
  const file = new File([blob], safeName, { type: 'application/pdf', lastModified: Date.now() });
  const shareData = {
    files: [file],
    title: safeName.replace(/\.pdf$/i, ''),
    text: 'Document converted from Markdown',
  };
  navigator.share(shareData)
    .then(() => {
      setStatus('Shared successfully.', 'success');
    })
    .catch((err) => {
      if (err.name === 'AbortError') {
        setStatus('Share cancelled.', '');
      } else {
        console.error('Share error:', err);
        setStatus(err.message || 'Sharing failed.', 'error');
      }
    })
    .finally(() => {
      sharePdfBtn.disabled = false;
      sharePdfBtn.textContent = 'Share (Teams, etc.)';
    });
}

async function sharePdf() {
  if (!navigator.share) {
    setStatus('Sharing is not supported in this browser. Use Download PDF instead.', 'error');
    return;
  }
  if (pendingShareBlob && pendingShareFilename) {
    doShareNow();
    return;
  }
  setStatus('Generating PDF…', 'loading');
  downloadPdfBtn.disabled = true;
  sharePdfBtn.disabled = true;
  sharePdfBtn.textContent = 'Generating…';
  try {
    const { blob, filename } = await fetchPdfBlob();
    if (blob.size === 0) {
      throw new Error('The generated PDF is empty. Check your Markdown content.');
    }
    const arrayBuffer = await blob.arrayBuffer();
    const materializedBlob = new Blob([arrayBuffer], { type: 'application/pdf' });
    const base = ((filename || 'document').replace(/\.pdf$/i, '').trim() || 'document').replace(/[^a-zA-Z0-9._-]/g, '_');
    const safeName = base ? base + '.pdf' : 'document.pdf';
    const shareData = {
      files: [new File([materializedBlob], safeName, { type: 'application/pdf', lastModified: Date.now() })],
      title: safeName.replace(/\.pdf$/i, ''),
      text: 'Document converted from Markdown',
    };
    if (navigator.canShare && !navigator.canShare(shareData)) {
      throw new Error('PDF cannot be shared. Use Download PDF instead.');
    }
    pendingShareBlob = materializedBlob;
    pendingShareFilename = safeName;
    sharePdfBtn.disabled = false;
    sharePdfBtn.textContent = 'Share now (Teams, etc.)';
    setStatus('PDF ready. Click "Share now" to open the share dialog.', 'success');
  } catch (err) {
    console.error('Share error:', err);
    setStatus(err.message || 'Sharing failed. Try Download PDF instead.', 'error');
    sharePdfBtn.disabled = false;
    sharePdfBtn.textContent = 'Share (Teams, etc.)';
  } finally {
    downloadPdfBtn.disabled = false;
  }
}

fileInput.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    markdownEl.value = reader.result ?? '';
    setStatus('File loaded.');
    updatePreview();
  };
  reader.readAsText(file);
  e.target.value = '';
});

loadSampleBtn.addEventListener('click', async () => {
  try {
    const res = await fetch('/sample.plan.md');
    if (!res.ok) throw new Error(res.statusText);
    markdownEl.value = await res.text();
    setStatus('Sample loaded.');
    updatePreview();
  } catch (err) {
    setStatus('Could not load sample. Run the app from project root or paste sample content manually.', 'error');
  }
});

previewBtn.addEventListener('click', updatePreview);
downloadPdfBtn.addEventListener('click', downloadPdf);
sharePdfBtn.addEventListener('click', sharePdf);

if (!navigator.share) {
  sharePdfBtn.hidden = true;
}
