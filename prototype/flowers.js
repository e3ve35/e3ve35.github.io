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

function petalPoint(t, u, variant = 0, leaf = false) {
  const edge = Math.sin(Math.PI * t);
  if (leaf) return new THREE.Vector3(
    t * 1.85,
    0.85 * t - 0.42 * t * t + Math.abs(u) * 0.07 * edge,
    u * Math.pow(edge, 0.95) * 0.22 + 0.04 * edge * t,
  );
  const length = [1.68, 1.8, 1.72][variant];
  const width = Math.pow(Math.max(0, edge), 0.82) * [0.46, 0.48, 0.43][variant];
  const fold = -0.045 * Math.exp(-u * u * 18) * edge;
  const veins = 0.006 * Math.cos(u * Math.PI * 3) * edge * (1 - Math.abs(u) * 0.6);
  const ruffle = 0.016 * Math.sin(t * 15 + variant) * Math.abs(u) ** 3 * edge;
  return new THREE.Vector3(
    t * length,
    0.1 + [0.7, 0.63, 0.75][variant] * Math.sin(t * Math.PI * 0.88)
      - [0.56, 0.64, 0.57][variant] * t ** 3 + u * u * 0.19 * edge + fold + veins + ruffle,
    u * width * (1 + 0.1 * Math.sin(t * 6 + variant)) + 0.045 * edge * t,
  );
}

function poppyPoint(t, u, variant) {
  const angle = u * (1.045 + 0.045 * Math.sin(t * Math.PI));
  const rim = THREE.MathUtils.smoothstep(t, 0.62, 1);
  const radius = t * (1.48 + variant * 0.045 - u * u * 0.08
    + Math.sin(u * 4.5 + variant * 1.7) * 0.07
    + Math.sin(u * 15 + variant) * 0.025 * rim);
  const fold = Math.sin(u * 16 + Math.sin(t * 6 + variant) * 0.8) * 0.025 * Math.sin(Math.PI * t * 0.85) * Math.sqrt(t);
  const rimCurl = (Math.sin(u * 10 + variant * 2) * 0.065 + Math.cos(u * 18 - variant) * 0.025) * rim;
  const edgeCurl = Math.sin(t * 14 + variant) * 0.045 * Math.abs(u) ** 5 * t;
  return new THREE.Vector3(
    radius * Math.cos(angle),
    0.08 + 0.40 * Math.sin(t * Math.PI * 0.68) + 0.10 * t * t + u * u * 0.11 * t + fold + rimCurl + edgeCurl,
    radius * Math.sin(angle) + Math.sin(t * 3.5 + variant) * 0.035 * t,
  );
}

function poppyLeafPoint(t, u) {
  const width = Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.7) * 0.28
    * (0.62 + 0.38 * Math.sin(t * Math.PI * 9) ** 2);
  return new THREE.Vector3(t * 1.8, t * 0.83 - 0.34 * t * t + Math.abs(u) * 0.07 * Math.sin(Math.PI * t), u * width);
}

