// Shared start waiter for the browser tests (03.11.2026). The first start of a
// fresh browser builds the shipped catalogue in the worker (several seconds,
// more on a slow machine); afterwards the cache makes it fast. Tests wait for
// the start screen with this generous limit instead of the 10 s default, so a
// larger catalogue does not break unrelated tests.
export const START_TIMEOUT = 90_000;
const SAMPLE = 'Beispielprojekt „Burgmauer“';

/** Waits until the start screen offers the sample project (library seeded and loaded). */
export async function waitForStart(page, timeout = START_TIMEOUT) {
  await page.getByRole('button', { name: SAMPLE }).waitFor({ timeout });
}

/** Waits for the start screen, then opens the sample project „Burgmauer“. */
export async function openSampleProject(page, timeout = START_TIMEOUT) {
  await waitForStart(page, timeout);
  await page.getByRole('button', { name: SAMPLE }).click();
}
