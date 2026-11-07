// Spielprüfstand, Sätze für Gelände, Basisplaner und Großprojekte (TERRAIN-03/05, BASE-01, GROSS-01):
// baut aus den Planer-Funktionen ganze Welten (Gelände als volle Säulen, Bauten, Wegenetz, Laternen),
// so wie sie der Planer übergibt, und liefert sie als { name, payload } an game_placement.mjs.
//
// Ein Geländebauteil ändert im echten Einsatz nur Säulen, deren Boden schon in der Welt liegt. Der
// Prüfstand steht auf einer flachen Grasebene; deshalb wird das Gelände hier als volle Säule ab einer
// Lage unter dem tiefsten Punkt gezeichnet (dasselbe wie „Boden der Welt + Bauteil“). Bauten und
// Wegenetz einer flach geplanten Projektwelt stehen auf y = 0; liegt etwas tiefer (Kolosseum-Arena,
// Hafen am Wasser), kommt Erdreich bzw. Meer bis y = −1 darunter.
const D = async () => { const m = await import('../../dist/domain/src/index.js'); PROFILE ??= m.SAMPLE_PROFILE; return m; };
let PROFILE;
const ORIGIN = [1000, 64, 1000];
const key = (x, y, z) => `${x},${y},${z}`;

/**
 * Sparse world of block states (null = explicit air). Every cell remembers its part (a placement of the
 * project, the terrain, the ground below): the report tells a connection across two parts (a seam) from
 * one inside a part.
 */
class World {
  cells = new Map();
  parts = new Map();
  put(x, y, z, state, part = '') { const k = key(x, y, z); this.cells.set(k, state); this.parts.set(k, part); }
  has(x, y, z) { return this.cells.has(key(x, y, z)); }
  /** Adds a payload; its cell (px, py, pz) lands at offset + position. `owners` (Resolution.owners) names the placement of each cell. */
  addPayload(payload, offset = [0, 0, 0], { air = true, part = '', owners } = {}) {
    for (const c of payload.cells) {
      const [x, y, z] = [c.position[0] + offset[0], c.position[1] + offset[1], c.position[2] + offset[2]];
      const who = owners?.get(c.position.join(','))?.[0] ?? part;
      if (c.kind === 'block') this.put(x, y, z, payload.palette[c.paletteIndex], who);
      else if (air && c.kind === 'air') this.put(x, y, z, null, who);
    }
    return this;
  }
  /** Bounds of the blocks (x0, y0, z0, x1, y1, z1 inclusive). */
  box() {
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (const [k, s] of this.cells) {
      if (!s) continue;
      const p = k.split(',').map(Number);
      for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], p[i]); hi[i] = Math.max(hi[i], p[i]); }
    }
    return { lo, hi };
  }
  payload() {
    const { lo, hi } = this.box();
    if (!Number.isFinite(lo[0])) throw new Error('leere Welt');
    const palette = [], index = new Map(), cells = [], parts = [];
    for (const [k, s] of this.cells) {
      if (!s || s.id === 'minecraft:air') continue;
      const sk = JSON.stringify([s.id, Object.entries(s.properties ?? {}).sort()]);
      let i = index.get(sk);
      if (i === undefined) { i = palette.length; palette.push(s); index.set(sk, i); }
      const p = k.split(',').map(Number);
      cells.push({ position: [p[0] - lo[0], p[1] - lo[1], p[2] - lo[2]], kind: 'block', paletteIndex: i });
      parts.push(this.parts.get(k) ?? '');
    }
    return { palette, cells, parts, bounds: { min: [0, 0, 0], maxExclusive: [hi[0] - lo[0] + 1, hi[1] - lo[1] + 1, hi[2] - lo[2] + 1] } };
  }
}

