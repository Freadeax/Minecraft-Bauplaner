import test from 'node:test';
import assert from 'node:assert/strict';
import { THEME_IDS, DEFAULT_THEME, normalizeTheme, normalizeAppearance, resolveAppearance, themeTokens, contrastRatio } from '../apps/web/src/theme/themeTokens.mjs';
test('unknown themes fall back safely',()=>{ assert.equal(normalizeTheme('__proto__'),DEFAULT_THEME);assert.equal(normalizeTheme(null),DEFAULT_THEME); });
test('all five themes provide legible dark foregrounds',()=>{for(const id of THEME_IDS){const t=themeTokens(id);assert.equal(t.id,id);assert.ok(contrastRatio(t.colors.text,t.colors.surface)>=4.5,id);assert.ok(Object.isFrozen(t.colors));}});
test('appearance follows explicit choice or system preference',()=>{assert.equal(resolveAppearance('system',false),'light');assert.equal(resolveAppearance('system',true),'dark');assert.equal(resolveAppearance('light',true),'light');assert.equal(normalizeAppearance('invalid'),'system');});
test('light palette meets contrast threshold',()=>{const t=themeTokens('nether','light');assert.ok(contrastRatio(t.colors.text,t.colors.surface)>=4.5);});
test('theme tokens do not share mutable objects',()=>{const a=themeTokens('modern'),b=themeTokens('modern');assert.notEqual(a,b);assert.notEqual(a.colors,b.colors);});
