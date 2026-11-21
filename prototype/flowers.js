import * as THREE from './vendor/three.module.min.js';
import { createPetalSurfaces } from './petal-surfaces.js?v=autumn-veins-1';

export const pearlFinish = Object.freeze({
  color: '#e6edf1', metalness: 0.82, roughness: 0.41, envMapIntensity: 1.35,
  side: THREE.DoubleSide,
});
export const bloomColors = Object.freeze({
  innerPearl: '#dce5e7', jade: '#56876c', sage: '#91aa9e', pollenGold: '#dfc477',
});

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
  const length = [1.65, 1.72, 1.60][variant];
  const width = Math.max(0, edge) ** 0.74 * [0.49, 0.47, 0.46][variant];
  // A rounded midrib groove, a tip that rolls back on itself, and a lightly
  // ruffled margin keep the tepal from reading as two flat plates.
  const midrib = Math.exp(-u * u * 7);
  const recurve = THREE.MathUtils.smoothstep(t, 0.6, 1);
  const ruffle = Math.sin(t * 17 + variant * 2.1) * 0.022 * Math.abs(u) ** 3 * edge;
  return new THREE.Vector3(
    length * (t - 0.1 * recurve * recurve),
    0.12 + 0.78 * Math.sin(t * Math.PI * 0.86) - 0.75 * t ** 4 - 0.17 * recurve * recurve
      + u * u * 0.18 * edge - 0.07 * midrib * edge + ruffle,
    u * width,
  );
}