/** Survey from a height function (world columns); `water(x, z)` columns get water up to `sea`. */
async function survey(area, h, water = () => false, sea = 0) {
  const { createSurvey } = await D();
  const n = area.width * area.length;
  const ground = new Int16Array(n), surface = new Int16Array(n), gb = new Uint16Array(n), sb = new Uint16Array(n);
  for (let z = 0; z < area.length; z++) for (let x = 0; x < area.width; x++) {
    const i = x + z * area.width, wx = area.minX + x, wz = area.minZ + z, g = h(wx, wz);
    ground[i] = g; gb[i] = 1;
    if (water(wx, wz) && sea > g) { surface[i] = sea; sb[i] = 2; } else { surface[i] = g; sb[i] = 1; }
  }
  return createSurvey({ ...area, ground, surface, groundBlock: gb, surfaceBlock: sb, ids: ['?', 'minecraft:grass_block', 'minecraft:water'] },
    { dimension: 'minecraft:overworld', readAt: '2026-11-07T00:00:00.000Z' });
}

/**
 * The planned terrain as full columns (world coordinates): a design compared with a flat base one below
 * its lowest column, so every column is drawn from there up (filler, top, water, path pieces). `skip`
 * leaves cells to buildings, `extra` are scatter cells (trees, rocks, plants).
 */
async function solidTerrain(world, d, { skip, extra = [] } = {}) {
  const { flatSurvey, designPayload, SURVEY_UNKNOWN } = await D();
  let lo = Infinity;
  for (const h of d.height) if (h !== SURVEY_UNKNOWN) lo = Math.min(lo, h);
  const low = flatSurvey({ minX: d.minX, minZ: d.minZ, width: d.width, length: d.length }, lo - 1, d.dimension);
  const r = designPayload(low, d, PROFILE, skip, extra);
  if (r) world.addPayload(r.payload, r.origin, { air: false, part: 'gelaende' });
  return world;
}

/**
 * Ground under a flat project world: columns get earth (or sea) up to y = −1 below their lowest cell,
 * down to the world's lowest block. Only needed where something lies below y = 0.
 */
function groundUnder(world, { water = () => false, seaDepth = 3 } = {}) {
  const { lo, hi } = world.box();
  const wet = [];
  for (let x = lo[0]; x <= hi[0]; x++) for (let z = lo[2]; z <= hi[2]; z++) if (water(x, z)) wet.push([x, z]);
  const floor = Math.min(lo[1], wet.length ? -seaDepth - 1 : 0);
  if (floor >= 0) return world;
  const lowest = new Map();
  for (const k of world.cells.keys()) { const [x, y, z] = k.split(',').map(Number); const c = `${x},${z}`; if (!lowest.has(c) || y < lowest.get(c)) lowest.set(c, y); }
  for (let x = lo[0]; x <= hi[0]; x++) for (let z = lo[2]; z <= hi[2]; z++) {
    const top = Math.min(lowest.get(`${x},${z}`) ?? 0, 0) - 1;
    const sea = water(x, z);
    for (let y = floor; y <= top; y++) {
      if (world.has(x, y, z)) continue;
      const id = sea ? (y < -seaDepth ? 'minecraft:sand' : 'minecraft:water') : y === top && !world.has(x, y + 1, z) ? 'minecraft:grass_block' : 'minecraft:dirt';
      world.put(x, y, z, id === 'minecraft:water' ? { id, properties: { level: '0' } } : id === 'minecraft:grass_block' ? { id, properties: { snowy: 'false' } } : { id, properties: {} }, 'boden');
    }
  }
  return world;
}

async function library() {
  const { createBuildingLibrary } = await D();
  const b = await createBuildingLibrary();
  return { assets: b.assets, versions: new Map(b.versions.map(v => [v.id, v])) };
}

// ------------------------------------------------------------------ Geländebauteile (TERRAIN-03/05)

const AREA = (width, length) => ({ minX: 0, minZ: 0, width, length });

