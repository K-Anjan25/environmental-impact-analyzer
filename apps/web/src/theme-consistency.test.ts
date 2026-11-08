import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) =>
  readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8');

const solar = read('./solarpunk-theme.css');
const legacyLayers = [
  read('./styles.css'),
  read('./neo-theme.css'),
  read('./marketing/marketing.css'),
  read('./marketing/neo.css'),
  read('../scripts/build-legal-pages.mjs'),
].join('\n');

describe('shared Solarpunk visual system', () => {
  it('keeps the core palette and landing page footer aligned', () => {
    expect(solar).toContain('--solar-bg: #FBFBF9;');
    expect(solar).toContain('--solar-forest: #1B4332;');
    expect(solar).toContain('--solar-emerald: #2D6A4F;');
    expect(solar).toContain('--solar-gold: #FFB703;');
    expect(solar).toContain('html body:has(.nb-home) .landing-footer');
    expect(solar).toContain('background: var(--solar-bg) !important');
    expect(solar).toContain('border-top: 1px solid var(--solar-line) !important;');
    expect(solar).toContain('body .landing-footer a { color: var(--solar-emerald) !important; }');
    expect(legacyLayers).not.toMatch(/(?:^|})[^{}]*\.landing-footer[^{}]*\{[^}]*background:\s*var\(--solar-forest\)/s);
  });

  it('does not reintroduce the retired purple, neon-yellow, or black-brutalist palette', () => {
    expect(legacyLayers).not.toMatch(/#(?:000(?:000)?|F7F1FF|EEE3FF|FFE15A|F46DBD|C8A2F3|F7F9E1|E0475F)\b/i);
  });

  it('rounds standard actions while retaining intentional circular controls', () => {
    expect(solar).toContain('border-radius: 16px !important;');
    expect(solar).toMatch(/body \.post-pages button,\s*body \.to-top,\s*body \.calc-remove \{ border-radius: 50% !important; \}/);
  });
});
