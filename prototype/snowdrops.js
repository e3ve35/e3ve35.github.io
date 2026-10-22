import * as THREE from './vendor/three.module.min.js';
import { makePetalBlade, mergeSurfaces } from './flowers.js?v=sculpted-flowers-1';

function snowdropPoint(t, u, inner = false, variant = 0) {
  const profile = Math.sin(Math.PI * t * 0.75);
  const flare = Math.pow(THREE.MathUtils.smoothstep(t, 0.3, 1), 1.15);
  const radius = inner
    ? 0.055 + 0.24 * Math.sin(Math.PI * t * 0.6) + 0.035 * t
    : 0.055 + profile * 0.22 + flare * (0.48 + variant * 0.025);
  const width = inner ? Math.pow(Math.max(0, profile), 0.18) : Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.58);
  const angle = u * (inner ? 0.95 : 1.05) * width;
  const ridge = (Math.cos(u * 8) * 0.009 + Math.cos(u * 18) * 0.003) * Math.sin(Math.PI * t);
  const notch = inner ? Math.exp(-u * u * 16) * THREE.MathUtils.smoothstep(t, 0.7, 1) * 0.1 : 0;
  const y = inner ? -0.1 - t * 0.86 + notch : -t * 1.65 + Math.pow(t, 4) * 0.1;
  return new THREE.Vector3(
    (radius + ridge) * Math.cos(angle),
    y + (inner ? 0 : Math.sin(u * 4 + variant) * 0.025 * t * Math.sin(Math.PI * t)),
    radius * Math.sin(angle) + (inner ? 0 : Math.sin(t * 3 + variant) * t * 0.025),
  );
}

export function makeSnowdropAssets(assets) {
  const outers = [0, 1, 2].map((variant) => makePetalBlade((t, u) => snowdropPoint(t, u, false, variant)));
  const inner = makePetalBlade((t, u) => snowdropPoint(t, u, true));
  const colors = [];
  const baseColor = new THREE.Color('#dce5e7');
  const green = new THREE.Color('#456c56');
  for (let i = 0; i < inner.attributes.position.count; i++) {
    const t = inner.attributes.uv.getY(i);
    const u = inner.attributes.uv.getX(i) * 2 - 1;
    const mark = THREE.MathUtils.smoothstep(t, 0.70 + 0.17 * Math.abs(u), 0.78 + 0.17 * Math.abs(u));
    const color = baseColor.clone().lerp(green, mark * 0.95);
    colors.push(color.r, color.g, color.b);
  }
  inner.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const material = new THREE.MeshStandardMaterial({
    color: '#e1eaf0', metalness: 0.90, roughness: 0.30,
    roughnessMap: assets.petalMaterials[0].roughnessMap,
    envMapIntensity: 1.5, side: THREE.DoubleSide,
  });
  const innerMaterial = material.clone();
  innerMaterial.color.set('#ffffff');
  innerMaterial.vertexColors = true;
  const cap = new THREE.SphereGeometry(0.105, 14, 10);
  const capMaterial = new THREE.MeshStandardMaterial({ color: '#91aa9e', metalness: 0.65, roughness: 0.4 });
  const antherMaterial = new THREE.MeshStandardMaterial({ color: '#dfc477', metalness: 0.7, roughness: 0.33 });
  const leaf = makePetalBlade((t, u) => new THREE.Vector3(
    t * 2.1, t * 0.9 + 0.12 * Math.sin(Math.PI * t),
    u * 0.12 * Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.6) + 0.03 * Math.sin(t * Math.PI * 2),
  ));
  return { outer: outers[0], outers, inner, leaf, material, innerMaterial, cap, capMaterial, antherMaterial };
}

export function createSnowdrop(id, assets, random) {
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
  const stemGeometry = new THREE.TubeGeometry(curve, 64, 0.02, 8, false);
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
    pivot.add(new THREE.Mesh(inner ? snow.inner : snow.outers[i], inner ? snow.innerMaterial : snow.material));
    head.add(pivot);
    petals.push({ pivot, rotation: pivot.rotation.clone(), phase: random() * Math.PI * 2 });
  }
  const cap = new THREE.Mesh(snow.cap, snow.capMaterial);
  cap.position.y = 0.07;
  cap.scale.set(1, 1.6, 1);
  head.add(cap);
  const stamens = new THREE.Group();
  const filaments = [];
  const anthers = new THREE.InstancedMesh(assets.antherGeometry, snow.antherMaterial, 6);
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