function poppyPoint(t, u, variant) {
  const angle = u * (1.045 + 0.045 * Math.sin(t * Math.PI));
  const rim = THREE.MathUtils.smoothstep(t, 0.62, 1);
  const radius = t * (1.48 + variant * 0.045 - u * u * 0.08
    + Math.sin(u * 4.5 + variant * 1.7) * 0.07
    + Math.sin(u * 15 + variant) * 0.025 * rim);
  const fold = Math.sin(u * 16 + Math.sin(t * 6 + variant) * 0.8) * 0.025 * Math.sin(Math.PI * t * 0.85) * Math.sqrt(t);
  const rimCurl = (Math.sin(u * 10 + variant * 2) * 0.048 + Math.cos(u * 18 - variant) * 0.018) * rim;
  const edgeCurl = Math.sin(t * 14 + variant) * 0.038 * Math.abs(u) ** 5 * t;
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

function makeBlade(variant = 0, leaf = false, poppy = false, pointAt = null, options = {}) {
  const rows = options.rows ?? (leaf ? 22 : poppy ? 52 : 38);
  const columns = options.columns ?? (leaf ? 8 : poppy ? 36 : 20);
  const layers = leaf ? 1 : 2;
  const surface = pointAt ?? (poppy ? (t, u) => poppyPoint(t, u, variant) : (t, u) => petalPoint(t, u, variant, leaf));
  const normalThickness = options.normalThickness ?? poppy;
  const layerSize = (rows + 1) * (columns + 1);
  const positions = [];
  const uv = [];
  const indices = [];
  for (let layer = 0; layer < layers; layer++) {
    for (let i = 0; i <= rows; i++) {
      for (let j = 0; j <= columns; j++) {
        const t = i / rows;
        const u = j / columns * 2 - 1;
        const point = surface(t, u);
        if (!leaf) {
          const thickness = (layer ? -1 : 1) * (0.003 + 0.005 * Math.sin(Math.PI * t));
          if (normalThickness) {
            // Near a tapered tip, sample slightly inside the surface so the
            // cross-petal tangent still has a direction.
            const sample = THREE.MathUtils.clamp(t, 0.001, 0.999);
            const across = surface(sample, Math.min(u + 0.001, 1)).sub(surface(sample, Math.max(u - 0.001, -1)));
            const along = surface(sample + 0.001, u).sub(surface(sample - 0.001, u));
            point.addScaledVector(across.cross(along).normalize(), thickness);
          } else {
            point.y += thickness;
          }
        }
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

export function makePetalBlade(pointAt, options = {}) { return makeBlade(0, false, false, pointAt, { ...options, normalThickness: true }); }

// Distant drifts use these coarser grids; at that size the silhouette is identical.
export const distantDetail = Object.freeze({ lily: { rows: 14, columns: 8 }, poppy: { rows: 20, columns: 14 }, snowdrop: { rows: 14, columns: 8 } });

// TubeGeometry has one radius. Scale each ring about its centre so stems
// thicken toward the soil and narrow under the bloom.
export function taperStem(geometry, base = 1.9, tip = 0.95) {
  const { path, tubularSegments, radialSegments } = geometry.parameters;
  const position = geometry.attributes.position;
  const centre = new THREE.Vector3();
  for (let i = 0; i <= tubularSegments; i++) {
    const t = i / tubularSegments;
    path.getPointAt(t, centre);
    const factor = base + (tip - base) * t ** 0.7;
    for (let j = 0; j <= radialSegments; j++) {
      const index = i * (radialSegments + 1) + j;
      position.setXYZ(index,
        centre.x + (position.getX(index) - centre.x) * factor,
        centre.y + (position.getY(index) - centre.y) * factor,
        centre.z + (position.getZ(index) - centre.z) * factor);
    }
  }
  return geometry;
}

export function makeFlowerAssets() {
  const petals = [0, 1, 2].map((variant) => makeBlade(variant, false, false, null, { normalThickness: true }));
  const poppyPetals = [0, 1, 2].map((variant) => makeBlade(variant, false, true));
  const distantPetals = [0, 1, 2].map((variant) => makeBlade(variant, false, false, null, { ...distantDetail.lily, normalThickness: true }));
  const distantPoppyPetals = [0, 1, 2].map((variant) => makeBlade(variant, false, true, null, distantDetail.poppy));
  // One cheap blade, instanced a few thousand times for the meadow.
  const grassBlade = makeBlade(0, true, false, null, { rows: 5, columns: 2 });
  // A small cup of sepals joins every upright bloom to its stem.
  const calyx = new THREE.LatheGeometry([[0.03, -0.11], [0.062, -0.05], [0.108, 0.03], [0.124, 0.1], [0.1, 0.145]].map(([x, y]) => new THREE.Vector2(x, y)), 12);
  const poppyLeaf = makeBlade(0, true, false, poppyLeafPoint);
  const leaf = makeBlade(0, true);
  const lilySurface = createPetalSurfaces('lily');
  const poppySurface = createPetalSurfaces('poppy');
  const petalMaterials = [['#e0dce9', 0.19], ['#c7b6dd', 0.23], ['#dbb8d4', 0.17]].map(([color, roughness]) => new THREE.MeshStandardMaterial({
    ...lilySurface, color, roughness, metalness: 1, envMapIntensity: 2.1,
    side: THREE.DoubleSide, bumpScale: 0.003, aoMapIntensity: 0.5,
  }));
  const green = new THREE.MeshStandardMaterial({ color: '#8b9b82', metalness: 0.84, roughness: 0.36, envMapIntensity: 1.55, side: THREE.DoubleSide });
  const stem = new THREE.MeshStandardMaterial({ color: '#839379', metalness: 0.88, roughness: 0.32, envMapIntensity: 1.45 });
  const anther = new THREE.MeshStandardMaterial({ color: bloomColors.pollenGold, metalness: 0.7, roughness: 0.33 });
  const lilyAnther = new THREE.MeshStandardMaterial({ color: '#dcfa7e', emissive: '#8ea51f', emissiveIntensity: 0.12, metalness: 0.65, roughness: 0.27 });
  const lilyFilament = new THREE.MeshStandardMaterial({ color: '#c6a3e1', metalness: 0.84, roughness: 0.18 });
  const pistil = new THREE.MeshStandardMaterial({ color: '#cfb6df', metalness: 0.8, roughness: 0.25 });
  const antherGeometry = new THREE.SphereGeometry(1, 12, 8);
  const hitGeometry = new THREE.SphereGeometry(1.38, 12, 8);
  const hitMaterial = new THREE.MeshBasicMaterial({ visible: false });
  const poppyMaterials = ['#e3dce7', '#dfc4cb', '#c9bddb'].map((color) => new THREE.MeshStandardMaterial({
    ...poppySurface, color, metalness: 0.97, roughness: 0.41, envMapIntensity: 1.65,
    side: THREE.DoubleSide, vertexColors: true, bumpScale: 0.003, aoMapIntensity: 0.4,
  }));
  const poppyCenterMaterial = new THREE.MeshStandardMaterial({ color: '#302434', metalness: 0.65, roughness: 0.54, envMapIntensity: 1.1 });
  const poppyAnther = new THREE.MeshStandardMaterial({ color: '#e4ba80', metalness: 0.76, roughness: 0.34 });
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
  return { petals, poppyPetals, distantPetals, distantPoppyPetals, grassBlade, calyx, poppyLeaf, leaf, surfaces: { lily: lilySurface, poppy: poppySurface }, petalMaterials, poppyMaterials, poppyCenter,
    poppyCenterMaterial, poppyAnther, poppyFilament, green, stem, anther, lilyAnther, lilyFilament, pistil, antherGeometry, hitGeometry, hitMaterial };
}

// detail 1 selects the coarser distant meshes; 0 is the full model.
export function createLily(id, assets, random, detail = 0) {
  return createFlower(id, assets, random, 'lily', detail);
}

export function createPoppy(id, assets, random, detail = 0) {
  return createFlower(id, assets, random, 'poppy', detail);
}

function addCalyx(head, assets, y, scale) {
  const calyx = new THREE.Mesh(assets.calyx, assets.stem);
  calyx.position.y = y;
  calyx.scale.set(scale, 1, scale);
  head.add(calyx);
}

function createFlowerStem(id, assets, random, poppy, foliage = poppy ? assets.poppyLeaf : assets.leaf, heightScale = 1) {
  const root = new THREE.Group();
  const height = ((poppy ? 2.45 : 2.65) + random() * 0.65) * heightScale;
  const bend = (random() - 0.5) * 0.4;
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.15, 0),
    new THREE.Vector3(-bend * 0.35, height * 0.3, 0.07),
    new THREE.Vector3(bend * 0.3, height * 0.7, -0.08),
    new THREE.Vector3(bend, height, 0),
  ]);
  const stemGeometry = taperStem(new THREE.TubeGeometry(curve, 22, 0.025, 7, false));
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
  const leafSizeFactor = Math.sqrt(heightScale);
  for (let i = 0; i < (poppy ? 3 : 4); i++) {
    const blade = new THREE.Mesh(foliage, assets.green);
    blade.position.copy(curve.getPoint(0.19 + i * 0.155));
    blade.rotation.set((random() - 0.5) * 0.12, i * 2.45 + id, 0.48 + i * 0.06);
    blade.scale.setScalar(((poppy ? 0.48 : 0.65) + random() * 0.2) * leafSizeFactor);
    root.add(blade);
    leaves.push({ mesh: blade, position: blade.position.clone(), rotation: blade.rotation.clone(), phase: random() * Math.PI * 2 });
  }
  return { root, height, bend, stemGeometry, stemPositions, stemNormals, privateGeometries, leaves };
}

function createFlower(id, assets, random, species, detail = 0) {
  const poppy = species === 'poppy';
  const stem = createFlowerStem(id, assets, random, poppy);
  const { root, height, bend, privateGeometries } = stem;
  const head = new THREE.Group();
  head.position.set(bend, height, 0);
  head.rotation.set(poppy ? 0.38 + random() * 0.6 : 0.54 + random() * 0.3, random() * 0.4, (random() - 0.5) * (poppy ? 0.5 : 0.28));
  root.add(head);
  const petals = [];
  const petalCount = poppy ? 4 : 6;
  const petalGeometries = poppy ? (detail ? assets.distantPoppyPetals : assets.poppyPetals) : (detail ? assets.distantPetals : assets.petals);
  addCalyx(head, assets, poppy ? -0.03 : 0, poppy ? 1.25 : 1);
  for (let i = 0; i < petalCount; i++) {
    const pivot = new THREE.Group();
    pivot.rotation.set((random() - 0.5) * 0.06, i / petalCount * Math.PI * 2 + (random() - 0.5) * 0.065, i % 2 ? 0.1 : -0.07);
    pivot.scale.set(0.96 + random() * 0.12 + (i % 2) * 0.03, 1, (i % 2 ? 0.91 : 1) * (0.94 + random() * 0.12));
    if (!poppy) {
      // Two whorls: three broad inner tepals sit slightly above three narrower outer ones.
      pivot.position.y = i % 2 ? 0.035 : 0;
      pivot.scale.z *= i % 2 ? 1.2 : 0.87;
    }
    if (poppy) {
      pivot.rotation.y += (random() - 0.5) * 0.09;
      pivot.rotation.z = (i % 2 ? 0.11 : -0.025) + (random() - 0.5) * 0.08;
      pivot.position.y = i % 2 ? 0.095 : 0;
      pivot.scale.multiplyScalar(i % 2 ? 0.96 : 1.07);
    }
    pivot.add(new THREE.Mesh(petalGeometries[(i + id) % 3], (poppy ? assets.poppyMaterials : assets.petalMaterials)[(id + i % 2) % 3]));
    head.add(pivot);
    petals.push({ pivot, rotation: pivot.rotation.clone(), phase: random() * Math.PI * 2 });
  }
  const stamens = new THREE.Group();
  const filaments = [];
  const stamenCount = poppy ? (detail ? 22 : 56) : 6;
  const anthers = new THREE.InstancedMesh(assets.antherGeometry, poppy ? assets.poppyAnther : assets.lilyAnther, poppy ? stamenCount : 7);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < stamenCount; i++) {
    const angle = i / stamenCount * Math.PI * 2 + 0.2 + (poppy ? (random() - 0.5) * 0.08 : 0);
    const radius = (poppy ? 0.25 : 0.37) + random() * (poppy ? 0.3 : 0.1);
    const tip = new THREE.Vector3(Math.cos(angle) * radius, poppy ? 0.22 + random() * 0.25 : 0.92 + random() * 0.21, Math.sin(angle) * radius);
    const filamentCurve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(tip.x * (poppy ? 0.4 : 0), 0.1, tip.z * (poppy ? 0.4 : 0)), new THREE.Vector3(tip.x * (poppy ? 0.65 : 0.45), poppy ? 0.25 : 0.7, tip.z * (poppy ? 0.65 : 0.45)), tip);
    filaments.push(new THREE.TubeGeometry(filamentCurve, poppy ? 6 : 10, poppy ? 0.007 : 0.011, 5, false));
    dummy.position.copy(tip);
    if (poppy) dummy.scale.set(0.025, 0.018, 0.04).multiplyScalar(0.8 + random() * 0.5);
    else dummy.scale.set(0.118, 0.04, 0.052);
    // Lily anthers pivot freely on their filaments, so no two sit alike.
    if (poppy) dummy.rotation.set(0, -angle + 0.3, 0.2);
    else dummy.rotation.set((random() - 0.5) * 0.9, -angle + 0.3 + (random() - 0.5) * 1.3, 0.2 + (random() - 0.5) * 0.8);
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
  stamens.add(new THREE.Mesh(filamentGeometry, poppy ? assets.poppyFilament : assets.lilyFilament));
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
    ...stem, id, species, pollenHeight: poppy ? 0.43 : 0.85, head, petals, stamens, anthers, hit,
    phase: random() * Math.PI * 2, baseRotation: head.rotation.clone(), lastBend: [Infinity, Infinity],
    response: { value: 0, velocity: 0 }, gesture: null, lastGesture: -Infinity,
  };
}

