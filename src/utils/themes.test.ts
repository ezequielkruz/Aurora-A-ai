import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AURORA_THEMES,
  DEFAULT_THEME_ID,
  getThemeById,
  isValidThemeId,
} from './themes.ts';

test('AURORA_THEMES exposes all 4 requested theme presets with unique IDs and swatches', () => {
  assert.equal(AURORA_THEMES.length, 4);
  const ids = new Set(AURORA_THEMES.map((t) => t.id));
  assert.equal(ids.size, 4);
  assert.ok(ids.has('acai-classico'));
  assert.ok(ids.has('uva-profunda'));
  assert.ok(ids.has('roxo-royal'));
  assert.ok(ids.has('castanho-acai'));
});

test('getThemeById and isValidThemeId resolve valid themes and fall back safely', () => {
  assert.equal(isValidThemeId('uva-profunda'), true);
  assert.equal(isValidThemeId('castanho-acai'), true);
  assert.equal(isValidThemeId('invalid-theme'), false);

  const royal = getThemeById('roxo-royal');
  assert.equal(royal.id, 'roxo-royal');
  assert.ok(royal.vars['--aurora-page-bg'].startsWith('#'));

  const fallback = getThemeById('unknown' as never);
  assert.equal(fallback.id, DEFAULT_THEME_ID);
});

test('all themes avoid pure #FFFFFF for card surfaces and match preview swatches', () => {
  for (const theme of AURORA_THEMES) {
    assert.notEqual(theme.swatches.card.toUpperCase(), '#FFFFFF');
    assert.notEqual(theme.vars['--aurora-card-bg'].toUpperCase(), '#FFFFFF');
    assert.equal(theme.swatches.card, theme.vars['--aurora-card-bg']);
    assert.equal(theme.swatches.page, theme.vars['--aurora-page-bg']);
    assert.equal(theme.swatches.sidebar, theme.vars['--aurora-sidebar-bg']);
  }

  assert.equal(getThemeById('uva-profunda').vars['--aurora-card-bg'], '#F3EBF6');
  assert.equal(getThemeById('roxo-royal').vars['--aurora-card-bg'], '#F4EFF7');
  assert.equal(getThemeById('castanho-acai').vars['--aurora-card-bg'], '#FBF8F5');
});
