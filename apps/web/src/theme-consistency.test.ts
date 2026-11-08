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
    expect(`${solar}\n${legacyLayers}`).not.toContain('--nb-warm-soft: #F5E8E3;');
    expect(legacyLayers).not.toContain('landing-footer a:hover {\n  transform: translateY(-2px);');
  });

  it('does not reintroduce the retired purple, neon-yellow, or black-brutalist palette', () => {
    expect(legacyLayers).not.toMatch(/#(?:000(?:000)?|F7F1FF|EEE3FF|FFE15A|F46DBD|C8A2F3|F7F9E1|E0475F)\b/i);
  });

  it('uses a shared shape scale for surfaces, controls, and fields while preserving circles and pills', () => {
    expect(solar).toContain('--radius-field: 12px;');
    expect(solar).toContain('--radius-nested: 14px;');
    expect(solar).toContain('--radius-control: 16px;');
    expect(solar).toContain('--radius-card: 20px;');
    expect(solar).toContain('--radius-feature: 24px;');
    expect(solar).toContain('border-radius: var(--radius-control) !important;');
    expect(solar).toContain('border-radius: var(--radius-card) !important;');
    expect(solar).toContain('border-radius: var(--radius-field) !important;');
    expect(solar).toContain('border-radius: var(--radius-nested) !important;');
    expect(solar).toContain('border-radius: var(--radius-pill) !important;');
    expect(solar).toContain('border-radius: 50% !important;');
  });
});
