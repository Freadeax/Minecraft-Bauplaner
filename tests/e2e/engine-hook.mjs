// Block 5 (06.11.2026): run the unchanged browser suite in another engine.
// `node --import ./tests/e2e/engine-hook.mjs --test ...` with BAUPLANER_ENGINE=firefox|webkit
// routes every `chromium.launch()` of the tests to that engine. Without the
// variable (or with "chromium") nothing changes.
import { createRequire } from 'node:module';

const engine = (process.env.BAUPLANER_ENGINE || 'chromium').toLowerCase();
if (!['chromium', 'firefox', 'webkit'].includes(engine)) throw new Error(`BAUPLANER_ENGINE unbekannt: ${engine}`);
if (engine !== 'chromium') {
  const pw = createRequire(import.meta.url)('playwright');
  const target = pw[engine];
  pw.chromium.launch = (options = {}) => {
    // Chromium-only switches (e.g. --use-gl) would break other engines.
    const { args, ...rest } = options;
    if (engine === 'firefox') {
      // Headless Firefox switches WebGL off without a GPU; the software path is what the tests need.
      // Headless Firefox has no WebGL at all; with a display (xvfb-run) it uses llvmpipe.
      if (process.env.DISPLAY) rest.headless = false;
      rest.firefoxUserPrefs = { 'webgl.force-enabled': true, 'webgl.disabled': false, 'webgl.enable-webgl2': true, ...(rest.firefoxUserPrefs || {}) };
    }
    return target.launch(rest);
  };
  pw.chromium.name = () => engine;
}