export async function* terrainParts() {
  const d = await D();
  const { designFromSurvey, layPath, layRamp, layPathCells, stampShape, carveRiver, erodeTerrain, applyBrush, autoPaint, fortifyShore, PATH_MATERIALS, SURFACE_STYLES,
    SCATTER_PRESETS, addScatterPreset, scatterLayers, scatterCells, EMPTY_SCATTER } = d;
  const flat = { kind: 'flat', y: 0 };
  const job = async (name, base, design, extra) => ({ name: `Gelände ${name}`, payload: (await solidTerrain(new World(), design, { extra })).payload() });

  // Treppen und Halbstufen: ein Hang, 1 Block Steigung auf 2 Blöcke, Wege quer hinauf in jedem Stufenmaterial.
  const slope = await survey(AREA(40, 9), x => 64 + Math.floor(x / 2));
  for (const m of PATH_MATERIALS) for (const steps of ['stairs', 'slabs']) {
    const g = designFromSurvey(slope, flat);
    layPath(g, [[1, 4], [38, 4]], { width: 3, style: 'pfad', steps, material: m.id });
    yield job(`Weg mit ${steps === 'stairs' ? 'Treppen' : 'Halbstufen'} ${m.id}`, slope, g);
  }
  // Ein schräger Weg mit Kurve (Treppen wechseln die Richtung), jede Wegart, Breite 1 und 5.
  for (const style of SURFACE_STYLES.filter(s => s.path)) for (const width of [1, 5]) {
    const g = designFromSurvey(slope, flat);
    layPath(g, [[2, 1], [20, 7], [37, 2]], { width, style: style.id, steps: 'stairs' });
    yield job(`Wegkurve ${style.id} Breite ${width}`, slope, g);
  }

  // Brücken mit Geländer und Dämme: ein Fluss quer durch das Feld (Wasser 2 tief).
  const wetRiver = (x, z) => z >= 11 && z <= 18;
  const river = await survey(AREA(14, 30), (x, z) => wetRiver(x, z) ? 61 : 64, wetRiver, 63);
  for (const m of PATH_MATERIALS) for (const width of [1, 3]) {
    const g = designFromSurvey(river, flat);
    layPath(g, [[6, 1], [6, 28]], { width, style: 'kiesweg', steps: 'stairs', material: m.id, water: 'bridge' });
    yield job(`Brücke ${m.id} Breite ${width}`, river, g);
  }
  for (const style of SURFACE_STYLES.filter(s => s.path)) {
    const g = designFromSurvey(river, flat);
    layPath(g, [[3, 1], [10, 28]], { width: 3, style: style.id, water: 'causeway' });
    yield job(`Damm ${style.id}`, river, g);
  }
  // Brücke über einen Fluss am Hang: Ufer unterschiedlich hoch, Treppen bis an die Brücke.
  const bank = await survey(AREA(14, 34), (x, z) => z < 13 ? 70 - Math.floor(z / 2) : z > 20 ? 63 + Math.floor((z - 20) / 2) : 60, (x, z) => z >= 13 && z <= 20, 63); // Ufer 64 und 63, Wasser bis 63
  for (const steps of ['stairs', 'slabs']) {
    const g = designFromSurvey(bank, flat);
    layPath(g, [[6, 1], [6, 32]], { width: 3, style: 'steinweg', steps, water: 'bridge' });
    yield job(`Brücke am Hang mit ${steps}`, bank, g);
  }

  // Rampen: hinauf, hinunter (in den Hang geschnitten), mit und ohne Rand.
  const plain = await survey(AREA(36, 20), () => 64);
  for (const [label, a, b, o] of [['hinauf', [2, 10], [33, 10], { width: 5, fromY: 64, toY: 74, margin: 3 }], ['steil ohne Rand', [2, 10], [20, 10], { width: 3, fromY: 64, toY: 76, margin: 0 }],
    ['hinunter', [2, 10], [33, 10], { width: 7, fromY: 64, toY: 56, margin: 4 }]]) {
    const g = designFromSurvey(plain, flat);
    layRamp(g, a, b, o);
    yield job(`Rampe ${label}`, plain, g);
  }

  // Berg, Hügel, Krater, Mulde, Plateau – jeweils bemalt wie im Landschaftsreiter (Auto-Bemalen: steil = Fels, Schnee oben, Strand am Wasser).
  const field = await survey(AREA(48, 48), () => 64);
  for (const shape of ['huegel', 'berg', 'krater', 'mulde', 'plateau']) for (const seed of [0, 3]) {
    const g = designFromSurvey(field, flat);
    stampShape(g, 24, 24, { shape, radius: 20, height: shape === 'berg' ? 28 : 10, seed });
    autoPaint(g, { steep: 3, snowY: 86, beach: 2, rest: 'wiese' });
    yield job(`Form ${shape} ${seed}`, field, g);
  }

  // Fluss: durch einen Hang (Spiegel fällt in Stufen), jedes Bett, schmal und breit.
  const valley = await survey(AREA(60, 30), (x, z) => 72 - Math.floor(x / 6) + Math.floor(Math.abs(z - 15) / 3));
  for (const bed of ['kies', 'sand', 'lehm']) for (const [width, depth] of [[3, 2], [9, 4]]) {
    const g = designFromSurvey(valley, flat);
    carveRiver(g, [[0, 15], [25, 10], [59, 18]], { width, depth, bed, bank: 2 });
    yield job(`Fluss ${bed} ${width} breit`, valley, g);
  }

  // Verwitterte Hänge: ein steiler Berg, verwittert mit und ohne Regen, danach bemalt.
  for (const rain of [0, 1, 2, 3]) {
    const g = designFromSurvey(field, flat);
    stampShape(g, 24, 24, { shape: 'berg', radius: 18, height: 30, seed: 1 });
    erodeTerrain(g, { passes: 12, talus: 1, rain, seed: rain });
    autoPaint(g, { steep: 2, snowY: 84, beach: 2, rest: 'wiese' });
    yield job(`verwitterter Hang Regen ${rain}`, field, g);
  }
  // Terrassen, Aufrauen, Glätten am Hang; jede Bodenart als Streifen an einer Böschung.
  {
    const g = designFromSurvey(field, flat);
    stampShape(g, 24, 24, { shape: 'huegel', radius: 22, height: 16 });
    applyBrush(g, 24, 24, { tool: 'terrace', radius: 22, strength: 1, falloff: 'hard', step: 3 });
    applyBrush(g, 10, 10, { tool: 'roughen', radius: 8, strength: 2, falloff: 'soft' });
    yield job('Terrassen und Aufrauen', field, g);
  }
  for (const s of SURFACE_STYLES) {
    const g = designFromSurvey(field, flat);
    stampShape(g, 24, 24, { shape: 'huegel', radius: 18, height: 8 });
    applyBrush(g, 24, 24, { tool: 'paint', radius: 30, strength: 1, falloff: 'hard', style: s.id });
    yield job(`Boden ${s.id} am Hügel`, field, g);
  }

  // Wegnetz (layPathCells) über Hügel und Wasser, jede Wegart, Brücke und Damm.
  const wetHills = (x, z) => x >= 26 && x <= 31;
  const hills = await survey(AREA(44, 44), (x, z) => wetHills(x, z) ? 59 : 68 + Math.round(3 * Math.sin(x / 7) + 2 * Math.cos(z / 6)), wetHills, 63);
  const net = [];
  for (let x = 2; x < 42; x++) for (let w = 0; w < 3; w++) net.push([x, 20 + w]);
  for (let z = 2; z < 42; z++) for (let w = 0; w < 3; w++) if (z < 20 || z > 22) net.push([12 + w, z]);
  for (const style of SURFACE_STYLES.filter(s => s.path)) for (const [steps, water] of [['stairs', 'bridge'], ['slabs', 'causeway']]) {
    const g = designFromSurvey(hills, flat);
    layPathCells(g, net, { style: style.id, steps, water });
    yield job(`Wegnetz ${style.id} ${steps} ${water}`, hills, g);
  }

  // Kaimauer an einem See.
  {
    const lake = await survey(AREA(30, 30), () => 62, (x, z) => (x - 15) ** 2 + (z - 15) ** 2 < 64, 64);
    const g = designFromSurvey(lake, flat);
    const cols = [];
    for (let z = 0; z < 30; z++) for (let x = 0; x < 30; x++) { const r = (x - 15) ** 2 + (z - 15) ** 2; if (r >= 64 && r < 100) cols.push(x + z * 30); }
    applyBrush(g, 15, 15, { tool: 'raise', radius: 14, strength: 2, falloff: 'hard', protect: Uint8Array.from({ length: 900 }, (_, i) => ((i % 30) - 15) ** 2 + (Math.floor(i / 30) - 15) ** 2 < 64 ? 1 : 0) });
    fortifyShore(g, cols);
    yield job('Kaimauer am See', lake, g);
  }

  // Streu-Ebene: jede Vorlage auf bemaltem Gelände mit Teich (Ufer).
  const pond = (x, z) => (x - 24) ** 2 + (z - 24) ** 2 < 36;
  const meadow = await survey(AREA(48, 48), (x, z) => pond(x, z) ? 61 : 66 + Math.round(2 * Math.sin(x / 9) * Math.cos(z / 8)), pond, 64);
  const stripes = ['wiese', 'wald', 'moos', 'sumpf', 'strand', 'wueste', 'fels', 'geroell', 'schnee'];
  for (const preset of SCATTER_PRESETS) {
    const g = designFromSurvey(meadow, flat);
    stripes.forEach((style, i) => { for (let z = 0; z < 48; z += 2) applyBrush(g, 2 + i * 5 + 2, z, { tool: 'paint', radius: 3, strength: 1, falloff: 'hard', style, filter: { onlyDry: true } }); });
    g.scatter = addScatterPreset(g.scatter ?? EMPTY_SCATTER, preset.id).plan;
    scatterLayers(g, { base: meadow });
    const cells = scatterCells(g, { base: meadow }).cells;
    yield job(`Streu-Ebene ${preset.id}`, meadow, g, cells);
  }
}

