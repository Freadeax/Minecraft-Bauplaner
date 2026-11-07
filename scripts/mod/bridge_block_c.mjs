// Block C of the test phase (07.11.2026): judges what the Fabric game test's AbnahmeScenario saw in the real
// Minecraft 26.3 client (abnahme-c.json, wiederbetreten.json, offline.json, game.log). Called by
// scripts/mod/bridge_gametest.mjs verify; every assertion names the test-phase case it proves.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const read = (dir, name) => JSON.parse(readFileSync(join(dir, name), 'utf8'));
const add = (p, d) => [p.x + d[0], p.z + d[1]];

/** Log text between two `[Abnahme] <step>` marks (the next mark when `to` is left out). */
function between(log, from, to) {
  const a = log.indexOf(`[Abnahme] ${from}\n`);
  assert.ok(a >= 0, `Marke „${from}“ fehlt im Spielprotokoll`);
  const rest = log.slice(a + from.length + 11);
  const b = to ? rest.indexOf(`[Abnahme] ${to}\n`) : rest.indexOf('[Abnahme] ');
  return b < 0 ? rest : rest.slice(0, b);
}

export async function verifyBlockC(dir) {
  if (!existsSync(join(dir, 'abnahme-c.json'))) return;
  const log = readFileSync(join(dir, 'game.log'), 'utf8');
  const c = read(dir, 'abnahme-c.json');
  const done = [];

  // MOD-29: one name everywhere.
  assert.equal(c.category, 'Build Studio', 'MOD-29: Tastengruppe in Optionen → Steuerung');
  assert.equal(c.keysInCategory, c.keyCount, 'MOD-29: alle Tasten der Mod in der Gruppe „Build Studio“');
  assert.equal(c.modName, 'LMNT — Build Studio Bridge', 'MOD-29: Name in der Modliste des Launchers');
  assert.match(c.menuTitle, /Build Studio/, `MOD-29: Menütitel (${c.menuTitle})`);
  done.push(`MOD-29 (${c.keyCount} Tasten in „Build Studio“, Menü „${c.menuTitle}“)`);

  // MOD-02: every key moves the plan as the help says.
  const k = c.keys, s = k.start;
  assert.deepEqual(add(k.up, [0, 0]), add(s, k.facing), 'MOD-02: Pfeil hoch schiebt in Blickrichtung');
  assert.deepEqual([k.down.x, k.down.z], [s.x, s.z], 'MOD-02: Pfeil runter zurück');
  assert.deepEqual([k.right.x, k.right.z], add(s, k.side), 'MOD-02: Pfeil rechts');
  assert.deepEqual([k.left.x, k.left.z], [s.x, s.z], 'MOD-02: Pfeil links zurück');
  assert.equal(k.pageUp.y, s.y + 1, 'MOD-02: Bild↑ hebt um einen Block');
  assert.equal(k.pageDown.y, s.y, 'MOD-02: Bild↓ senkt wieder');
  assert.equal(k.end.turns, (s.turns + 1) % 4, 'MOD-02: Ende dreht um 90°');
  assert.equal(k.insert.mirror, !s.mirror, 'MOD-02: Einfg spiegelt');
  assert.equal(k.insert2.mirror, s.mirror, 'MOD-02: Einfg ein zweites Mal hebt das Spiegeln auf');
  assert.equal(k.end4.turns, s.turns, 'MOD-02: viermal Ende = Ausgangslage');
  assert.deepEqual([k.home.x, k.home.y, k.home.z], k.lookedAt, 'MOD-02: Pos1 setzt den Plan auf den angeschauten Block');
  const w = read(dir, 'wiederbetreten.json');
  assert.equal(w.active, true, 'MOD-02: nach dem Wiederbetreten ist der Plan eingeblendet');
  assert.equal(w.planFile, 'spieltest.schem', 'MOD-02: derselbe Plan nach dem Wiederbetreten');
  assert.deepEqual(w.placement, w.before, 'MOD-02: Lage nach dem Wiederbetreten unverändert');
  done.push('MOD-02 (alle Tasten, Lage nach Welt verlassen/betreten)');

  // MOD-04: orientation, finder, materials with shulker boxes, section end once.
  assert.match(c.logPlanned, /oak_log\[axis=y\]/, 'MOD-04: geplanter Stamm steht');
  assert.equal(c.logVerdict, 'STATE', 'MOD-04: liegender Stamm = falsch ausgerichtet (gelb), nicht falscher Block');
  assert.ok(c.counts.STATE >= 1 && c.counts.WRONG >= 1, `MOD-04: Zähler falsch/Zustand ${JSON.stringify(c.counts)}`);
  assert.ok(c.finder.target >= 0 && ['WRONG', 'MISSING', 'STATE'].includes(c.finder.verdict), `MOD-04: Punkt markiert einen Fehler (${JSON.stringify(c.finder)})`);
  const pack = text => {
    const head = text.match(/\[Build Studio\] Packliste[^:]*: (\d+) Blöcke holen = (\d+) Stapel/);
    const line = text.match(/\[Build Studio\] +Stone Bricks: (\d+) \((\d+) Stapel(?:, dabei (\d+))?\)/);
    return { fetch: Number(head?.[1] ?? -1), stacks: Number(head?.[2] ?? -1), bricks: Number(line?.[1] ?? 0), bricksStacks: Number(line?.[2] ?? 0), carried: Number(line?.[3] ?? 0), head: head?.[0] };
  };
  const m = c.materials;
  assert.ok(m.openStoneBricks > 3, `MOD-17: genug offene Steinziegel für den Test (${m.openStoneBricks})`);
  assert.equal(m.carried, 67, 'MOD-04: Inventar zählt 3 lose + 64 in der Shulkerkiste');
  const empty = pack(between(log, 'packliste-leer')), full = pack(between(log, 'packliste-shulker'));
  assert.ok(empty.head && full.head, 'MOD-17: Packliste im Chat');
  assert.equal(empty.bricks, m.openStoneBricks, 'MOD-17: ohne Inventar sind alle offenen Steinziegel zu holen');
  assert.equal(empty.bricksStacks, Math.ceil(m.openStoneBricks / 64), 'MOD-17: Stapel zu 64');
  const expectFetch = Math.max(0, m.openStoneBricks - 67);
  assert.equal(full.bricks, expectFetch, `MOD-17: Packliste zieht getragene Steinziegel samt Shulkerkiste ab (${full.bricks})`);
  if (expectFetch > 0) assert.equal(full.carried, 67, 'MOD-17: „dabei 67“');
  assert.equal(full.fetch, empty.fetch - Math.min(67, m.openStoneBricks), 'MOD-17: Gesamtzahl sinkt um das Getragene');
  assert.equal(m.screen, 'MaterialScreen', 'MOD-04: Num 7 öffnet die Materialliste');
  assert.ok(c.towerOpenBefore >= 1, 'MOD-04: im Turm war etwas offen');
  assert.equal(c.towerOpenAfter, 0, 'MOD-04: Turm fertig gebaut');
  const finished = [...between(log, 'abschnitt-turm', 'abschnitt-turm-ende').matchAll(/\[Build Studio\] Abschnitt „Turm“ fertig\.(.*)/g)];
  assert.equal(finished.length, 1, `MOD-04: genau eine Meldung am Abschnittsende (${finished.length})`);
  assert.match(finished[0][1], /Weiter mit „Mauer“: \/bauplaner abschnitt 2/, 'MOD-04: Meldung nennt den nächsten Abschnitt');
  done.push(`MOD-04 (gelb bei falscher Ausrichtung, Punkt-Taste, Materialliste, Abschnittsende 1×)`);

  // MOD-06 keys.
  const l = c.layers;
  // Num 6 jumps to the lowest open layer (the layer number shown with ALL is only where the pointer last stood).
  assert.equal(l.start.split(' ')[0], 'ALL');
  assert.match(l.num6, /^ONE -?\d+$/, 'MOD-06: Num 6 → nur eine Ebene');
  const ly = Number(l.num6.split(' ')[1]);
  assert.equal(l.num9, `ONE ${ly + 1}`, 'MOD-06: Num 9 → Ebene höher');
  assert.equal(l.numMul, `ONE ${ly}`, 'MOD-06: Num * → Ebene tiefer');
  assert.deepEqual(l.finderLayer, [ly, ly], 'MOD-06: Fehlersuche gilt nur für die Ebene');
  assert.equal(l.num6b.split(' ')[0], 'BELOW', 'MOD-06: Num 6 → bis Ebene');
  assert.equal(l.num6c.split(' ')[0], 'ALL', 'MOD-06: Num 6 → alle Ebenen');
  assert.equal(l.section0, 0); assert.equal(l.numSlash1, 1, 'MOD-06: Num / → Abschnitt 1'); assert.equal(l.numSlash2, 2, 'MOD-06: Num / → Abschnitt 2');
  assert.equal(l.numSlash3, 0, 'MOD-06: Num / nach dem letzten Abschnitt → alle');
  assert.equal(l.xrayOn, true, 'MOD-06: Num - schaltet die Röntgensicht an'); assert.equal(l.xrayOff, false, 'MOD-06: Num - wieder aus');
  assert.equal(l.texturedAfter, false, 'MOD-06: /bauplaner texturen → farbige Kästen'); assert.equal(l.texturedBack, true);
  done.push('MOD-06 (Num 6/9/*/÷/-, Texturen)');

  // MOD-07.
  const h = c.helper;
  assert.equal(h.warnBlock, 'minecraft:dirt', `MOD-07: „warnen“ lässt den falschen Block zu (${h.warnResult})`);
  assert.match(between(log, 'warnen', 'aus'), /\[Platzierhilfe\] Hier gehört Stone Bricks hin/, 'MOD-07: „warnen“ zeigt einen Hinweis');
  assert.equal(h.offBlock, 'minecraft:dirt', 'MOD-07: „aus“ lässt den falschen Block zu');
  assert.doesNotMatch(between(log, 'aus', 'aus-ende'), /\[Platzierhilfe\]/, 'MOD-07: „aus“ sagt nichts');
  assert.equal(h.pickSlot, 3, 'MOD-07: Num 8 nimmt den Planblock (Steinziegel in Platz 4) in die Hand');
  assert.match(h.chestScreen, /ContainerScreen/, `MOD-07: Kiste im Plan lässt sich öffnen (${h.chestScreen})`);
  assert.match(h.button, /powered=true/, `MOD-07: Knopf im Plan lässt sich drücken (${h.button})`);
  assert.match(h.door, /open=true/, `MOD-07: Tür im Plan lässt sich öffnen (${h.door})`);
  assert.equal(h.rightBlock, 'minecraft:stone_bricks', 'MOD-07: der richtige Block wird gesetzt');
  const sc = c.scaffold;
  assert.equal(sc.airPlanned ?? null, null, 'MOD-07: Gerüstplatz ist im Plan Luft');
  assert.match(sc.scaffoldBlock, /^minecraft:scaffolding/, `MOD-07: Gerüst auf geplanter Luft gesetzt (${sc.scaffoldResult})`);
  done.push('MOD-07 (an/warnen/aus, Num 8, Kiste/Knopf/Tür, Gerüst)');

  // MOD-17 scaffold hints: the mod's count equals our own count of blocks without any neighbour.
  const scaffoldCount = text => { const x = text.match(/\[Build Studio\] Gerüst nötig: (\d+) Blöcke ohne Nachbarn/); return x ? Number(x[1]) : /Gerüst: kein offener Block/.test(text) ? 0 : -1; };
  const g1 = scaffoldCount(between(log, 'geruest-1', 'geruest-2')), g2 = scaffoldCount(between(log, 'geruest-2', 'geruest-luft'));
  const gAir = scaffoldCount(between(log, 'geruest-luft', 'geruest-stuetze')), gSupport = scaffoldCount(between(log, 'geruest-stuetze'));
  // Torn-down wall: everything grows from the standing base, so no false alarm.
  assert.equal(g1, sc.hangingBefore, `MOD-17: abgerissene Mauer – Gerüst wie selbst gezählt (${g1} statt ${sc.hangingBefore})`);
  assert.equal(g2, sc.hangingAfter, `MOD-17: nach der ersten Lage (${sc.layerBuilt} Blöcke) wieder genau (${g2} statt ${sc.hangingAfter})`);
  // Plan in the air: everything hangs; one support block below the lowest cell, then only what is not connected.
  assert.ok(sc.airTotal > 0 && sc.hangingAir === sc.airTotal, `MOD-17: Plan in der Luft – alle ${sc.airTotal} Blöcke hängen (${sc.hangingAir})`);
  assert.equal(gAir, sc.hangingAir, `MOD-17: Gerüst nennt in der Luft genau die hängenden Blöcke (${gAir} statt ${sc.hangingAir})`);
  assert.ok(sc.hangingSupported < sc.hangingAir, `MOD-17: Stützblock verbindet (${sc.hangingSupported})`);
  assert.equal(gSupport, sc.hangingSupported, `MOD-17: mit Stützblock wieder genau (${gSupport} statt ${sc.hangingSupported})`);
  done.push(`MOD-17 (Packliste mit Shulkerkiste, Gerüst: abgerissen ${g1}, in der Luft ${gAir} → mit Stütze ${gSupport})`);

  // MOD-21 groups and locks.
  const gr = c.groups;
  // The game test keeps HTTP answers as JSON text.
  for (const k of ['marks', 'status', 'cleared']) if (typeof gr[k] === 'string') gr[k] = JSON.parse(gr[k]);
  assert.equal(gr.marks.status, 200, JSON.stringify(gr.marks.body));
  assert.equal(gr.all.group, 'alle');
  assert.ok(gr.all.locked > 0 && gr.all.lockedTower === true, `MOD-21: Turm im gesperrten Bauplatz (${JSON.stringify(gr.all)})`);
  assert.equal(gr.hof.group, 'Hof', 'MOD-21: /bauplaner gruppe Hof');
  assert.equal(gr.hof.towerShown, 0, 'MOD-21: mit Gruppe „Hof“ zeigt das Hologramm nur deren Fläche');
  assert.ok(gr.hof.shown > 0 && gr.hof.shown < gr.all.shown, 'MOD-21: Gruppe zeigt einen Teil');
  assert.match(between(log, 'gruppe-liste', 'gruppe-packliste'), /Weltplan-Gruppen \(2\), Hologramm: alle, \d+ Planblöcke gesperrt/, 'MOD-21: Gruppenliste nennt gesperrte Blöcke');
  assert.match(between(log, 'gruppe-packliste'), /Packliste \(gezeigter Teil\)|Packliste: nichts offen im gezeigten Teil/, 'MOD-21: Packliste nur für die Gruppe');
  assert.equal(gr.hofHidden.shown, gr.all.shown - gr.hof.shown, 'MOD-21: gruppe aus Hof blendet die Gruppe aus, der Rest bleibt');
  assert.equal(gr.hofHidden.towerShown, gr.all.towerShown, 'MOD-21: der Turm bleibt sichtbar');
  assert.equal(gr.hofShownAgain.shown, gr.all.shown, 'MOD-21: gruppe an Hof blendet sie wieder ein');
  assert.equal(gr.allAgain.group, 'alle'); assert.equal(gr.allAgain.shown, gr.all.shown, 'MOD-21: gruppe alle zeigt wieder alles');
  assert.ok(gr.menu.length >= 2 && gr.menu.every(x => x.includes('->')), `MOD-21: Menüzeile „Gruppe“ (${gr.menu})`);
  const menuTargets = gr.menu.map(x => x.split('-> ')[1]);
  assert.ok(new Set(menuTargets).size >= 2, `MOD-21: Menüzeile schaltet die Gruppen durch (${menuTargets})`);
  assert.equal(gr.lockedBlock, 'minecraft:dirt', 'MOD-21: im gesperrten Bereich ruht die Platzierhilfe');
  assert.doesNotMatch(between(log, 'gesperrt', 'gesperrt-ende'), /\[Platzierhilfe\] (Hier gehört|Richtigen Block|Nicht gesetzt)/, 'MOD-21: kein Eingriff der Platzierhilfe im gesperrten Bereich');
  assert.ok(gr.finder.length === 0 || gr.finder[0] > 3, `MOD-21: Fehlersucher springt nicht in den gesperrten Turm (${gr.finder})`);
  assert.equal(gr.status.status, 200);
  assert.ok(gr.status.body.hologram.locked > 0, 'MOD-21: Planer bekommt die Zahl gesperrter Blöcke');
  done.push(`MOD-21 (Gruppe Hof ${gr.hof.shown}/${gr.all.shown} Blöcke, ${gr.all.locked} gesperrt, Menüzeile, Platzierhilfe ruht)`);

  // MOD-09 / LIVE-06.
  const kb = c.keyBinding;
  assert.equal(kb.kOpens, 'PlanScreen', 'MOD-09: umbelegte Taste K öffnet das Planmenü');
  assert.equal(kb.jOpens, 'keiner', 'MOD-09: J tut nach dem Umbelegen nichts mehr');
  assert.equal(kb.optionsLine, 'key_key.bauplaner_bridge.menu:key.keyboard.k', 'MOD-09: Belegung steht in options.txt (bleibt nach Neustart)');
  assert.equal(kb.optionsLineBack, 'key_key.bauplaner_bridge.menu:key.keyboard.j', 'MOD-09: zurückgesetzt auf J');
  const clash = readFileSync(join(dir, 'diagnose-konflikt.txt'), 'utf8'), ok = readFileSync(join(dir, 'diagnose-ok.txt'), 'utf8');
  assert.match(clash, /KONFLIKT mit/, 'MOD-09: Diagnose meldet die doppelte Belegung');
  assert.doesNotMatch(ok, /KONFLIKT/, 'MOD-09: ohne doppelte Belegung kein Konflikt');
  assert.match(ok, /Konflikte gesamt\D+0\b/, 'MOD-09: Konflikte gesamt 0');
  // Headless weston has no clipboard: SDL hands back "" there. Where the system has one, it must hold the report.
  const clipboard = kb.clipboard !== '' || kb.clipboardClash !== '';
  if (clipboard) {
    assert.equal(kb.clipboardClash, clash, 'LIVE-06: Bericht liegt in der Zwischenablage');
    assert.equal(kb.clipboard, ok, 'LIVE-06: Zwischenablage = Datei');
  }
  for (const needle of ['Version', 'Loader', 'Mods', 'Tasten', 'Plan eingeblendet']) assert.ok(ok.includes(needle), `LIVE-06: Bericht nennt „${needle}“`);
  // The message tells the truth about the clipboard (fixed 07.11.: it said „kopiert“ although the system refused).
  assert.match(log, clipboard ? /Diagnose gespeichert: bauplaner\/diagnose\/diagnose-[^ ]+\.txt und in die Zwischenablage kopiert\./
    : /Diagnose gespeichert: bauplaner\/diagnose\/diagnose-[^ ]+\.txt – die Zwischenablage ging nicht, bitte die Datei anhängen\./, 'LIVE-06: Meldung nennt Datei und ob die Zwischenablage ging');
  assert.equal(w.menuKey, 'key.keyboard.j', 'MOD-09: Belegung auch nach dem Wiederbetreten');
  done.push(`MOD-09 (Taste umbelegt, options.txt, Konflikt in der Diagnose), LIVE-06 (Bericht${clipboard ? ' = Zwischenablage' : ', ohne Zwischenablage im kopflosen Bildschirm'})`);

  // LINK-09: offline and back, nothing lost, nothing twice.
  if (existsSync(join(dir, 'offline.json'))) done.push(await offline(dir, log));
  console.log(`Block C (Abnahmen im Spiel) bestanden: ${done.join('; ')}.`);
}

