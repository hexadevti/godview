// Planetary mode: a stylized solar system rendered straight into the globe's
// three.js scene, shown when the user zooms far out (Earth becomes a dot). The
// globe stays nailed to the scene origin as Earth, so we render the system in a
// GEOCENTRIC (Tychonic) frame: the Sun orbits Earth once a year, every other
// planet orbits the moving Sun, and moons orbit their planet. Relative motions
// match reality (up to an artistic scale), Earth stays at the origin, and when
// time is accelerated each body sweeps out its orbital trail — moons trace
// looping epicycles around the planets, which is the whole point.
//
// Everything lives on render layer 2 with its own Sun light, so the planetary
// lighting never touches the Earth globe (which draws with its own material).

import * as THREE from "three";
import moonUrl from "../assets/textures/moon.jpg";

const TWO_PI = Math.PI * 2;
const DEG = Math.PI / 180;
export const PLANETARY_LAYER = 2;

// Globe radius is 100 (Earth). Distances/sizes below are artistic, not to scale:
// orbit radii are AU compressed by ^0.62 so Neptune still fits, and planet radii
// are emphasized so the gas giants read at a glance.
const R_EARTH_SUN = 700; // Sun's distance from Earth (Earth's orbit radius)

interface MoonDef {
  name: string;
  color: number;
  radius: number; // sphere radius, world units
  orbit: number; // orbit radius around its planet, world units
  periodDays: number;
  incl: number; // orbital-plane tilt, radians
  texture?: string;
}

interface PlanetDef {
  name: string;
  color: number;
  emissive?: number;
  radius: number;
  au: number; // heliocentric distance in AU (compressed at build time)
  periodDays: number; // sidereal orbital period
  incl: number;
  phase: number; // starting mean anomaly, radians (spreads them out)
  ring?: { inner: number; outer: number; color: number }; // Saturn
  moons?: MoonDef[];
}

// Curated set: eight planets, plus the Moon and the most recognizable satellites
// (Galilean moons of Jupiter, Titan of Saturn). Periods in days.
const PLANETS: PlanetDef[] = [
  { name: "mercury", color: 0x9a8f83, radius: 7, au: 0.387, periodDays: 88, incl: 7 * DEG, phase: 0.4 },
  { name: "venus", color: 0xe6c98a, radius: 12, au: 0.723, periodDays: 224.7, incl: 3.4 * DEG, phase: 2.1 },
  {
    name: "earth",
    color: 0x2a6fdb,
    radius: 10, // not drawn (the globe IS Earth) — kept for reference/labeling
    au: 1,
    periodDays: 365.25,
    incl: 0,
    phase: 0,
    moons: [{ name: "moon", color: 0xb8b8b8, radius: 4, orbit: 170, periodDays: 27.32, incl: 5 * DEG, texture: moonUrl }],
  },
  { name: "mars", color: 0xc1440e, radius: 9, au: 1.524, periodDays: 687, incl: 1.85 * DEG, phase: 3.8 },
  {
    name: "jupiter",
    color: 0xcbb994,
    radius: 42,
    au: 5.203,
    periodDays: 4331,
    incl: 1.3 * DEG,
    phase: 5.2,
    moons: [
      { name: "io", color: 0xf5e6a0, radius: 3.4, orbit: 70, periodDays: 1.77, incl: 0.4 * DEG },
      { name: "europa", color: 0xd9d2c5, radius: 3.2, orbit: 92, periodDays: 3.55, incl: 0.47 * DEG },
      { name: "ganymede", color: 0x9c8f7d, radius: 4.6, orbit: 120, periodDays: 7.15, incl: 0.2 * DEG },
      { name: "callisto", color: 0x6f6357, radius: 4.3, orbit: 158, periodDays: 16.69, incl: 0.28 * DEG },
    ],
  },
  {
    name: "saturn",
    color: 0xe3d9a6,
    radius: 36,
    au: 9.537,
    periodDays: 10747,
    incl: 2.49 * DEG,
    phase: 1.1,
    ring: { inner: 46, outer: 78, color: 0xcdবু ?? 0xcdb98a },
    moons: [{ name: "titan", color: 0xd9a04a, radius: 4.6, orbit: 108, periodDays: 15.95, incl: 0.35 * DEG }],
  },
  { name: "uranus", color: 0xa6e0e6, radius: 22, au: 19.19, periodDays: 30589, incl: 0.77 * DEG, phase: 4.0 },
  { name: "neptune", color: 0x3f6cf5, radius: 21, au: 30.07, periodDays: 59800, incl: 1.77 * DEG, phase: 2.7 },
];

