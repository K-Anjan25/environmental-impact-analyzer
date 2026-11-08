import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const webDirectory = resolve(scriptDirectory, '..');
const repositoryDirectory = resolve(webDirectory, '../..');
const outputDirectory = resolve(webDirectory, 'public/legal');

const escapeHtml = (value) => value.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
})[character]);

const renderer = new marked.Renderer();
renderer.html = ({ text }) => escapeHtml(text);

const pageLinks = {
  'PRIVACY.md': '/legal/privacy.html',
  'TERMS.md': '/legal/terms.html',
  'data-sources.md': '/legal/data-sources.html',
  'services/api/data/carbonfact-v1.1.0/SOURCE.md': '/legal/source-record.html',
  'services/api/data/carbonfact-v1.1.0/datasets/sources/SOURCE-RECORD.md': '/legal/supplementary-sources.html',
  '../../SOURCE.md': '/legal/source-record.html',
  '../../../../../../data-sources.md': '/legal/data-sources.html',
};

function rewriteDocumentLinks(html, sourcePath) {
  const links = { ...pageLinks };
  for (const [target, destination] of Object.entries(links)) {
    html = html.replaceAll(`href="${target}"`, `href="${destination}"`);
  }
  return html;
}

function wrapPage(title, content) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
  <title>${escapeHtml(title)} · EcoImpact Lab</title>
  <style>
    :root {
      color-scheme: light;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
      color: #24332B;
      background: #FBFBF9;
      --forest: #1B4332;
      --emerald: #2D6A4F;
      --gold: #FFB703;
      --line: #D8E4DB;
      --surface-soft: #F2F7F2;
      --shadow: 0 12px 32px rgba(27, 67, 50, 0.075);
    }
    * { box-sizing: border-box; }
    body { margin: 0; padding: clamp(12px, 4vw, 48px); background: #FBFBF9; }
    main { max-width: 900px; margin: 0 auto; padding: clamp(20px, 4vw, 40px); background: #FFFFFF; border: 1px solid var(--line); border-radius: 20px; box-shadow: var(--shadow); }
    nav { display: flex; flex-wrap: wrap; gap: 8px; padding-bottom: 18px; border-bottom: 1px solid var(--line); font-size: 14px; }
    nav a, a { color: var(--emerald); text-underline-offset: 3px; }
    nav a { padding: 7px 12px; border: 1px solid var(--line); border-radius: 999px; background: #FFFFFF; font-weight: 650; text-decoration: none; }
    nav a:hover { background: #FFF5D7; color: var(--forest); }
    :focus-visible { outline: 3px solid var(--forest); outline-offset: 3px; }
    h1, h2, h3 { color: var(--forest); line-height: 1.2; font-weight: 750; }
    h1 { margin-top: 24px; font-size: clamp(28px, 5vw, 42px); letter-spacing: -.035em; }
    h2 { margin-top: 32px; padding-top: 12px; border-top: 1px solid var(--line); font-size: 22px; }
    h3 { margin-top: 24px; font-size: 17px; }
    p, li { max-width: 72ch; line-height: 1.65; }
    li + li { margin-top: 6px; }
    blockquote { margin-left: 0; padding: 10px 16px; border-left: 4px solid var(--emerald); border-radius: 0 12px 12px 0; background: var(--surface-soft); }
    pre { overflow-x: auto; padding: 16px; background: var(--surface-soft); border: 1px solid var(--line); border-radius: 12px; white-space: pre-wrap; overflow-wrap: anywhere; font: 13px/1.6 ui-monospace, SFMono-Regular, Consolas, monospace; }
    table { display: block; max-width: 100%; overflow-x: auto; border-collapse: collapse; }
    th, td { padding: 8px 10px; border: 1px solid var(--line); text-align: left; }
    th { background: #E7F2EA; color: var(--forest); }
    footer { margin-top: 34px; padding: 14px 16px; border-top: 1px solid rgba(255, 255, 255, 0.14); border-radius: 12px; background: var(--forest); color: #FFFFFF; font-size: 12px; }
    @media (max-width: 560px) { body { padding: 10px; } main { padding: 20px 16px; } }
  </style>
</head>
<body>
  <main>
    <nav aria-label="Site and legal navigation">
      <a href="/">Calculator</a>
      <a href="/legal/privacy.html">Privacy</a>
      <a href="/legal/terms.html">Terms</a>
      <a href="/legal/data-sources.html">Data sources</a>
    </nav>
    ${content}
    <footer>EcoImpact Lab · Open-data process estimates</footer>
  </main>
</body>
</html>
`;
}

await mkdir(outputDirectory, { recursive: true });

const markdownPages = [
  { source: 'PRIVACY.md', output: 'privacy.html', title: 'Privacy notice' },
  { source: 'TERMS.md', output: 'terms.html', title: 'Terms of use' },
  { source: 'data-sources.md', output: 'data-sources.html', title: 'Data sources and scope' },
  { source: 'services/api/data/carbonfact-v1.1.0/datasets/sources/SOURCE-RECORD.md', output: 'supplementary-sources.html', title: 'Supplementary source record' },
  {
    source: 'services/api/data/carbonfact-v1.1.0/SOURCE.md',
    output: 'source-record.html',
    title: 'Carbonfact source record',
  },
];

for (const page of markdownPages) {
  const sourcePath = resolve(repositoryDirectory, page.source);
  const markdown = await readFile(sourcePath, 'utf8');
  const parsed = await marked.parse(markdown, { gfm: true, renderer });
  const content = rewriteDocumentLinks(parsed, page.source);
  await writeFile(resolve(outputDirectory, page.output), wrapPage(page.title, content));
}