async function offline(dir, log) {
  const o = read(dir, 'offline.json');
  // HTTP answers recorded as JSON text in the game test.
  for (const [k, v] of Object.entries(o)) if (typeof v === 'string' && v.startsWith('{')) o[k] = JSON.parse(v);
  const body = x => x.body;
  assert.equal(o.chestEvent.status, 200, `LINK-09: Teamkiste im Raum (${JSON.stringify(o.chestEvent.body)})`);
  assert.equal(body(o.before).pendingReports, 0, 'LINK-09: vor dem Trennen wartet nichts');
  assert.ok(!['live', 'poll'].includes(body(o.cut).status), `LINK-09: nach dem Trennen nicht mehr live (${body(o.cut).status})`);
  const off = body(o.offline);
  assert.ok(off.pendingReports >= 3, `LINK-09: offline warten Messungen beider Abschnitte und der Kiste (${off.pendingReports})`);
  assert.ok(off.waiting >= 1, `LINK-09: die Übernahme von Abschnitt 1 wartet (${off.waiting})`);
  assert.match(o.statusLine, /Meldungen warten/, `LINK-09: Mod zeigt „Meldungen warten“ (${o.statusLine})`);
  assert.match(o.statusLine, /zeigt den Stand von/, 'LINK-09: Mod zeigt den gemerkten Teamstand weiter');
  assert.equal(o.chestScreen.includes('ContainerScreen'), true, 'LINK-09: Teamkiste offline geöffnet');
  const rej = body(o.rejoined);
  assert.ok(rej.pendingReports >= off.pendingReports, `LINK-09: nach dem Wiederbetreten offline noch alles gemerkt (${rej.pendingReports})`);
  const back = body(o.back);
  assert.ok(['live', 'poll'].includes(back.status), `LINK-09: wieder live (${back.status})`);
  assert.equal(back.pendingReports, 0, 'LINK-09: „Meldungen warten“ auf 0');
  assert.equal(back.waiting, 0, 'LINK-09: Übernahme nachgereicht');
  assert.match(between(log, 'netz-zurueck', 'netz-zurueck-ende'), /gemerkte Messung(en)? aus der Offline-Zeit nachgereicht/, 'LINK-09: Meldung „… nachgereicht“');
  // The room itself: every own measurement exactly once, the claim once, the fold says „laut Spiel“.
  const room = JSON.parse(readFileSync(join(dir, 'room.json'), 'utf8'));
  const url = readFileSync(join(dir, 'room-direct'), 'utf8').trim().replace(/\/+$/, '');
  const events = [];
  for (let after = ''; ;) {
    const r = await fetch(`${url}/v1/rooms/${room.room}/events?after=${encodeURIComponent(after)}`, { headers: { Authorization: `Bearer ${room.adminKey}` } });
    assert.equal(r.status, 200, `Team-Raum lesbar (${r.status})`);
    const page = await r.json();
    events.push(...page.events);
    after = page.cursor;
    if (!page.more) break;
  }
  const ids = events.map(e => e.id);
  assert.equal(new Set(ids).size, ids.length, 'LINK-09: kein Ereignis doppelt im Raum');
  const cutAt = Date.parse(readFileSync(join(dir, 'offline-cut-at'), 'utf8').trim());
  const mine = events.filter(e => e.by === 'mem_tom' && Date.parse(e.at) >= cutAt);
  const seen = kind => mine.filter(e => e.kind === kind);
  const sections = new Set(seen('section.seen').map(e => e.section));
  assert.ok(sections.has('sec_turm') && sections.has('sec_mauer'), `LINK-09: Messungen beider Abschnitte aus der Offline-Zeit im Raum (${[...sections]})`);
  for (const sec of sections) assert.equal(seen('section.seen').filter(e => e.section === sec).length, 1, `LINK-09: ${sec} genau einmal gemessen`);
  const chest = seen('store.seen').filter(e => e.chest === 'kiste_spieltest');
  assert.equal(chest.length, 1, `LINK-09: Teamkiste genau einmal „laut Spiel“ (${chest.length})`);
  assert.deepEqual(Object.fromEntries(chest[0].items.map(i => [i.item, i.count])), { 'minecraft:stone_bricks': 20, 'minecraft:oak_log': 7 }, 'LINK-09: Kisteninhalt stimmt');
  const claims = events.filter(e => e.kind === 'section.claim' && e.section === 'sec_turm' && e.by === 'mem_tom');
  assert.equal(claims.length, 1, 'LINK-09: Übernahme von Abschnitt 1 genau einmal im Raum');
  return `LINK-09 (offline ${off.pendingReports} Messungen + 1 Übernahme gemerkt, nach Welt neu betreten noch da, wieder online je genau einmal im Raum, Kiste 20 Steinziegel/7 Stämme)`;
}