export function makeChrysanthemumAssets(assets) {
  const material = assets.petalMaterials[0].clone();
  // Petal bodies stay solid and write depth, so tiers and the stem occlude each
  // other correctly; only the curled tips thin out toward glass.
  const surface = createPetalSurfaces('chrysanthemum');
  material.setValues({ ...pearlFinish, ...surface, bumpScale: 0.0045, aoMapIntensity: 0.6, side: THREE.FrontSide, transparent: true });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = 'varying float vPetalLength;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvPetalLength=uv.y;');
    shader.fragmentShader = 'varying float vPetalLength;\n' + shader.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\ngl_FragColor.a*=1.-.62*smoothstep(.42,1.,vPetalLength);')
      // Thin tips and grazing edges carry a warm light of their own, as if the
      // bloom were lit from behind. A real backlight would also flare the floor.
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\nfloat petalRim=pow(1.-abs(dot(normal,normalize(vViewPosition))),3.);\ntotalEmissiveRadiance+=vec3(1.,.76,.82)*(.2*smoothstep(.55,1.,vPetalLength)+.3*petalRim);')
      // A lilac-rose blush gathers at each petal's base and fades by mid-length.
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb*=mix(vec3(.74,.60,.84),vec3(1.),smoothstep(.02,.5,vPetalLength));');
  };
  // Pearl, blush, and pale lilac blooms share the field.
  const materials = [null, '#f4d6e4', '#dbd0f2'].map((color) => {
    if (!color) return material;
    const tint = material.clone();
    tint.color.set(color);
    tint.onBeforeCompile = material.onBeforeCompile;
    return tint;
  });
  const layers = [
    { count: 11, base: 0.11, level: 0.10, length: 0.96, lift: 0.30, curl: 2.03, droop: 0.20, width: 0.178 },
    { count: 10, base: 0.10, level: 0.21, length: 0.74, lift: 0.34, curl: 2.16, droop: 0.11, width: 0.150 },
    { count: 8, base: 0.08, level: 0.33, length: 0.54, lift: 0.33, curl: 2.32, droop: 0.06, width: 0.125 },
    { count: 7, base: 0.06, level: 0.44, length: 0.34, lift: 0.26, curl: 2.48, droop: 0.025, width: 0.104 },
  ];
  const buildTiers = (rows, columns) => {
  // Reseeding gives both detail levels the same petal arrangement.
  const random = seededRandom(410);
  return layers.map(({ count, base, level, length, lift, curl, droop, width }, tier) => {
    const petals = Array.from({ length: count }, (_, i) => {
      const reach = length * (0.86 + random() * 0.28);
      const rise = lift * (0.83 + random() * 0.34);
      const sweep = curl + (random() - 0.5) * 0.43;
      const fall = droop * (0.72 + random() * 0.56);
      const yaw = i * Math.PI * 2 / count + tier * 0.21 + (random() - 0.5) * 0.13;
      const twist = (random() - 0.5) * 0.14;
      const sideSweep = 0.06 + tier * 0.032 + (random() - 0.5) * 0.32;
      const curlTiming = (random() - 0.5) * 0.48;
      const outline = 0.76 + random() * 0.25;
      const breadth = width * (0.86 + random() * 0.27);
      const petal = makeBlade(0, false, false, (t, u) => {
        // The arc passes vertical before the tip, turning back toward the crown.
        const tip = THREE.MathUtils.smoothstep(t, 0.64, 1);
        const edge = u * u;
        const roundCap = edge * (0.62 + 0.38 * edge);
        const progress = t - 0.13 * roundCap * tip;
        const tangent = sweep * (progress + curlTiming * progress * (1 - progress));
        const turn = Math.sin(tangent);
        const spread = Math.sin(Math.PI * t ** outline) ** 0.72;
        const rim = THREE.MathUtils.lerp(spread, 0.82, tip);
        const cup = (edge * (0.041 + 0.023 * t) + u * twist) * rim;
        const radius = base + (reach - cup) * turn;
        const halfAngle = Math.min(breadth * rim / radius, Math.PI / count * 0.93);
        const angle = u * halfAngle + sideSweep * progress * progress;
        return new THREE.Vector3(
          radius * Math.cos(angle),
          level + rise * (1 - Math.cos(tangent)) - fall * Math.sin(progress * Math.PI * 0.82) + cup * Math.cos(tangent),
          radius * Math.sin(angle),
        );
      }, { rows, columns, normalThickness: true });
      return petal.rotateY(yaw);
    });
    return { geometry: mergeSurfaces(petals), material };
  });
  };
  const tiers = buildTiers(20, 7);
  const distantTiers = buildTiers(8, 3);
  const florets = Array.from({ length: 34 }, (_, i) => {
    const angle = i * Math.PI * (3 - Math.sqrt(5));
    const radius = 0.20 * Math.sqrt(i / 34);
    // Alternating sizes break up the disc into a tighter, seedier cluster.
    const size = i % 3 ? 0.82 : 1.08;
    return new THREE.SphereGeometry(1, 8, 6)
      .scale(0.024 * size, 0.046 * size, 0.024 * size)
      .translate(Math.cos(angle) * radius, 0.49 + (1 - radius / 0.20) * 0.08, Math.sin(angle) * radius);
  });
  const center = mergeSurfaces(florets);
  const centerMaterial = assets.anther.clone();
  centerMaterial.roughness = 0.52;
  centerMaterial.emissive.set('#8a6414');
  centerMaterial.emissiveIntensity = 0.35;
  const leaf = makeBlade(0, true, false, (t, u) => {
    const outline = Math.sin(Math.PI * t) ** 0.75;
    const lobes = 0.82 + 0.18 * Math.cos(t * Math.PI * 10);
    return new THREE.Vector3(t * 1.42, t * 0.76 - t * t * 0.44 + u * u * outline * 0.13, u * outline * lobes * 0.43);
  }, { rows: 28, columns: 10 });
  return { tiers, distantTiers, materials, center, centerMaterial, leaf, surface };
}