/** Position on a tilted circular orbit of the given radius at angle `a`. Base
 *  circle in the XZ plane (globe poles are +Y), then tilted about X by `incl`. */
function orbitPos(out: THREE.Vector3, radius: number, a: number, incl: number): THREE.Vector3 {
  const x = radius * Math.cos(a);
  const z0 = radius * Math.sin(a);
  const y = -z0 * Math.sin(incl);
  const z = z0 * Math.cos(incl);
  return out.set(x, y, z);
}

/** A crisp text sprite (planet/moon label) drawn on a canvas, always camera-facing. */
function makeLabel(text: string, color = "#dbe6ff"): THREE.Sprite {
  const pad = 8;
  const font = 42;
  const measure = document.createElement("canvas").getContext("2d")!;
  measure.font = `600 ${font}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
  const w = Math.ceil(measure.measureText(text).width) + pad * 2;
  const h = font + pad * 2;
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d")!;
  ctx.font = `600 ${font}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillText(text, pad + 1, h / 2 + 1);
  ctx.fillStyle = color;
  ctx.fillText(text, pad, h / 2);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
  spr.scale.set((h / font) * 0.5 * (w / h) * font * 0.6, (h / font) * 0.5 * font * 0.6, 1);
  // Simpler explicit scale: keep aspect, ~world height 26.
  const worldH = 26;
  spr.scale.set((w / h) * worldH, worldH, 1);
  spr.renderOrder = 999;
  return spr;
}

// One orbiting body's runtime state (planet or moon) plus its trail buffer.
interface Body {
  def: { name: string; radius: number; periodDays: number; incl: number; phase: number; orbit: number };
  mesh: THREE.Object3D;
  label: THREE.Sprite;
  // parent center provider: planets orbit the Sun; moons orbit their planet.
  center: THREE.Vector3; // reused per-frame world center this body orbits
  parent: Body | null; // null → orbits the Sun
  isPlanet: boolean;
  // trail
  trailArr: Float32Array;
  trailLen: number;
  trailCap: number;
  trailAttr: THREE.BufferAttribute;
  trailGeom: THREE.BufferGeometry;
  trailLine: THREE.Line;
  sampleInterval: number; // sim-days between trail samples
  lastSample: number;
}

export interface SolarSystem {
  group: THREE.Group;
  update(simDays: number, trailsOn: boolean): void;
  setLabelsVisible(v: boolean): void;
  dispose(): void;
}

/** Build the solar system group and return an controller. `labelFor` localizes
 *  a body key (e.g. "mars", "io") to display text. */
