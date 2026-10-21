import * as THREE from './vendor/three.module.min.js';

export function seededRandom(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function petalPoint(t, u, leaf = false) {
  const length = leaf ? 1.85 : 1.65;
  const width = Math.pow(Math.sin(Math.PI * t), leaf ? 0.95 : 0.74) * (leaf ? 0.22 : 0.49);
  return new THREE.Vector3(
    t * length,
    leaf
      ? 0.72 * t - 0.38 * t * t + Math.abs(u) * 0.06
      : 0.12 + 0.78 * Math.sin(t * Math.PI * 0.86) - 0.75 * t ** 4 + u * u * 0.18 * Math.sin(Math.PI * t) - 0.065 * (1 - Math.abs(u)) * Math.sin(Math.PI * t),
    u * width,
  );
}

function makeBlade(leaf = false) {
  const rows = leaf ? 22 : 32;
  const columns = leaf ? 8 : 14;
  const positions = [];
  const uv = [];
  const indices = [];
  for (let i = 0; i <= rows; i++) {
    for (let j = 0; j <= columns; j++) {
      const t = i / rows;
      const u = (j / columns) * 2 - 1;
      positions.push(...petalPoint(t, u, leaf).toArray());
      uv.push(j / columns, t);
      if (i < rows && j < columns) {
        const a = i * (columns + 1) + j;
        const b = a + columns + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function makeFlowerAssets() {
  const petal = makeBlade();
  const leaf = makeBlade(true);
  const veins = [];
  for (const u of [-0.55, 0, 0.55]) {
    const points = [];
    for (let i = 2; i < 32; i++) {
      const point = petalPoint(i / 32, u);
      point.y += 0.007;
      points.push(point);
    }
    veins.push(new THREE.BufferGeometry().setFromPoints(points));
  }
  const base = {
    metalness: 1, roughness: 0.19, envMapIntensity: 2.1, side: THREE.DoubleSide,
  };
  const silver = new THREE.MeshStandardMaterial({ ...base, color: '#e0dce9' });
  const lavender = new THREE.MeshStandardMaterial({ ...base, color: '#c7b6dd', roughness: 0.23 });
  const pink = new THREE.MeshStandardMaterial({ ...base, color: '#dbb8d4', roughness: 0.17 });
  const green = new THREE.MeshStandardMaterial({ ...base, color: '#86947d', roughness: 0.29 });
  const stem = new THREE.MeshStandardMaterial({ color: '#778b72', metalness: 0.92, roughness: 0.24, envMapIntensity: 1.8 });
  const anther = new THREE.MeshStandardMaterial({ color: '#dcfa7e', emissive: '#8ea51f', emissiveIntensity: 0.12, metalness: 0.65, roughness: 0.27 });
  const pistil = new THREE.MeshStandardMaterial({ color: '#c6a3e1', metalness: 0.84, roughness: 0.18 });
  const vein = new THREE.LineBasicMaterial({ color: '#e0d4eb', transparent: true, opacity: 0.20 });
  const antherGeometry = new THREE.SphereGeometry(1, 12, 8);
  const hitGeometry = new THREE.SphereGeometry(1.2, 12, 8);
  const hitMaterial = new THREE.MeshBasicMaterial({ visible: false });
  return { petal, leaf, veins, petalMaterials: [silver, lavender, pink], green, stem, anther, pistil, vein, antherGeometry, hitGeometry, hitMaterial };
}

export function createLily(id, assets, random) {
  const root = new THREE.Group();
  const height = 2.65 + random() * 0.65;
  const bend = (random() - 0.5) * 0.4;
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.15, 0),
    new THREE.Vector3(-bend * 0.35, height * 0.3, 0.07),
    new THREE.Vector3(bend * 0.3, height * 0.7, -0.08),
    new THREE.Vector3(bend, height, 0),
  ]);
  const stemGeometry = new THREE.TubeGeometry(curve, 20, 0.027, 7, false);
  root.add(new THREE.Mesh(stemGeometry, assets.stem));
  const privateGeometries = [stemGeometry];
  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Mesh(assets.leaf, assets.green);
    blade.position.copy(curve.getPoint(0.19 + i * 0.155));
    blade.rotation.y = i * 2.45 + id;
    blade.rotation.z = 0.48 + i * 0.06;
    blade.scale.setScalar(0.65 + random() * 0.2);
    root.add(blade);
  }

  const head = new THREE.Group();
  head.position.set(bend, height, 0);
  // Tilt the open corolla toward the visitor.
  head.rotation.set(0.54 + random() * 0.3, random() * 0.4, (random() - 0.5) * 0.28);
  root.add(head);
  const petals = [];
  for (let i = 0; i < 6; i++) {
    const pivot = new THREE.Group();
    pivot.rotation.y = (i / 6) * Math.PI * 2;
    pivot.rotation.z = i % 2 ? 0.10 : -0.08;
    pivot.scale.set(1 + (i % 2) * 0.08, 1, i % 2 ? 0.85 : 1);
    const mesh = new THREE.Mesh(assets.petal, assets.petalMaterials[(id + (i % 2)) % 3]);
    pivot.add(mesh);
    for (const geometry of assets.veins) pivot.add(new THREE.Line(geometry, assets.vein));
    head.add(pivot);
    petals.push({ pivot, angle: pivot.rotation.z });
  }
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + 0.2;
    const radius = 0.37 + random() * 0.1;
    const tip = new THREE.Vector3(Math.cos(angle) * radius, 0.92 + random() * 0.21, Math.sin(angle) * radius);
    const filamentCurve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0.1, 0), new THREE.Vector3(tip.x * 0.45, 0.7, tip.z * 0.45), tip);
    const filamentGeometry = new THREE.TubeGeometry(filamentCurve, 10, 0.012, 5, false);
    privateGeometries.push(filamentGeometry);
    head.add(new THREE.Mesh(filamentGeometry, assets.pistil));
    const anther = new THREE.Mesh(assets.antherGeometry, assets.anther);
    anther.position.copy(tip);
    anther.scale.set(0.145, 0.047, 0.062);
    anther.rotation.y = -angle + 0.3;
    anther.rotation.z = 0.2;
    head.add(anther);
  }
  const pistilGeometry = new THREE.CylinderGeometry(0.018, 0.023, 1.02, 7);
  privateGeometries.push(pistilGeometry);
  const pistil = new THREE.Mesh(pistilGeometry, assets.pistil);
  pistil.position.y = 0.62;
  head.add(pistil);
  const stigma = new THREE.Mesh(assets.antherGeometry, assets.anther);
  stigma.position.y = 1.14;
  stigma.scale.set(0.06, 0.035, 0.06);
  head.add(stigma);

  const hit = new THREE.Mesh(assets.hitGeometry, assets.hitMaterial);
  hit.scale.set(1.1, 0.56, 1.1);
  hit.position.y = 0.32;
  hit.userData.flowerId = id;
  head.add(hit);
  return { id, root, head, petals, hit, height, phase: random() * Math.PI * 2, impulse: 0, baseRotation: head.rotation.clone(), privateGeometries };
}