// ------------------------------------------------------------------ Projektwelten (BASE-01, GROSS-01)

/** Flat project world: every placement as composed in the project, ground or sea below y = 0. */
function flatWorld(res, water) {
  const w = new World().addPayload(res.world, [0, 0, 0], { owners: res.owners });
  return groundUnder(w, { water });
}

/**
 * The plan on a hilly (and wet) terrain as the landscape step adopts it: building sites levelled, the
 * network as landscape path with stairs or slabs and bridges or causeways, lamps on the ground.
 */
async function landscapeWorld(plan, layout, network, preview, { networkKey, asphalt, steps, water, wet }) {
  const d = await D();
  const { fitAnlageToTerrain, applyPlanLandscape, designFromSurvey, withoutNetwork, lampPostPart, landscapeRims } = d;
  const e = layout.extent;
  const margin = 12;
  const area = { minX: ORIGIN[0] + e.x0 - margin, minZ: ORIGIN[2] + e.z0 - margin, width: e.x1 - e.x0 + 2 * margin, length: e.z1 - e.z0 + 2 * margin };
  const hill = (x, z) => Math.max(62, 63 + Math.round(3 * Math.sin((x - ORIGIN[0]) / 23) + 3 * Math.cos((z - ORIGIN[2]) / 19) + (x - area.minX) / 24));
  const s = await survey(area, (x, z) => wet?.(x - ORIGIN[0], z - ORIGIN[2]) ? 58 : hill(x, z), (x, z) => !!wet?.(x - ORIGIN[0], z - ORIGIN[2]), 62);
  const fitted = withoutNetwork(plan);
  const fit = fitAnlageToTerrain(fitted, { survey: s, origin: ORIGIN, offset: [0, 0], mode: 'terrassen' });
  const g = designFromSurvey(s, { kind: 'flat', y: 0 });
  const r = applyPlanLandscape(g, fitted, { origin: ORIGIN, offset: [0, 0], heights: fit.heights, network, steps, water, grade: 3, quay: true });
  const rims = landscapeRims(fitted, { origin: ORIGIN, offset: [0, 0], heights: fit.heights });
  const lamps = await lampPostPart(r.lamps, { origin: ORIGIN, offset: [0, 0], key: networkKey, name: plan.anlage?.name ?? 'Plan', asphalt, rims });
  const adopted = { ...fitted, placements: [...fitted.placements, ...(lamps ? [lamps.placement] : [])], network: lamps ? { asset: lamps.asset, version: lamps.version } : null };
  const res = preview(adopted, { heights: fit.heights }).resolution;
  const w = new World().addPayload(res.world, ORIGIN, { owners: res.owners });
  await solidTerrain(w, g, { skip: (x, y, z) => w.has(x, y, z) });
  return { world: w, report: r };
}