export function buildSolarSystem(
  scene: THREE.Scene,
  camera: THREE.Camera,
  labelFor: (key: string) => string,
): SolarSystem {
  const group = new THREE.Group();
  group.layers.set(PLANETARY_LAYER);
  const texLoader = new THREE.TextureLoader();

  // Sun at the center of the planetary frame (it orbits Earth; positioned each
  // frame). Bright emissive core + additive glow sprite + the system's light.
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(120, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0xfff1c4 }),
  );
  sun.layers.set(PLANETARY_LAYER);
  const glowTex = makeSunGlow();
  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  sunGlow.scale.set(900, 900, 1);
  sunGlow.layers.set(PLANETARY_LAYER);
  const sunLabel = makeLabel(labelFor("sun"), "#ffe9a8");
  sunLabel.layers.set(PLANETARY_LAYER);
  const sunLight = new THREE.PointLight(0xfff4e0, 3.2, 0, 0);
  sunLight.layers.set(PLANETARY_LAYER);
  const ambient = new THREE.AmbientLight(0x223049, 1.1); // faint fill so dark sides aren't pure black
  ambient.layers.set(PLANETARY_LAYER);
  group.add(sun, sunGlow, sunLabel, sunLight, ambient);

  const bodies: Body[] = [];
  const disposables: Array<{ dispose(): void }> = [glowTex];

  const makeTrail = (color: number, periodDays: number): Pick<Body, "trailArr" | "trailLen" | "trailCap" | "trailAttr" | "trailGeom" | "trailLine" | "sampleInterval" | "lastSample"> => {
    const cap = 260; // ~one orbit's worth of samples
    const arr = new Float32Array(cap * 3);
    const cols = new Float32Array(cap * 3);
    const c = new THREE.Color(color);
    for (let i = 0; i < cap; i++) {
      const f = i / (cap - 1); // 0 = oldest (dim) → 1 = newest (bright)
      cols.set([c.r * (0.15 + 0.85 * f), c.g * (0.15 + 0.85 * f), c.b * (0.15 + 0.85 * f)], i * 3);
    }
    const geom = new THREE.BufferGeometry();
    const attr = new THREE.BufferAttribute(arr, 3);
    attr.setUsage(THREE.DynamicDrawUsage);
    geom.setAttribute("position", attr);
    geom.setAttribute("color", new THREE.BufferAttribute(cols, 3));
    geom.setDrawRange(0, 0);
    const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false });
    const line = new THREE.Line(geom, mat);
    line.layers.set(PLANETARY_LAYER);
    line.frustumCulled = false;
    line.visible = false;
    disposables.push(geom, mat);
    return { trailArr: arr, trailLen: 0, trailCap: cap, trailAttr: attr, trailGeom: geom, trailLine: line, sampleInterval: periodDays / (cap - 1), lastSample: -Infinity };
  };

  const addBody = (
    def: Body["def"],
    color: number,
    parent: Body | null,
    isPlanet: boolean,
    texture?: string,
    ring?: PlanetDef["ring"],
  ): Body => {
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 1,
      metalness: 0,
      map: texture ? texLoader.load(texture) : null,
    });
    if (texture) (mat.map as THREE.Texture).colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(def.radius, 32, 32), mat);
    mesh.layers.set(PLANETARY_LAYER);
    disposables.push(mesh.geometry, mat);
    const holder = new THREE.Object3D();
    holder.layers.set(PLANETARY_LAYER);
    holder.add(mesh);
    if (ring) {
      const rg = new THREE.RingGeometry(ring.inner, ring.outer, 64);
      const rm = new THREE.MeshBasicMaterial({ color: ring.color, side: THREE.DoubleSide, transparent: true, opacity: 0.55, depthWrite: false });
      const rings = new THREE.Mesh(rg, rm);
      rings.rotation.x = Math.PI / 2 - 0.45; // tilt the ring plane
      rings.layers.set(PLANETARY_LAYER);
      holder.add(rings);
      disposables.push(rg, rm);
    }
    const label = makeLabel(labelFor(def.name));
    label.layers.set(PLANETARY_LAYER);
    label.position.y = def.radius + 14;
    holder.add(label);
    group.add(holder);
    const trail = makeTrail(color, def.periodDays);
    group.add(trail.trailLine);
    const body: Body = { def, mesh: holder, label, center: new THREE.Vector3(), parent, isPlanet, ...trail };
    bodies.push(body);
    return body;
  };

  for (const p of PLANETS) {
    // Earth is the globe itself — don't draw a sphere for it, but DO create its
    // moons (they orbit the origin). Represent Earth by a lightweight anchor body.
    let planetBody: Body | null = null;
    if (p.name !== "earth") {
      planetBody = addBody(
        { name: p.name, radius: p.radius, periodDays: p.periodDays, incl: p.incl, phase: p.phase, orbit: R_EARTH_SUN * Math.pow(p.au, 0.62) },
        p.color,
        null,
        true,
        undefined,
        p.ring,
      );
    } else {
      // Earth anchor: invisible body fixed at the origin so its moons have a center.
      planetBody = {
        def: { name: "earth", radius: p.radius, periodDays: p.periodDays, incl: 0, phase: 0, orbit: 0 },
        mesh: new THREE.Object3D(),
        label: sunLabel, // unused
        center: new THREE.Vector3(0, 0, 0),
        parent: null,
        isPlanet: true,
        ...makeTrail(p.color, p.periodDays),
      };
      // no trail for the (stationary) Earth anchor
      planetBody.trailLine.visible = false;
    }
    for (const m of p.moons ?? []) {
      addBody(
        { name: m.name, radius: m.radius, periodDays: m.periodDays, incl: m.incl, phase: 0, orbit: m.orbit },
        m.color,
        planetBody,
        false,
        m.texture,
      );
    }
  }

  scene.add(group);
  if ("layers" in camera) (camera as THREE.PerspectiveCamera).layers.enable(PLANETARY_LAYER);

  // Scratch vectors reused every frame.
  const sunPos = new THREE.Vector3();
  const tmp = new THREE.Vector3();

  const sunAngle = (simDays: number) => TWO_PI * (simDays / 365.25);

  const bodyWorldPos = (b: Body, simDays: number, out: THREE.Vector3): THREE.Vector3 => {
    const a = b.def.phase + TWO_PI * (simDays / b.def.periodDays);
    orbitPos(out, b.def.orbit, a, b.def.incl);
    out.add(b.parent ? b.parent.center : sunPos);
    return out;
  };

  const pushTrail = (b: Body, x: number, y: number, z: number) => {
    const a = b.trailArr;
    if (b.trailLen < b.trailCap) {
      a.set([x, y, z], b.trailLen * 3);
      b.trailLen++;
    } else {
      a.copyWithin(0, 3);
      a[(b.trailCap - 1) * 3] = x;
      a[(b.trailCap - 1) * 3 + 1] = y;
      a[(b.trailCap - 1) * 3 + 2] = z;
    }
    b.trailGeom.setDrawRange(0, b.trailLen);
    b.trailAttr.needsUpdate = true;
  };

  const clearTrail = (b: Body) => {
    b.trailLen = 0;
    b.lastSample = -Infinity;
    b.trailGeom.setDrawRange(0, 0);
  };

  return {
    group,
    setLabelsVisible(v: boolean) {
      sunLabel.visible = v;
      for (const b of bodies) b.label.visible = v;
    },
    update(simDays: number, trailsOn: boolean) {
      // 1) Sun position (orbits Earth once a year), and its light/glow follow it.
      orbitPos(sunPos, R_EARTH_SUN, sunAngle(simDays), 0);
      sun.position.copy(sunPos);
      sunGlow.position.copy(sunPos);
      sunLabel.position.copy(sunPos).y += 150;
      sunLight.position.copy(sunPos);

      // 2) Planets first (their center is the Sun), storing each planet's world
      //    center so its moons can orbit it in the same frame.
      for (const b of bodies) {
        if (!b.isPlanet) continue;
        bodyWorldPos(b, simDays, b.center);
        b.mesh.position.copy(b.center);
      }
      // Earth anchor center stays at origin (already 0,0,0).

      // 3) Moons (center = their planet's just-computed world position).
      for (const b of bodies) {
        if (b.isPlanet) continue;
        bodyWorldPos(b, simDays, b.center);
        b.mesh.position.copy(b.center);
      }

      // 4) Trails — sample at fixed sim-time intervals so the line stays smooth
      //    at any time-acceleration. Cap the catch-up loop for huge jumps.
      for (const b of bodies) {
        b.trailLine.visible = trailsOn && b.def.orbit > 0;
        if (!trailsOn || b.def.orbit === 0) {
          if (b.trailLen > 0 && !trailsOn) clearTrail(b);
          continue;
        }
        if (b.lastSample === -Infinity) b.lastSample = simDays - b.sampleInterval;
        let guard = 0;
        while (simDays - b.lastSample >= b.sampleInterval && guard < 400) {
          b.lastSample += b.sampleInterval;
          // recompute this body's position at the sampled time for a smooth path
          if (b.parent) {
            // approximate: use parent's current center (moves slowly vs. moon)
            bodyWorldPos(b, b.lastSample, tmp);
          } else {
            bodyWorldPos(b, b.lastSample, tmp);
          }
          pushTrail(b, tmp.x, tmp.y, tmp.z);
          guard++;
        }
      }
    },
    dispose() {
      if ("layers" in camera) (camera as THREE.PerspectiveCamera).layers.disable(PLANETARY_LAYER);
      scene.remove(group);
      for (const b of bodies) {
        if (b.mesh instanceof THREE.Mesh) {
          b.mesh.geometry.dispose();
          (b.mesh.material as THREE.Material).dispose();
        }
        (b.label.material as THREE.SpriteMaterial).map?.dispose();
        (b.label.material as THREE.Material).dispose();
      }
      (sun.material as THREE.Material).dispose();
      sun.geometry.dispose();
      (sunGlow.material as THREE.SpriteMaterial).dispose();
      (sunLabel.material as THREE.SpriteMaterial).map?.dispose();
      (sunLabel.material as THREE.Material).dispose();
      for (const d of disposables) d.dispose();
    },
  };
}

/** Soft radial glow for the Sun (additive corona). */
function makeSunGlow(): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0.0, "rgba(255,248,224,1)");
  g.addColorStop(0.16, "rgba(255,236,180,0.8)");
  g.addColorStop(0.4, "rgba(255,196,110,0.3)");
  g.addColorStop(0.7, "rgba(255,170,80,0.07)");
  g.addColorStop(1.0, "rgba(255,160,70,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}
