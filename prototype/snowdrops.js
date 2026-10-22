import * as THREE from './vendor/three.module.min.js';
import { makePetalBlade, mergeSurfaces } from './flowers.js?v=snowdrop-study-1';

function snowdropPoint(t, u, inner = false) {
  const profile = Math.pow(Math.max(0, Math.sin(Math.PI * t * 0.94)), 0.7);
  const flare = THREE.MathUtils.smoothstep(t, 0.7, 1) * (inner ? 0.06 : 0.18);
  const radius = (inner ? 0.045 : 0.075) + profile * (inner ? 0.23 : 0.5) + flare;
  const angle = u * (inner ? 0.93 : 1.03) * Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.22);
  const ridge = Math.cos(u * 8) * Math.sin(Math.PI * t) * 0.008;
  return new THREE.Vector3(
    (radius + ridge) * Math.cos(angle),
    -t * (inner ? 0.96 : 1.55) - (inner ? 0.08 : 0),
    radius * Math.sin(angle),
  );
}

export function makeSnowdropAssets(assets) {
  const outer = makePetalBlade((t, u) => snowdropPoint(t, u));
  const inner = makePetalBlade((t, u) => snowdropPoint(t, u, true));
  const colors = [];
  const baseColor = new THREE.Color('#dce5e7');
  const green = new THREE.Color('#77998b');
  const point = new THREE.Vector3();
  for (let i = 0; i < inner.attributes.position.count; i++) {
    point.fromBufferAttribute(inner.attributes.position, i);
    const mark = THREE.MathUtils.smoothstep(-point.y, 0.65, 0.94);
    const color = baseColor.clone().lerp(green, mark * 0.85);
    colors.push(color.r, color.g, color.b);
  }
  inner.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const material = new THREE.MeshStandardMaterial({
    color: '#e1eaf0', metalness: 0.97, roughness: 0.24,
    roughnessMap: assets.petalMaterials[0].roughnessMap,
    envMapIntensity: 1.7, side: THREE.DoubleSide,
  });
  const innerMaterial = material.clone();
  innerMaterial.color.set('#ffffff');
  innerMaterial.vertexColors = true;
  const cap = new THREE.SphereGeometry(0.13, 14, 10);
  const capMaterial = new THREE.MeshStandardMaterial({ color: '#91aa9e', metalness: 0.88, roughness: 0.3 });
  const antherMaterial = new THREE.MeshStandardMaterial({ color: '#dfc477', metalness: 0.7, roughness: 0.33 });
  return { outer, inner, material, innerMaterial, cap, capMaterial, antherMaterial };
}

export function createSnowdrop(id, assets, random) {
  const snow = assets.snowdrop;
  const root = new THREE.Group();
  const height = 3.65 + random() * 0.5;
  const bend = 0.72 + random() * 0.2;
  // The arch is part of the deformable stem, so it stays joined to the pendant.
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.15, 0),
    new THREE.Vector3(-0.08, height * 0.38, -0.03),
    new THREE.Vector3(-0.14, height * 0.8, 0),
    new THREE.Vector3(-0.1, height + 0.48, 0.02),
    new THREE.Vector3(0.4, height + 0.65, 0.02),
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
    const mesh = new THREE.Mesh(assets.leaf, assets.green);
    mesh.position.copy(curve.getPoint(0.02 + i * 0.03));
    mesh.rotation.set(0, i * 2.7 + id * 0.7, 0.65 + i * 0.15);
    mesh.scale.set(1 + random() * 0.15, 0.95, 0.68);
    root.add(mesh);
    leaves.push({ mesh, position: mesh.position.clone(), rotation: mesh.rotation.clone(), phase: random() * Math.PI * 2 });
  }
  const head = new THREE.Group();
  head.position.set(bend, height, 0);
  head.rotation.set(-0.2 + random() * 0.12, random() * Math.PI * 2, (random() - 0.5) * 0.2);
  root.add(head);
  const petals = [];
  for (let i = 0; i < 6; i++) {
    const inner = i >= 3;
    const pivot = new THREE.Group();
    pivot.rotation.set(0, (i % 3) * Math.PI * 2 / 3 + (inner ? Math.PI / 3 : 0), (random() - 0.5) * 0.045);
    pivot.scale.set(0.96 + random() * 0.09, 0.96 + random() * 0.08, 1);
    pivot.add(new THREE.Mesh(inner ? snow.inner : snow.outer, inner ? snow.innerMaterial : snow.material));
    head.add(pivot);
    petals.push({ pivot, rotation: pivot.rotation.clone(), phase: random() * Math.PI * 2 });
  }
  const cap = new THREE.Mesh(snow.cap, snow.capMaterial);
  cap.position.y = 0.07;
  cap.scale.set(1, 1.6, 1);
  head.add(cap);
  const stamens = new THREE.Group();
  const filaments = [];
  const anthers = new THREE.InstancedMesh(assets.antherGeometry, snow.antherMaterial, 3);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 3; i++) {
    const angle = i * Math.PI * 2 / 3;
    const x = Math.cos(angle) * 0.09, z = Math.sin(angle) * 0.09;
    const filament = new THREE.CylinderGeometry(0.008, 0.009, 0.78, 5);
    filament.translate(x, -0.43, z);
    filaments.push(filament);
    dummy.position.set(x, -0.86, z);
    dummy.scale.set(0.028, 0.075, 0.025);
    dummy.updateMatrix();
    anthers.setMatrixAt(i, dummy.matrix);
  }
  const filamentGeometry = mergeSurfaces(filaments);
  stamens.add(new THREE.Mesh(filamentGeometry, assets.pistil), anthers);
  head.add(stamens);
  const hit = new THREE.Mesh(assets.hitGeometry, assets.hitMaterial);
  hit.scale.set(0.58, 0.7, 0.58);
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
