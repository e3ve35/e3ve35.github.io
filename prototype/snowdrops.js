import * as THREE from './vendor/three.module.min.js';
import { bloomColors, distantDetail, makePetalBlade, mergeSurfaces, pearlFinish, taperStem } from './flowers.js?v=autumn-accents-2';
import { createPetalSurfaces } from './petal-surfaces.js?v=autumn-veins-1';

function snowdropPoint(t, u, inner = false, variant = 0) {
  if (!inner) {
    const belly = Math.sin(Math.PI * t);
    const flare = THREE.MathUtils.smoothstep(t, 0.27, 0.92);
    const tipCurl = THREE.MathUtils.smoothstep(t, 0.77, 1);
    const width = (0.27 + variant * 0.023) * Math.sin(Math.PI * t ** 1.12) ** 0.65;
    const groove = (0.035 * (1 - u * u) + 0.013 * Math.cos(u * 8)) * belly;
    return new THREE.Vector3(
      0.065 + 0.16 * belly + (0.53 + variant * 0.028) * flare - 0.045 * tipCurl + groove,
      -1.64 * t + 0.08 * t ** 4 + 0.028 * u * u * belly,
      u * width + 0.03 * Math.sin(t * 4 + variant) * belly,
    );
  }
  const profile = Math.sin(Math.PI * t * 0.75);
  const radius = 0.06 + 0.20 * Math.sin(Math.PI * t * 0.6) + 0.035 * t;
  const angle = u * 0.79 * profile ** 0.18;
  const ridge = 0.008 * Math.cos(u * 8) * Math.sin(Math.PI * t);
  const notch = Math.exp(-u * u * 16) * THREE.MathUtils.smoothstep(t, 0.7, 1) * 0.13;
  return new THREE.Vector3(
    (radius + ridge) * Math.cos(angle),
    -0.11 - t * 0.89 + notch,
    radius * Math.sin(angle),
  );
}

export function makeSnowdropAssets(assets) {
  const baseColor = new THREE.Color(bloomColors.innerPearl);
  const green = new THREE.Color(bloomColors.jade);
  const makeInner = (options) => {
    const inner = makePetalBlade((t, u) => snowdropPoint(t, u, true), options);
    const colors = [];
    for (let i = 0; i < inner.attributes.position.count; i++) {
      const t = inner.attributes.uv.getY(i);
      const u = inner.attributes.uv.getX(i) * 2 - 1;
      const mark = THREE.MathUtils.smoothstep(t, 0.70 + 0.17 * Math.abs(u), 0.78 + 0.17 * Math.abs(u));
      const color = baseColor.clone().lerp(green, mark * 0.95);
      colors.push(color.r, color.g, color.b);
    }
    inner.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return inner;
  };
  const outers = [0, 1, 2].map((variant) => makePetalBlade((t, u) => snowdropPoint(t, u, false, variant)));
  const inner = makeInner();
  const distantOuters = [0, 1, 2].map((variant) => makePetalBlade((t, u) => snowdropPoint(t, u, false, variant), distantDetail.snowdrop));
  const distantInner = makeInner(distantDetail.snowdrop);
  const surface = createPetalSurfaces('snowdrop');
  const material = new THREE.MeshStandardMaterial({
    ...pearlFinish, ...surface, bumpScale: 0.003, aoMapIntensity: 0.5,
  });
  const innerMaterial = material.clone();
  innerMaterial.color.set('#ffffff');
  innerMaterial.vertexColors = true;
  innerMaterial.metalness = 0.69;
  innerMaterial.roughness = 0.45;
  innerMaterial.bumpScale = 0.003;
  innerMaterial.aoMapIntensity = 0.3;
  const cap = new THREE.SphereGeometry(0.105, 14, 10);
  const capMaterial = new THREE.MeshStandardMaterial({ color: bloomColors.sage, metalness: 0.65, roughness: 0.4 });
  const leaf = makePetalBlade((t, u) => new THREE.Vector3(
    t * 2.1, t * 0.9 + 0.12 * Math.sin(Math.PI * t),
    u * 0.12 * Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.6) + 0.03 * Math.sin(t * Math.PI * 2),
  ));
  return { outer: outers[0], outers, inner, distantOuters, distantInner, leaf, surface, material, innerMaterial, cap, capMaterial };
}

