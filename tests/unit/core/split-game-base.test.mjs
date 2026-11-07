// SPLIT-01-S05/S06: eine Basis, die das echte Spiel (Minecraft 26.3, scripts/size/test_grossbau_ingame.sh) in Gelände mit
// festem Seed gebaut und die Mod mit GET /v1/box aufgenommen hat, geht durch „Gebäude herauslösen“: drei Häuser, Keller
// beim Haus darüber, Bunker als unterirdischer Raum, Brücke zwischen zwei Häusern, Felder, Gehege, Wege; aufgeteilt
// steht jeder Block am alten Platz.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { importLitematic } from '../../../dist/formats/src/index.js';
import { checkBase } from '../../../scripts/size/basis_check.mjs';

test('Basis aus dem echten Spiel: Herauslösen erkennt Häuser, Keller, Bunker, Brücke, Felder und Wege', async () => {
  const bytes = readFileSync(new URL('../../../fixtures/litematic/basis-aus-dem-spiel.litematic', import.meta.url));
  const { payload } = await importLitematic(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  const r = await checkBase(payload);
  assert.deepEqual(r.problems, []);
  assert.ok(r.sourceBlocks > 100_000, `${r.sourceBlocks} Blöcke`);
  assert.equal(r.placedBlocks, r.sourceBlocks);
  assert.equal(r.conflicts, 0);
});