export async function* basePlans() {
  const { BASE_TEMPLATES, layoutBase, buildBasePlan, previewBase, isWaterCell, NETWORK_SURFACE } = await D();
  const lib = await library();
  const cases = [];
  for (const t of BASE_TEMPLATES) {
    cases.push([t.id, { template: t.id }]);
    for (const pathStyle of ['dorf', 'kies', 'stein']) cases.push([`${t.id} Weg ${pathStyle}`, { template: t.id, pathStyle }]);
    cases.push([`${t.id} Weg 1 breit ohne Laternen`, { template: t.id, pathWidth: 1, lights: false }]);
    cases.push([`${t.id} Weg 5 breit Abstand 6`, { template: t.id, pathWidth: 5, spacing: 6 }]);
  }
  for (const water of ['nord', 'ost', 'west', 'keine']) cases.push([`kuestenbasis Wasser ${water}`, { template: 'kuestenbasis', water }]);
  for (const [label, choices] of cases) {
    const layout = layoutBase(lib, choices);
    const plan = await buildBasePlan(layout);
    const res = previewBase(plan).resolution;
    yield { name: `Basis ${label}`, payload: flatWorld(res).payload() };
  }
  // Auf Gelände: Wegenetz als Landschaftsweg (Treppen/Halbstufen, Brücke/Damm), Bauplätze eingeebnet.
  for (const t of BASE_TEMPLATES) for (const [steps, water] of [['stairs', 'bridge'], ['slabs', 'causeway']]) {
    const layout = layoutBase(lib, { template: t.id });
    const plan = await buildBasePlan(layout);
    const network = { cells: layout.paths, lamps: layout.lamps, style: NETWORK_SURFACE[layout.choices.pathStyle] };
    const { world } = await landscapeWorld(plan, layout, network, (p, o) => previewBase(p, o), { networkKey: 'wegenetz', steps, water, wet: layout.water ? (x, z) => isWaterCell(layout.water, x, z) : null });
    yield { name: `Basis ${t.id} auf Gelände ${steps} ${water}`, payload: world.payload() };
  }
}