export function createSnowdrop(id, assets, random, detail = 0) {
  const snow = assets.snowdrop;
  const root = new THREE.Group();
  const height = 3.15 + random() * 0.85;
  const bend = 0.55 + random() * 0.5;
  const archRise = 0.65 + random() * 0.15;
  const neckDepth = (random() - 0.5) * 0.3;
  // The arch is part of the deformable stem, so it stays joined to the pendant.
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.15, 0),
    new THREE.Vector3(-0.08, height * 0.38, -0.03),
    new THREE.Vector3(-0.14, height * 0.8, 0),
    new THREE.Vector3(-0.1, height + archRise * 0.74, neckDepth),
    new THREE.Vector3(bend * 0.55, height + archRise, neckDepth),
    new THREE.Vector3(bend, height + 0.28, 0),
    new THREE.Vector3(bend, height, 0),
  ]);
  const stemGeometry = taperStem(new THREE.TubeGeometry(curve, detail ? 32 : 64, 0.02, 8, false), 1.8, 0.85);
  stemGeometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
  stemGeometry.attributes.normal.setUsage(THREE.DynamicDrawUsage);
  stemGeometry.computeBoundingSphere();
  stemGeometry.boundingSphere.radius += 1;
  const stemPositions = stemGeometry.attributes.position.array.slice();
  const stemNormals = stemGeometry.attributes.normal.array.slice();
  root.add(new THREE.Mesh(stemGeometry, assets.stem));
  const leaves = [];
  for (let i = 0; i < 2; i++) {
    const mesh = new THREE.Mesh(snow.leaf, assets.green);
    mesh.position.copy(curve.getPoint(0.02 + i * 0.03));
    mesh.rotation.set(0, i * 2.7 + id * 0.7, 0.65 + i * 0.15);
    mesh.scale.set(1 + random() * 0.15, 0.95, 0.68);
    root.add(mesh);
    leaves.push({ mesh, position: mesh.position.clone(), rotation: mesh.rotation.clone(), phase: random() * Math.PI * 2 });
  }
  const head = new THREE.Group();
  head.position.set(bend, height, 0);
  head.rotation.set(-0.28 - random() * 0.28, random() * Math.PI * 2, (random() - 0.5) * 0.28);
  root.add(head);
  const petals = [];
  for (let i = 0; i < 6; i++) {
    const inner = i >= 3;
    const pivot = new THREE.Group();
    pivot.rotation.set(0, (i % 3) * Math.PI * 2 / 3 + (inner ? Math.PI / 3 : 0), inner ? 0 : 0.02 + random() * 0.1);
    pivot.scale.set(0.94 + random() * 0.12, 0.94 + random() * 0.12, 1);
    pivot.add(new THREE.Mesh(inner ? (detail ? snow.distantInner : snow.inner) : (detail ? snow.distantOuters : snow.outers)[i], inner ? snow.innerMaterial : snow.material));
    head.add(pivot);
    petals.push({ pivot, rotation: pivot.rotation.clone(), phase: random() * Math.PI * 2 });
  }
  const cap = new THREE.Mesh(snow.cap, snow.capMaterial);
  cap.position.y = 0.07;
  cap.scale.set(1, 1.6, 1);
  head.add(cap);
  const stamens = new THREE.Group();
  const filaments = [];
  const anthers = new THREE.InstancedMesh(assets.antherGeometry, assets.anther, 6);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI * 2 / 6;
    const x = Math.cos(angle) * 0.11, z = Math.sin(angle) * 0.11;
    const filament = new THREE.CylinderGeometry(0.008, 0.009, 0.93, 5);
    filament.translate(x, -0.54, z);
    filaments.push(filament);
    dummy.position.set(x, -1.03, z);
    dummy.scale.set(0.028, 0.075, 0.025);
    dummy.updateMatrix();
    anthers.setMatrixAt(i, dummy.matrix);
  }
  const filamentGeometry = mergeSurfaces(filaments);
  stamens.add(new THREE.Mesh(filamentGeometry, assets.pistil), anthers);
  head.add(stamens);
  const hit = new THREE.Mesh(assets.hitGeometry, assets.hitMaterial);
  hit.scale.set(0.7, 0.7, 0.7);
  hit.position.y = -0.75;
  hit.userData.flowerId = id;
  head.add(hit);
  return {
    id, species: 'snowdrop', pollenHeight: -1.65, pollenMode: 2,
    root, head, petals, leaves, stamens, anthers, hit, height, bend,
    phase: random() * Math.PI * 2, baseRotation: head.rotation.clone(),
    privateGeometries: [stemGeometry, filamentGeometry], stemGeometry, stemPositions, stemNormals,
    lastBend: [Infinity, Infinity], response: { value: 0, velocity: 0 }, gesture: null, lastGesture: -Infinity,
  };
}