export function createChrysanthemum(id, assets, random, detail = 0) {
  const chrysanthemum = assets.chrysanthemum;
  // Use the middle spot in each drift for a low bloom and keep the lead tall.
  const lowBloom = id % 3 === 1;
  const stem = createFlowerStem(id, assets, random, true, chrysanthemum.leaf, lowBloom ? 0.27 : 1);
  const { root, height, bend } = stem;
  const head = new THREE.Group();
  head.position.set(bend, height, 0);
  head.scale.setScalar(1.5);
  const tilt = 0.42 + random() * 0.27;
  head.rotation.set(tilt * (lowBloom ? 0.48 : 1), random() * 2 * Math.PI, (random() - 0.5) * 0.27);
  root.add(head);
  addCalyx(head, assets, -0.03, 1.75);
  const material = chrysanthemum.materials[id % chrysanthemum.materials.length];
  const petals = (detail ? chrysanthemum.distantTiers : chrysanthemum.tiers).map(({ geometry }) => {
    const pivot = new THREE.Mesh(geometry, material);
    pivot.rotation.y = random() * 0.12;
    pivot.rotation.z = (random() - 0.5) * 0.065;
    const spread = 0.95 + random() * 0.10;
    pivot.scale.set(spread, 0.91 + random() * 0.18, spread);
    head.add(pivot);
    return { pivot, rotation: pivot.rotation.clone(), phase: random() * Math.PI * 2 };
  });
  const stamens = new THREE.Mesh(chrysanthemum.center, chrysanthemum.centerMaterial);
  head.add(stamens);
  const hit = new THREE.Mesh(assets.hitGeometry, assets.hitMaterial);
  hit.scale.set(0.91, 0.59, 0.91);
  hit.position.y = 0.36;
  hit.userData.flowerId = id;
  head.add(hit);
  return {
    ...stem, id, species: 'chrysanthemum', pollenHeight: 0.72, head, petals, stamens, hit,
    phase: random() * Math.PI * 2, baseRotation: head.rotation.clone(), lastBend: [Infinity, Infinity],
    response: { value: 0, velocity: 0 }, gesture: null, lastGesture: -Infinity,
  };
}

export function updateFlowerMotion(flower, time, swayX, swayZ, response, paused = false) {
  const poppy = flower.species === 'poppy';
  const snowdrop = flower.species === 'snowdrop';
  const petalResponse = flower.species === 'chrysanthemum' ? response * 0.33 : response;
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
    petal.pivot.rotation.z = petal.rotation.z + flutter + petalResponse * ((snowdrop ? 0.035 : poppy ? 0.075 : 0.12) + Math.sin(petal.phase) * (snowdrop ? 0.008 : 0.035));
    petal.pivot.rotation.x = petal.rotation.x + petalResponse * Math.sin(petal.phase) * (poppy ? 0.05 : 0.025);
  }
  flower.stamens.rotation.z = -swayX / height * 0.45 + response * 0.028;
}

export const updateLilyMotion = updateFlowerMotion;