function makeBlade(variant = 0, leaf = false, poppy = false, pointAt = null) {
  const rows = leaf ? 22 : poppy ? 52 : 38;
  const columns = leaf ? 8 : poppy ? 36 : 20;
  const layers = leaf ? 1 : 2;
  const layerSize = (rows + 1) * (columns + 1);
  const positions = [];
  const uv = [];
  const indices = [];
  for (let layer = 0; layer < layers; layer++) {
    for (let i = 0; i <= rows; i++) {
      for (let j = 0; j <= columns; j++) {
        const t = i / rows;
        const u = j / columns * 2 - 1;
        const point = pointAt ? pointAt(t, u, variant) : poppy ? poppyPoint(t, u, variant) : petalPoint(t, u, variant, leaf);
        if (!leaf) point.y += (layer ? -1 : 1) * (0.004 + 0.008 * Math.sin(Math.PI * t));
        positions.push(...point.toArray());
        uv.push(j / columns, t);
        if (i < rows && j < columns) {
          const a = layer * layerSize + i * (columns + 1) + j;
          const b = a + columns + 1;
          if (layer) indices.push(a, b, a + 1, b, b + 1, a + 1);
          else indices.push(a, a + 1, b, b, a + 1, b + 1);
        }
      }
    }
  }
  if (!leaf) {
    const join = (a, b) => indices.push(a, b, a + layerSize, b, b + layerSize, a + layerSize);
    for (let i = 0; i < rows; i++) {
      join(i * (columns + 1), (i + 1) * (columns + 1));
      join((i + 1) * (columns + 1) + columns, i * (columns + 1) + columns);
    }
    for (let j = 0; j < columns; j++) {
      join(j + 1, j);
      join(rows * (columns + 1) + j, rows * (columns + 1) + j + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  if (poppy) {
    const colors = [];
    const ink = new THREE.Color('#211522');
    const white = new THREE.Color('#ffffff');
    for (let i = 0; i < geometry.attributes.uv.count; i++) {
      const t = geometry.attributes.uv.getY(i);
      const u = geometry.attributes.uv.getX(i) * 2 - 1;
      const edge = 0.29 + 0.035 * Math.cos(u * 6 + variant);
      const color = ink.clone().lerp(white, THREE.MathUtils.smoothstep(t, 0.07, edge));
      colors.push(color.r, color.g, color.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  }
  return geometry;
}

function poppyGrain() {
  const size = 256;
  const data = new Uint8Array(size * size * 4);
  const random = seededRandom(931);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const t = y / (size - 1), u = x / (size - 1) * 2 - 1;
    const vein = Math.sin(u * 34 + Math.sin(t * 8 + u * 3) * 0.8) * Math.sin(Math.PI * t);
    const height = Math.round(128 + vein * 34 + (random() - 0.5) * 12);
    const offset = (y * size + x) * 4;
    data[offset] = data[offset + 1] = data[offset + 2] = height;
    data[offset + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.needsUpdate = true;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  return texture;
}

function brushedRoughness() {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  const random = seededRandom(744);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / (size - 1) * 2 - 1;
    const edge = Math.abs(u) ** 1.8;
    const vein = Math.cos(u * Math.PI * 3 + Math.sin(y / size * 5) * 0.12);
    const value = Math.round(180 + edge * 53 + vein * 6 + random() * 12);
    const offset = (y * size + x) * 4;
    data[offset] = data[offset + 1] = data[offset + 2] = value;
    data[offset + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.needsUpdate = true;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

// Merge the tiny filaments into a single draw, retaining actual surface normals.
export function mergeSurfaces(geometries) {
  const arrays = { position: [], normal: [], uv: [] };
  for (const geometry of geometries) {
    const flat = geometry.index ? geometry.toNonIndexed() : geometry;
    for (const name of Object.keys(arrays)) arrays[name].push(...flat.getAttribute(name).array);
    if (flat !== geometry) flat.dispose();
    geometry.dispose();
  }
  const merged = new THREE.BufferGeometry();
  for (const [name, values] of Object.entries(arrays)) {
    merged.setAttribute(name, new THREE.Float32BufferAttribute(values, name === 'uv' ? 2 : 3));
  }
  return merged;
}

export function makePetalBlade(pointAt) { return makeBlade(0, false, false, pointAt); }

export function makeFlowerAssets() {
  const petals = [0, 1, 2].map((variant) => makeBlade(variant));
  const poppyPetals = [0, 1, 2].map((variant) => makeBlade(variant, false, true));
  const poppyLeaf = makeBlade(0, true, false, poppyLeafPoint);
  const leaf = makeBlade(0, true);
  const roughnessMap = brushedRoughness();
  const base = { metalness: 0.97, roughness: 0.29, envMapIntensity: 1.65, roughnessMap, side: THREE.DoubleSide };
  const silver = new THREE.MeshStandardMaterial({ ...base, color: '#e4deea' });
  const lavender = new THREE.MeshStandardMaterial({ ...base, color: '#cbbcdf', roughness: 0.33 });
  const pink = new THREE.MeshStandardMaterial({ ...base, color: '#dfbfd5', roughness: 0.27 });
  const green = new THREE.MeshStandardMaterial({ color: '#8b9b82', metalness: 0.84, roughness: 0.36, envMapIntensity: 1.55, side: THREE.DoubleSide });
  const stem = new THREE.MeshStandardMaterial({ color: '#839379', metalness: 0.88, roughness: 0.32, envMapIntensity: 1.45 });
  const anther = new THREE.MeshStandardMaterial({ color: '#d5ee91', emissive: '#899d35', emissiveIntensity: 0.08, metalness: 0.58, roughness: 0.33 });
  const pistil = new THREE.MeshStandardMaterial({ color: '#cfb6df', metalness: 0.8, roughness: 0.25 });
  const antherGeometry = new THREE.SphereGeometry(1, 12, 8);
  const hitGeometry = new THREE.SphereGeometry(1.38, 12, 8);
  const hitMaterial = new THREE.MeshBasicMaterial({ visible: false });
  const poppyBump = poppyGrain();
  const poppyMaterials = ['#e3dce7', '#dfc4cb', '#c9bddb'].map((color) => new THREE.MeshStandardMaterial({ ...base, color, roughness: 0.32, vertexColors: true, bumpMap: poppyBump, bumpScale: 0.025 }));
  const poppyAnther = new THREE.MeshStandardMaterial({ color: '#e4ba80', metalness: 0.76, roughness: 0.34 });
  const poppyCenterMaterial = new THREE.MeshStandardMaterial({ color: '#302434', metalness: 0.65, roughness: 0.54, envMapIntensity: 1.1 });
  const poppyFilament = new THREE.MeshStandardMaterial({ color: '#77635f', metalness: 0.85, roughness: 0.34 });
  const pod = new THREE.CylinderGeometry(0.21, 0.16, 0.18, 16);
  pod.translate(0, 0.23, 0);
  const crown = [pod];
  for (let i = 0; i < 8; i++) {
    const ridge = new THREE.CylinderGeometry(0.009, 0.009, 0.36, 5);
    ridge.rotateZ(Math.PI / 2);
    ridge.rotateY(i * Math.PI / 8);
    ridge.translate(0, 0.33, 0);
    crown.push(ridge);
  }
  const poppyCenter = mergeSurfaces(crown);
  return { petals, poppyPetals, poppyLeaf, leaf, petalMaterials: [silver, lavender, pink], poppyMaterials, poppyCenter,
    poppyCenterMaterial, poppyFilament, poppyAnther, green, stem, anther, pistil, antherGeometry, hitGeometry, hitMaterial };
}

export function createLily(id, assets, random) {
  return createFlower(id, assets, random, 'lily');
}

export function createPoppy(id, assets, random) {
  return createFlower(id, assets, random, 'poppy');
}

function createFlower(id, assets, random, species) {
  const poppy = species === 'poppy';
  const root = new THREE.Group();
  const height = (poppy ? 2.45 : 2.65) + random() * 0.65;
  const bend = (random() - 0.5) * 0.4;
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.15, 0),
    new THREE.Vector3(-bend * 0.35, height * 0.3, 0.07),
    new THREE.Vector3(bend * 0.3, height * 0.7, -0.08),
    new THREE.Vector3(bend, height, 0),
  ]);
  const stemGeometry = new THREE.TubeGeometry(curve, 22, 0.025, 7, false);
  stemGeometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
  stemGeometry.attributes.normal.setUsage(THREE.DynamicDrawUsage);
  // Expand once for the maximum bend; avoid recalculating bounds every frame.
  stemGeometry.computeBoundingSphere();
  stemGeometry.boundingSphere.radius += 0.8;
  root.add(new THREE.Mesh(stemGeometry, assets.stem));
  const stemPositions = stemGeometry.attributes.position.array.slice();
  const stemNormals = stemGeometry.attributes.normal.array.slice();
  const privateGeometries = [stemGeometry];
  const leaves = [];
  for (let i = 0; i < (poppy ? 3 : 4); i++) {
    const blade = new THREE.Mesh(poppy ? assets.poppyLeaf : assets.leaf, assets.green);
    blade.position.copy(curve.getPoint(0.19 + i * 0.155));
    blade.rotation.set((random() - 0.5) * 0.12, i * 2.45 + id, 0.48 + i * 0.06);
    blade.scale.setScalar((poppy ? 0.48 : 0.65) + random() * 0.2);
    root.add(blade);
    leaves.push({ mesh: blade, position: blade.position.clone(), rotation: blade.rotation.clone(), phase: random() * Math.PI * 2 });
  }
  const head = new THREE.Group();
  head.position.set(bend, height, 0);
  head.rotation.set(poppy ? 0.38 + random() * 0.6 : 0.54 + random() * 0.3, random() * 0.4, (random() - 0.5) * (poppy ? 0.5 : 0.28));
  root.add(head);
  const petals = [];
  const petalCount = poppy ? 4 : 6;
  for (let i = 0; i < petalCount; i++) {
    const pivot = new THREE.Group();
    pivot.rotation.set((random() - 0.5) * 0.06, i / petalCount * Math.PI * 2 + (random() - 0.5) * 0.065, i % 2 ? 0.1 : -0.07);
    pivot.scale.set(0.96 + random() * 0.12 + (i % 2) * 0.03, 1, (i % 2 ? 0.91 : 1) * (0.94 + random() * 0.12));
    if (poppy) {
      pivot.rotation.y += (random() - 0.5) * 0.09;
      pivot.rotation.z = (i % 2 ? 0.11 : -0.025) + (random() - 0.5) * 0.08;
      pivot.position.y = i % 2 ? 0.055 : 0;
      pivot.scale.multiplyScalar(i % 2 ? 0.96 : 1.07);
    }
    pivot.add(new THREE.Mesh((poppy ? assets.poppyPetals : assets.petals)[(i + id) % 3], (poppy ? assets.poppyMaterials : assets.petalMaterials)[(id + i % 2) % 3]));
    head.add(pivot);
    petals.push({ pivot, rotation: pivot.rotation.clone(), phase: random() * Math.PI * 2 });
  }
  const stamens = new THREE.Group();
  const filaments = [];
  const stamenCount = poppy ? 56 : 6;
  const anthers = new THREE.InstancedMesh(assets.antherGeometry, poppy ? assets.poppyAnther : assets.anther, poppy ? stamenCount : 7);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < stamenCount; i++) {
    const angle = i / stamenCount * Math.PI * 2 + 0.2 + (poppy ? (random() - 0.5) * 0.08 : 0);
    const radius = (poppy ? 0.25 : 0.37) + random() * (poppy ? 0.3 : 0.1);
    const tip = new THREE.Vector3(Math.cos(angle) * radius, poppy ? 0.22 + random() * 0.25 : 0.92 + random() * 0.21, Math.sin(angle) * radius);
    const filamentCurve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(tip.x * (poppy ? 0.4 : 0), 0.1, tip.z * (poppy ? 0.4 : 0)), new THREE.Vector3(tip.x * (poppy ? 0.65 : 0.45), poppy ? 0.25 : 0.7, tip.z * (poppy ? 0.65 : 0.45)), tip);
    filaments.push(new THREE.TubeGeometry(filamentCurve, poppy ? 6 : 10, poppy ? 0.007 : 0.011, 5, false));
    dummy.position.copy(tip);
    if (poppy) dummy.scale.set(0.025, 0.018, 0.04).multiplyScalar(0.8 + random() * 0.5);
    else dummy.scale.set(0.145, 0.047, 0.062);
    dummy.rotation.set(0, -angle + 0.3, 0.2);
    dummy.updateMatrix();
    anthers.setMatrixAt(i, dummy.matrix);
  }
  if (!poppy) {
    const pistilGeometry = new THREE.CylinderGeometry(0.018, 0.023, 1.02, 7);
    pistilGeometry.translate(0, 0.62, 0);
    filaments.push(pistilGeometry);
  }
  const filamentGeometry = mergeSurfaces(filaments);
  privateGeometries.push(filamentGeometry);
  stamens.add(new THREE.Mesh(filamentGeometry, poppy ? assets.poppyFilament : assets.pistil));
  if (poppy) stamens.add(new THREE.Mesh(assets.poppyCenter, assets.poppyCenterMaterial));
  else {
    dummy.position.set(0, 1.14, 0);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(0.06, 0.035, 0.06);
    dummy.updateMatrix();
    anthers.setMatrixAt(6, dummy.matrix);
  }
  stamens.add(anthers);
  head.add(stamens);
  const hit = new THREE.Mesh(assets.hitGeometry, assets.hitMaterial);
  hit.scale.set(1.16, 0.58, 1.16);
  hit.position.y = 0.3;
  hit.userData.flowerId = id;
  head.add(hit);
  return {
    id, species, pollenHeight: poppy ? 0.43 : 0.85, root, head, petals, leaves, stamens, anthers, hit, height, bend,
    phase: random() * Math.PI * 2, baseRotation: head.rotation.clone(), privateGeometries,
    stemGeometry, stemPositions, stemNormals, lastBend: [Infinity, Infinity],
    response: { value: 0, velocity: 0 }, gesture: null, lastGesture: -Infinity,
  };
}

export function updateFlowerMotion(flower, time, swayX, swayZ, response, paused = false) {
  const poppy = flower.species === 'poppy';
  const snowdrop = flower.species === 'snowdrop';
  const { height, stemGeometry, stemPositions, stemNormals } = flower;
  if (Math.abs(swayX - flower.lastBend[0]) + Math.abs(swayZ - flower.lastBend[1]) > 0.00001) {
    const positions = stemGeometry.attributes.position.array;
    const normals = stemGeometry.attributes.normal.array;
    for (let i = 0; i < positions.length; i += 3) {
      const y = stemPositions[i + 1];
      const fraction = Math.max(0, y / height);
      positions[i] = stemPositions[i] + swayX * fraction * fraction;
      positions[i + 1] = y;
      positions[i + 2] = stemPositions[i + 2] + swayZ * fraction * fraction;
      const nx = stemNormals[i];
      const nz = stemNormals[i + 2];
      const ny = stemNormals[i + 1] - 2 * fraction / height * (swayX * nx + swayZ * nz);
      const length = Math.hypot(nx, ny, nz) || 1;
      normals[i] = nx / length;
      normals[i + 1] = ny / length;
      normals[i + 2] = nz / length;
    }
    stemGeometry.attributes.position.needsUpdate = true;
    stemGeometry.attributes.normal.needsUpdate = true;
    flower.lastBend[0] = swayX;
    flower.lastBend[1] = swayZ;
  }
  flower.head.position.set(flower.bend + swayX, height, swayZ);
  flower.head.rotation.x = flower.baseRotation.x + swayZ / height * 1.1 + response * (snowdrop ? 0.045 : 0.12);
  flower.head.rotation.z = flower.baseRotation.z - swayX / height * 1.1 + (snowdrop && !paused ? Math.sin(time * 0.8 + flower.phase) * 0.014 : 0);
  for (const leaf of flower.leaves) {
    const fraction = leaf.position.y / height;
    leaf.mesh.position.set(leaf.position.x + swayX * fraction ** 2, leaf.position.y, leaf.position.z + swayZ * fraction ** 2);
    leaf.mesh.rotation.x = leaf.rotation.x + (paused ? 0 : Math.sin(time * 1.4 + leaf.phase) * 0.025) + swayZ / height * fraction;
    leaf.mesh.rotation.z = leaf.rotation.z - swayX / height * fraction + response * Math.sin(leaf.phase) * 0.045;
  }
  for (const petal of flower.petals) {
    const flutter = paused ? 0 : Math.sin(time * (snowdrop ? 0.65 : poppy ? 1.8 : 1.1) + petal.phase) * (snowdrop ? 0.005 : poppy ? 0.025 : 0.009);
    petal.pivot.rotation.z = petal.rotation.z + flutter + response * ((snowdrop ? 0.035 : poppy ? 0.075 : 0.12) + Math.sin(petal.phase) * (snowdrop ? 0.008 : 0.035));
    petal.pivot.rotation.x = petal.rotation.x + response * Math.sin(petal.phase) * (poppy ? 0.05 : 0.025);
  }
  flower.stamens.rotation.z = -swayX / height * 0.45 + response * 0.028;
}

export const updateLilyMotion = updateFlowerMotion;