export async function* grossprojektPlans() {
  const { GROSSPROJEKTE, planGrossprojekt, buildGrossprojektPlan, previewGrossprojekt, streetPayload, NETWORK_SURFACE } = await D();
  const lib = await library();
  for (const gp of GROSSPROJEKTE) {
    const layout = planGrossprojekt(gp, lib);
    const plan = await buildGrossprojektPlan(layout);
    yield { name: `Großprojekt ${gp.id} Projektwelt`, payload: flatWorld(previewGrossprojekt(plan).resolution).payload() };
    // Straßennetz in jeder Belagsart und Breite (eigenes Bauteil).
    for (const streetStyle of ['dorf', 'kies', 'stein', 'asphalt']) for (const streetWidth of [2, 5, 9]) {
      const l = planGrossprojekt(gp, lib, { streetStyle, streetWidth });
      const st = l.streets && streetPayload(l.streets);
      if (st) yield { name: `Großprojekt ${gp.id} Straßen ${streetStyle} ${streetWidth}`, payload: groundUnder(new World().addPayload(st.payload)).payload() };
    }
  }
}

export async function* grossprojektLandscapes() {
  const { GROSSPROJEKTE, planGrossprojekt, buildGrossprojektPlan, previewGrossprojekt, NETWORK_SURFACE } = await D();
  const lib = await library();
  for (const gp of GROSSPROJEKTE) {
    const layout = planGrossprojekt(gp, lib);
    if (!layout.streets) continue;
    const plan = await buildGrossprojektPlan(layout);
    const network = { cells: layout.streets.cells, lamps: layout.streets.lamps, style: NETWORK_SURFACE[layout.streets.style] };
    const { world } = await landscapeWorld(plan, layout, network, (p, o) => previewGrossprojekt(p, o), { networkKey: 'strassen', asphalt: layout.streets.style === 'asphalt', steps: 'stairs', water: 'bridge' });
    yield { name: `Großprojekt ${gp.id} auf Gelände`, payload: world.payload() };
  }
}
