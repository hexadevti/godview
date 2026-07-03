// Tiny 3D airplane and ship meshes for the moving vehicles. Each vehicle is a
// few boxes merged into ONE geometry (single draw call), and the geometry +
// material are shared singletons across all instances — so hundreds of vehicles
// stay cheap. MeshBasicMaterial (no lighting needed). Local +Z is "forward" so
// lookAt() orients them along travel direction.

import * as THREE from "three";

function box(w: number, h: number, d: number, x = 0, y = 0, z = 0): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}

/** Merge box geometries into one (position-only; basic material ignores normals). */
function merge(boxes: THREE.BufferGeometry[], scale: number): THREE.BufferGeometry {
  const positions: number[] = [];
  for (const b of boxes) {
    const ng = b.toNonIndexed();
    const pos = ng.getAttribute("position");
    for (let i = 0; i < pos.count; i++) positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
    b.dispose();
    ng.dispose();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.scale(scale, scale, scale);
  return g;
}

const PLANE_SCALE = 0.26;
const SHIP_SCALE = 0.24;

const planeGeom = merge(
  [
    box(0.35, 0.35, 2.6), // fuselage
    box(0.3, 0.3, 0.5, 0, 0, 1.4), // nose
    box(3.2, 0.08, 0.7), // wings
    box(1.2, 0.07, 0.5, 0, 0, -1.1), // tailplane
    box(0.08, 0.6, 0.5, 0, 0.3, -1.1), // fin
  ],
  PLANE_SCALE,
);

const shipGeom = merge(
  [
    box(0.9, 0.4, 3.0, 0, -0.1, 0), // hull
    box(0.6, 0.4, 0.5, 0, -0.1, 1.6), // bow
    box(0.7, 0.28, 2.2, 0, 0.15, 0), // deck
    box(0.55, 0.5, 0.7, 0, 0.45, -0.9), // bridge
  ],
  SHIP_SCALE,
);

// Match the route colors: air = cyan, sea = pink — so the two networks read distinctly.
// Internal transport: truck (road) and train (rail), forward = +Z.
const truckGeom = merge(
  [
    box(0.6, 0.5, 0.7, 0, 0.05, 0.75), // cab
    box(0.7, 0.6, 1.7, 0, 0.1, -0.4), // trailer
  ],
  0.24,
);

const trainGeom = merge(
  [
    box(0.5, 0.55, 1.1, 0, 0, 1.5), // locomotive
    box(0.5, 0.5, 0.9, 0, 0, 0.3), // car
    box(0.5, 0.5, 0.9, 0, 0, -0.8), // car
    box(0.5, 0.5, 0.9, 0, 0, -1.9), // car
  ],
  0.24,
);

// Match route colors: air = cyan, sea = pink, road = orange, rail = green.
const planeMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc });
const shipMat = new THREE.MeshBasicMaterial({ color: 0xf9a8d4 });
const truckMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
const trainMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });

export function makePlane(): THREE.Mesh {
  return new THREE.Mesh(planeGeom, planeMat);
}

export function makeShip(): THREE.Mesh {
  return new THREE.Mesh(shipGeom, shipMat);
}

export function makeTruck(): THREE.Mesh {
  return new THREE.Mesh(truckGeom, truckMat);
}

export function makeTrain(): THREE.Mesh {
  return new THREE.Mesh(trainGeom, trainMat);
}
