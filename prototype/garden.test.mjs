import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { bloomEnvelope, bloomProfile, flowerCharacter, gestureStrength, rippleEnvelope, stepSpring } from './expressions.js';
import { createLily, createPoppy, createChrysanthemum, distantDetail, makeChrysanthemumAssets, makeFlowerAssets, seededRandom, taperStem, updateFlowerMotion } from './flowers.js';
import { AsciiPollen, PollenPool } from './pollen.js';
import * as THREE from './vendor/three.module.min.js';
import { flowerNote, GardenAudio, harmonyFor, leadWave, nextPulse, pulseFor, sequenceStep } from './audio.js';
import { gardenStudy, gardenSelection } from './studies.js';
import { createSnowdrop, makeSnowdropAssets } from './snowdrops.js';
import { gardenPlanting, placeFlower, flowerDetail, groundHeight, meadowGrass, gardenAtmosphere, createContactShadows, updateContactShadows } from './composition.js';
import { GroundSignals, groundMarks, groundGlyphAtlas } from './ground-signals.js';
import { createPetalSurfaces } from './petal-surfaces.js';
import { SeasonalParticles } from './snowfall.js';
import { translations } from './translations.js';

function stubParticleCanvas(testContext) {
  const previousDocument = globalThis.document;
  const glyphs = [];
  globalThis.document = {
    createElement() {
      return { getContext: () => ({ fillText: (glyph) => glyphs.push(glyph) }) };
    },
  };
  testContext.after(() => {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  });
  return glyphs;
}

function particleScene(testContext) {
  const glyphs = stubParticleCanvas(testContext);
  const scene = new THREE.Scene();
  return { scene, particles: new SeasonalParticles(scene), glyphs };
}

test('season switches recycle the same particle buffers, shader and glyph atlas', (context) => {
  const { scene, particles } = particleScene(context);
  particles.select('Winter');
  const [layer] = scene.children;
  const { geometry, material } = layer;
  const positions = geometry.getAttribute('position').array;
  const winterPositions = positions.slice();
  const atlas = material.uniforms.spriteMap.value;
  for (const mode of ['poppy', 'lily', 'chrysanthemum', 'snowdrop']) {
    particles.select(gardenSelection(mode).season);
    assert.equal(scene.children.length, 1);
    assert.ok(scene.children[0] === layer, 'The season switch keeps the same particle draw object');
    assert.equal(layer.geometry, geometry);
    assert.equal(layer.material, material);
    assert.equal(geometry.getAttribute('position').array, positions);
    assert.equal(material.uniforms.spriteMap.value, atlas);
    assert.ok(geometry.drawRange.count > 0 && geometry.drawRange.count <= positions.length / 3);
  }
  assert.deepEqual(positions, winterPositions);
});

test('autumn rain uses printable ASCII drops in its atlas row', (context) => {
  const { particles, glyphs } = particleScene(context);
  particles.select('Autumn');
  assert.deepEqual(glyphs.slice(-4), ['|', '|', '|', ':']);
  assert.ok(glyphs.every((glyph) => /^[\x20-\x7e]+$/.test(glyph)));
});

test('flower pollen recolors the existing pool for each season', (context) => {
  stubParticleCanvas(context);
  const scene = new THREE.Scene();
  const pollen = new AsciiPollen(scene);
  assert.equal(typeof pollen.setSeason, 'function');
  const { uniforms } = pollen.material;
  const { position } = pollen.geometry.attributes;
  const version = position.version;
  const { value: primary } = uniforms.primaryColor;
  const { value: accent } = uniforms.accentColor;
  pollen.setSeason('Spring');
  assert.ok(primary.y > primary.x && primary.y > primary.z);
  assert.ok(accent.x > 1 && accent.y > 1 && accent.z < 0.2);
  pollen.setSeason('Summer');
  assert.ok(primary.z > primary.x && primary.x > primary.y);
  assert.ok(accent.y > accent.x && accent.y > accent.z);
  pollen.setSeason('Winter');
  assert.ok(primary.x > 1 && primary.y > 1 && primary.z > 1);
  assert.ok(accent.z > accent.y && accent.y > accent.x);
  pollen.setSeason('Autumn');
  assert.deepEqual(primary.toArray(), [2, 1.4, 0.012]);
  assert.deepEqual(accent.toArray(), [2, 0.23, 0.008]);
  assert.deepEqual(uniforms.echoColor.value.toArray(), [1.9, 0.16, 0.008]);
  assert.equal(uniforms.accentThreshold.value, 0.8);
  assert.equal(position.version, version);
  assert.equal(scene.children.length, 1);
});

test('autumn rain fits 160 varied drops in the shared particle pool', (context) => {
  const { scene, particles } = particleScene(context);
  particles.select('Autumn');
  const { geometry } = scene.children[0];
  const { position, particle } = geometry.attributes;
  const count = geometry.drawRange.count;
  const depth = Array.from({ length: count }, (_, index) => position.getZ(index));
  const lengths = Array.from({ length: count }, (_, index) => particle.getZ(index));
  const foreground = depth.filter((z) => z > 6);
  assert.equal(count, 160);
  assert.ok(count <= position.count);
  assert.ok(Math.min(...lengths) < 0.18);
  assert.ok(Math.max(...lengths) > 0.85);
  assert.ok(foreground.length >= 4 && foreground.length < depth.length / 3);
  assert.ok(depth.filter((z) => z < -6).length > depth.length / 3);
});

test('autumn drops fall at varied speeds and update only through the garden clock', (context) => {
  const { scene, particles } = particleScene(context);
  particles.select('Autumn');
  const { geometry, material } = scene.children[0];
  const { position, particle } = geometry.attributes;
  const speeds = Array.from({ length: geometry.drawRange.count }, (_, index) => particle.getY(index));
  assert.ok(Math.min(...speeds) > 4);
  assert.ok(Math.max(...speeds) - Math.min(...speeds) > 2);
  assert.ok(material.uniforms.sway.value > 0 && material.uniforms.sway.value < 0.35);
  const versions = [position.version, particle.version];
  particles.update(5, 720);
  particles.update(5, 1080);
  assert.equal(material.uniforms.time.value, 5);
  assert.equal(material.uniforms.viewportHeight.value, 1080);
  assert.deepEqual([position.version, particle.version], versions);
});

test('summer fireflies reach above the lilies and also float near their stems', (context) => {
  const { scene, particles } = particleScene(context);
  particles.select('Summer');
  const { geometry } = scene.children[0];
  const positions = geometry.getAttribute('position');
  const heights = Array.from({ length: geometry.drawRange.count }, (_, index) => positions.getY(index));
  assert.ok(Math.max(...heights) > 5);
  assert.ok(Math.min(...heights) < 2);
});

test('ambient particles use the garden clock and current render size after a season switch', (context) => {
  const { scene, particles } = particleScene(context);
  particles.select('Spring');
  particles.update(13, 720);
  const { uniforms } = scene.children[0].material;
  const position = scene.children[0].geometry.getAttribute('position');
  const version = position.version;
  assert.equal(uniforms.time.value, 13);
  assert.equal(uniforms.viewportHeight.value, 720);
  particles.update(13, 1080);
  assert.equal(uniforms.time.value, 13, 'A paused clock stays frozen on resize');
  assert.equal(uniforms.viewportHeight.value, 1080);
  assert.equal(position.version, version, 'Motion does not upload particle buffers');
  particles.select('Autumn');
  particles.update(13, 1080);
  assert.equal(scene.children[0].material.uniforms.time.value, 13);
  assert.equal(scene.children[0].material.uniforms.viewportHeight.value, 1080);
});

test('spring flocks start along the upper sky with birds inside the center of the viewport', (context) => {
  const { scene, particles } = particleScene(context);
  particles.select('Spring');
  const { geometry } = scene.children[0];
  const positions = geometry.getAttribute('position');
  let centeredBirds = 0;
  for (let i = 0; i < geometry.drawRange.count; i++) {
    assert.ok(positions.getY(i) >= 0.4 && positions.getY(i) <= 0.8);
    if (Math.abs(positions.getX(i)) < 0.6) centeredBirds++;
  }
  assert.ok(centeredBirds >= 5);
});

test('petal finishes keep rims and tips smoother than the brushed body', () => {
  for (const species of ['lily', 'poppy', 'snowdrop']) {
    const surface = createPetalSurfaces(species);
    const sample = (map, u, t) => {
      const { data, width, height } = map.image;
      return data[(Math.round(t * (height - 1)) * width + Math.round(u * (width - 1))) * 4] / 255;
    };
    const body = sample(surface.roughnessMap, 0.4, 0.5);
    assert.ok(sample(surface.roughnessMap, 0.02, 0.5) < body * 0.65);
    assert.ok(sample(surface.roughnessMap, 0.4, 0.98) < body * 0.7);
    assert.ok(sample(surface.aoMap, 0.5, 0.03) < sample(surface.aoMap, 0.5, 0.95));
    assert.ok(sample(surface.aoMap, 0.5, 0.5) < sample(surface.aoMap, 0.2, 0.5));
    for (const map of Object.values(surface)) {
      assert.equal(map.colorSpace, THREE.NoColorSpace);
      assert.equal(map.channel, 0, 'Petal maps must use the existing UV channel');
      assert.equal(map.generateMipmaps, true);
      assert.equal(map.minFilter, THREE.LinearMipmapLinearFilter);
      for (let i = 3; i < map.image.data.length; i += 4) assert.equal(map.image.data[i], 255);
      map.dispose();
    }
  }
});

test('procedural petal textures are repeatable and retain distinct surface grain', () => {
  const first = createPetalSurfaces('lily');
  const repeat = createPetalSurfaces('lily');
  const poppy = createPetalSurfaces('poppy');
  for (const name of Object.keys(first)) assert.deepEqual(first[name].image.data, repeat[name].image.data);
  assert.notDeepEqual(first.bumpMap.image.data, poppy.bumpMap.image.data);
  for (const surface of [first, repeat, poppy]) for (const map of Object.values(surface)) map.dispose();
});

test('all petal variants share bounded PBR maps without extra render objects', () => {
  const assets = makeFlowerAssets();
  assets.snowdrop = makeSnowdropAssets(assets);
  const families = [
    [assets.petalMaterials, assets.surfaces.lily, 0.8, 0.04, 0.24],
    [assets.poppyMaterials, assets.surfaces.poppy, 0.8, 0.04, 0.28],
    [[assets.snowdrop.material, assets.snowdrop.innerMaterial], assets.snowdrop.surface, 0.9, 0.04, 0.32],
  ];
  const winterPetal = assets.snowdrop.material;
  assert.deepEqual(assets.petalMaterials.map(({ color }) => color.getHexString()), ['e0dce9', 'c7b6dd', 'dbb8d4']);
  assert.deepEqual(assets.poppyMaterials.map(({ color }) => color.getHexString()), ['e3dce7', 'dfc4cb', 'c9bddb']);
  assert.equal(assets.poppyCenterMaterial.color.getHexString(), '302434');
  for (const material of assets.petalMaterials) {
    assert.equal(material.metalness, 1);
    assert.equal(material.envMapIntensity, 2.1);
  }
  for (const material of assets.poppyMaterials) {
    assert.equal(material.metalness, 1);
    assert.equal(material.envMapIntensity, 2);
  }
  const autumnPetals = makeChrysanthemumAssets(assets).materials;
  for (const material of autumnPetals) {
    assert.equal(material.metalness, winterPetal.metalness);
    assert.equal(material.roughness, winterPetal.roughness);
    assert.equal(material.envMapIntensity, winterPetal.envMapIntensity);
  }
  // The first bloom keeps the shared pearl; the other two are tinted.
  assert.ok(autumnPetals[0].color.equals(winterPetal.color));
  let bytes = 0;
  for (const [materials, surface, minMetalness, minRoughness, maxRoughness] of families) {
    for (const map of Object.values(surface)) bytes += map.image.data.byteLength;
    for (const material of materials) {
      assert.ok(material.isMeshStandardMaterial);
      assert.ok(material.metalness >= minMetalness && material.metalness <= 1);
      for (const [name, map] of Object.entries(surface)) assert.equal(material[name], map);
      assert.ok(material.bumpScale > 0 && material.bumpScale <= 0.005);
      const data = surface.roughnessMap.image.data;
      for (let i = 1; i < data.length; i += 4) {
        const roughness = material.roughness * data[i] / 255;
        assert.ok(roughness > minRoughness && roughness < maxRoughness, 'Reflections need contrast without a perfect-mirror surface');
      }
    }
  }
  assert.ok(bytes <= 1200000, `Unexpected texture footprint: ${bytes}`);
});

test('ground marks remain deterministic, bounded, and attached to each flower base', () => {
  const planting = gardenPlanting(821);
  const marks = groundMarks(planting, 821);
  assert.deepEqual(marks, groundMarks(planting, 821));
  assert.notDeepEqual(marks, groundMarks(planting, 822));
  assert.equal(marks.length, 388);
  const rings = marks.filter(({ kind }) => kind === 2);
  assert.equal(rings.length, planting.length);
  rings.forEach((ring, i) => {
    assert.equal(ring.root, i);
    assert.equal(ring.x, planting[i].x);
    assert.equal(ring.z, planting[i].z);
  });
  for (const mark of marks) {
    assert.ok(Object.values(mark).every(Number.isFinite));
    assert.equal(mark.distortion, mark.root < 0 ? 0.55 : planting[mark.root].distortion);
    assert.ok(mark.width > 0 && mark.height > 0);
    assert.ok(mark.glyph >= 0 && mark.glyph < 8);
  }
  assert.deepEqual(groundMarks([], 821), []);
  assert.ok(groundMarks([...planting, ...planting], 821).length <= 388);
});

test('ground effects reuse one draw and fixed buffers through replanting', () => {
  const scene = new THREE.Scene();
  const ground = new GroundSignals(scene);
  const geometry = ground.geometry, atlas = ground.material.uniforms.atlas.value;
  const attributes = { ...geometry.attributes };
  assert.equal(scene.children.length, 1);
  assert.ok(geometry.isInstancedBufferGeometry);
  assert.equal(ground.material.forceSinglePass, true);
  assert.equal(ground.material.depthWrite, false);
  assert.equal(ground.material.depthTest, true);
  for (const seed of [821, 822, 823]) {
    const planting = gardenPlanting(seed);
    ground.replant(planting, seed);
    assert.equal(ground.geometry, geometry);
    assert.equal(ground.material.uniforms.atlas.value, atlas);
    assert.equal(geometry.instanceCount, 388);
    assert.equal(attributes.signal.getY(388 - planting.length), Math.fround(planting[0].distortion));
    for (const [name, attribute] of Object.entries(attributes)) {
      assert.equal(geometry.attributes[name], attribute);
      for (const value of attribute.array) assert.ok(Number.isFinite(value));
    }
  }
  ground.replant([], 821);
  assert.equal(geometry.instanceCount, 0);
  assert.equal(ground.mesh.visible, false);
  ground.dispose();
  assert.equal(scene.children.length, 0);
});

test('ground motion freezes on pause and clears old ripples on reset', () => {
  const ground = new GroundSignals(new THREE.Scene());
  ground.replant(gardenPlanting(821), 821);
  ground.update(2, false);
  ground.pulse(4, 2, 2);
  const uniforms = ground.material.uniforms;
  assert.equal(uniforms.pulseRoot.value, 4);
  assert.equal(uniforms.pulseStrength.value, 1);
  ground.update(3, true);
  assert.equal(uniforms.time.value, 2);
  assert.equal(uniforms.motion.value, 0);
  assert.equal(uniforms.pulseRoot.value, -1);
  ground.update(4, true);
  assert.equal(uniforms.time.value, 2);
  ground.update(2.1, false);
  assert.equal(uniforms.time.value, 2.1);
  assert.equal(uniforms.motion.value, 1);
  ground.pulse(3, 2.1, 0.5);
  ground.replant(gardenPlanting(822), 822);
  assert.equal(uniforms.pulseRoot.value, -1);
  assert.equal(uniforms.pulseStrength.value, 0);
  ground.dispose();
});

test('the ground glyph atlas has eight separate visible glyphs with transparent gutters', () => {
  const atlas = groundGlyphAtlas();
  const { data, width, height } = atlas.image;
  assert.equal(width, 64); assert.equal(height, 8);
  for (let glyph = 0; glyph < 8; glyph++) {
    let ink = 0;
    for (let y = 0; y < height; y++) {
      assert.equal(data[(y * width + glyph * 8) * 4 + 3], 0);
      assert.equal(data[(y * width + glyph * 8 + 7) * 4 + 3], 0);
      for (let x = 0; x < 8; x++) if (data[(y * width + glyph * 8 + x) * 4 + 3]) ink++;
    }
    assert.ok(ink > 0 && ink < 35);
  }
  atlas.dispose();
});

test('clustered planting preserves the lead bloom and separation across replant seeds', () => {
  assert.deepEqual(gardenPlanting(821), gardenPlanting(821));
  assert.notDeepEqual(gardenPlanting(821), gardenPlanting(822));
  const distortionLevels = (seed) => gardenPlanting(seed).map(({ distortion }) => distortion);
  assert.ok(new Set(distortionLevels(821)).size > 1);
  assert.notDeepEqual(distortionLevels(821), distortionLevels(821 + 127));
  for (let seed = 0; seed < 100; seed++) {
    const planting = gardenPlanting(seed);
    assert.equal(planting.length, 18);
    assert.ok(Math.abs(planting[0].x - 1.65) < 0.1);
    assert.ok(Math.abs(planting[0].z - 1.1) < 0.1);
    assert.ok(planting[0].scale > 1.1);
    assert.equal(planting[0].pitch, 0);
    assert.equal(planting[0].roll, 0);
    for (let i = 0; i < planting.length; i++) {
      const flower = planting[i];
      assert.ok([flower.x, flower.z, flower.scale, flower.yaw, flower.pitch, flower.roll].every(Number.isFinite));
      assert.ok(flower.scale > 0.5 && flower.scale < 1.3);
      assert.ok(flower.distortion >= 0.11 && flower.distortion <= 0.95);
      for (let j = i + 1; j < planting.length; j++) {
        assert.ok(Math.hypot(flower.x - planting[j].x, flower.z - planting[j].z) > 1.8, 'Stems must retain room to breathe');
      }
    }
    assert.ok(planting.some(({ z }) => z < -23), 'The field needs a distant layer');
  }
});

test('replanting mixes noticeably different flower sizes within most clusters', () => {
  const patterns = [821, 948, 1075].map((seed) => {
    const planting = gardenPlanting(seed);
    const clusterSizes = new Map();
    for (const { cluster, scale } of planting) {
      if (!clusterSizes.has(cluster)) clusterSizes.set(cluster, []);
      clusterSizes.get(cluster).push(scale);
    }
    const variedClusters = [...clusterSizes.values()].filter((sizes) => Math.max(...sizes) - Math.min(...sizes) > 0.22);
    assert.ok(variedClusters.length >= 4);
    return planting.map(({ scale }) => scale);
  });
  assert.notDeepEqual(patterns[0], patterns[1]);
  assert.notDeepEqual(patterns[1], patterns[2]);
});

test('planting mixes different facing angles, head tilts, and distortion strengths', () => {
  for (const seed of [821, 948, 1075]) {
    const planting = gardenPlanting(seed);
    const span = (key) => {
      const values = planting.map((flower) => flower[key]);
      return Math.max(...values) - Math.min(...values);
    };
    assert.ok(span('yaw') > 1.4);
    assert.ok(span('pitch') > 0.30);
    assert.ok(span('roll') > 0.24);
    assert.ok(span('distortion') > 0.68);
  }
});

test('the lead flower stays visible and pickable on desktop and phone in every study', () => {
  const assets = makeFlowerAssets();
  assets.snowdrop = makeSnowdropAssets(assets);
  assets.chrysanthemum = makeChrysanthemumAssets(assets);
  for (const seed of [821, 922, 1337]) for (const createFlower of [createLily, createPoppy, createSnowdrop, createChrysanthemum]) {
    const random = seededRandom(seed);
    const flowers = gardenPlanting(seed).map((placement, id) => {
      const flower = createFlower(id, assets, random);
      const { x: pitch, z: roll } = flower.head.rotation;
      placeFlower(flower, placement);
      assert.equal(flower.head.rotation.x, pitch + placement.pitch);
      assert.equal(flower.head.rotation.z, roll + placement.roll);
      assert.ok(flower.baseRotation.equals(flower.head.rotation));
      flower.root.updateMatrixWorld(true);
      return flower;
    });
    for (const [width, height] of [[1743, 1244], [1440, 900], [390, 844], [320, 740]]) {
      const mobile = width < 601;
      const camera = new THREE.PerspectiveCamera(mobile ? 49 : 40, width / height, 0.1, 150);
      camera.position.set(mobile ? 1 : 0, mobile ? 6.8 : 5.65, mobile ? 13.6 : 13.9);
      camera.lookAt(mobile ? new THREE.Vector3(1, 2, 0) : new THREE.Vector3(0, 2.5, 0));
      camera.updateMatrixWorld(true);
      const center = flowers[0].hit.getWorldPosition(new THREE.Vector3());
      const screen = center.clone().project(camera);
      assert.ok(Math.abs(screen.x) < 0.85 && Math.abs(screen.y) < 0.8, 'The lead bloom should remain within reach');
      const ray = new THREE.Raycaster(camera.position, center.sub(camera.position).normalize());
      const hits = ray.intersectObjects(flowers.map(({ hit }) => hit));
      assert.equal(hits[0]?.object.userData.flowerId, 0, 'Other flowers should not block the focal hover target');
    }
    for (const flower of flowers) {
      flower.anthers?.dispose();
      flower.privateGeometries.forEach((geometry) => geometry.dispose());
    }
  }
});

test('distance haze leaves the lead bloom clear and softens the distant layer', () => {
  const camera = new THREE.PerspectiveCamera(40, 1.4, 0.1, 150);
  camera.position.set(0, 5.65, 13.9);
  camera.lookAt(0, 2.5, 0);
  camera.updateMatrixWorld(true);
  const planting = gardenPlanting(821);
  const hazeAt = ({ x, z, scale }) => {
    const depth = -new THREE.Vector3(x, 3 * scale, z).applyMatrix4(camera.matrixWorldInverse).z;
    return THREE.MathUtils.smoothstep(depth, gardenAtmosphere.near, gardenAtmosphere.far);
  };
  assert.ok(hazeAt(planting[0]) < 0.05);
  const distant = planting.filter(({ z }) => z < -20);
  assert.ok(distant.length >= 3);
  for (const flower of distant) assert.ok(hazeAt(flower) > 0.65);
});

test('meadow grass follows the flower drifts without adding drawing complexity', () => {
  const planting = gardenPlanting(821);
  const grass = meadowGrass(planting, 821);
  assert.equal(grass.length, 220);
  assert.deepEqual(grass, meadowGrass(planting, 821));
  let nearFlowers = 0;
  for (const blade of grass) {
    assert.ok(Object.values(blade).every(Number.isFinite));
    if (planting.some(({ x, z }) => Math.hypot(x - blade.x, z - blade.z) < 3.2)) nearFlowers++;
  }
  assert.ok(nearFlowers > grass.length * 0.75);
});

test('contact shadows stay grounded, fade to transparent edges, and reuse their assets', () => {
  const planting = gardenPlanting(821);
  const shadows = createContactShadows(planting.length);
  const geometry = shadows.geometry, map = shadows.material.map;
  assert.ok(shadows.isInstancedMesh);
  assert.equal(shadows.count, 18);
  assert.equal(shadows.material.depthWrite, false);
  const { data, width } = map.image;
  assert.equal(data[3], 0);
  assert.ok(data[((width / 2) * width + width / 2) * 4 + 3] > 245);
  for (const seed of [821, 822, 823]) {
    const next = gardenPlanting(seed);
    updateContactShadows(shadows, next);
    assert.equal(shadows.geometry, geometry);
    assert.equal(shadows.material.map, map);
    assert.ok(Number.isFinite(shadows.boundingSphere.radius));
    for (let i = 0; i < next.length; i++) {
      const matrix = new THREE.Matrix4();
      shadows.getMatrixAt(i, matrix);
      const point = new THREE.Vector3().setFromMatrixPosition(matrix);
      assert.ok(Math.abs(point.x - next[i].x) < 1e-5);
      assert.ok(Math.abs(point.z - next[i].z) < 1e-5);
      assert.ok(Math.abs(point.y + 0.14) < 1e-6);
    }
  }
  geometry.dispose(); map.dispose(); shadows.material.dispose(); shadows.dispose();
});

test('gesture strength is bounded and consistent across screen sizes', () => {
  assert.equal(gestureStrength(0, 16, 720), 0);
  assert.equal(gestureStrength(100000, 0, 720), 1);
  assert.equal(gestureStrength(36, 50, 720), gestureStrength(18, 50, 360));
  assert.ok(gestureStrength(80, 40, 720) > gestureStrength(8, 40, 720));
});

test('flowers retain their identity while faster gestures change expression', () => {
  const soft = bloomProfile(4, 0.1);
  const bright = bloomProfile(4, 0.9);
  assert.deepEqual(soft.character, bright.character);
  assert.ok(bright.velocity > soft.velocity);
  assert.ok(bright.brightness > soft.brightness);
  assert.equal(soft.release, bright.release);
  assert.ok(new Set(Array.from({ length: 18 }, (_, id) => flowerCharacter(id).name)).size >= 4);
});

test('the garden restores the louder master gain when sound is enabled', () => {
  const gains = [];
  const audio = new GardenAudio();
  audio.ready = true;
  audio.master = { gain: { rampTo(value) { gains.push(value); } } };
  audio.setVisibility(true);
  audio.enabled = true;
  audio.setVisibility(true);
  assert.deepEqual(gains, [0, 2.20]);
});

test('the quiet pad and seasonal recordings follow sound opt-in and garden visibility', async (context) => {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  context.after(() => {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  });
  const events = [];
  const recordingEvents = [];
  const pendingRecordings = new Map();
  const recordingVolumes = new Map();
  const volumes = [];
  class AudioNode {
    gain = { rampTo() {} };
    ready = Promise.resolve();
    connect() { return this; }
    toDestination() { return this; }
    triggerRelease() {}
    triggerAttackRelease() {}
  }
  class PadVoice extends AudioNode {
    constructor({ volume }) {
      super();
      volumes.push(volume);
    }
    triggerAttack(hz) { events.push(['attack', Math.round(hz)]); }
    setNote(hz) { events.push(['retune', Math.round(hz)]); }
    triggerRelease() { events.push(['release']); }
  }
  class Recording extends AudioNode {
    state = 'stopped';
    loaded = false;
    constructor(options) {
      super();
      assert.ok(options.loop && options.volume < -25);
      this.volume = options.volume;
    }
    load(url) {
      this.file = new URL(url).pathname.split('/').pop();
      recordingVolumes.set(this.file, this.volume);
      recordingEvents.push(['load', this.file]);
      return new Promise((resolve) => {
        pendingRecordings.set(this.file, () => { this.loaded = true; resolve(); });
      });
    }
    start() { this.state = 'started'; recordingEvents.push(['start', this.file]); }
    stop() { this.state = 'stopped'; recordingEvents.push(['stop', this.file]); }
  }
  globalThis.window = { Tone: {
    start: async () => {}, now: () => 1, getContext: () => ({ state: 'running' }),
    Limiter: AudioNode, Gain: AudioNode, Filter: AudioNode, Reverb: AudioNode,
    FeedbackDelay: AudioNode, Panner: AudioNode, MonoSynth: AudioNode, FMSynth: AudioNode, MembraneSynth: AudioNode,
    NoiseSynth: AudioNode, Synth: PadVoice, Player: Recording,
  } };
  globalThis.document = { hidden: false, body: { dataset: { page: 'garden' } } };
  const audio = new GardenAudio();
  audio.setVisibility(true);
  assert.deepEqual(events, []);
  assert.deepEqual(recordingEvents, []);
  assert.deepEqual(volumes, []);

  await audio.enable('poppy');
  audio.setVisibility(true);
  assert.deepEqual(events.splice(0), [['attack', 220], ['attack', 330]]);
  assert.equal(volumes.length, 2);
  assert.ok(volumes.every((volume) => volume <= -47));
  assert.deepEqual(recordingEvents.splice(0), [['load', 'spring-birds.m4a']]);

  audio.changeStudy('chrysanthemum');
  assert.deepEqual(events.splice(0), [['retune', 196], ['retune', 294]]);
  pendingRecordings.get('spring-birds.m4a')();
  await Promise.resolve();
  audio.setVisibility(false);
  assert.deepEqual(recordingEvents.splice(0), [['load', 'light-rain.m4a']]);
  pendingRecordings.get('light-rain.m4a')();
  await Promise.resolve();
  assert.deepEqual(recordingEvents, []);
  audio.changeStudy('snowdrop');
  assert.deepEqual(events.splice(0), [['release'], ['release']]);
  audio.setVisibility(true);
  assert.deepEqual(events.splice(0), [['attack', 147], ['attack', 220]]);
  pendingRecordings.get('winter-snow.m4a')();
  await Promise.resolve();
  assert.deepEqual(recordingEvents.splice(0), [['load', 'winter-snow.m4a'], ['start', 'winter-snow.m4a']]);

  audio.mute();
  audio.setVisibility(true);
  assert.deepEqual(events.splice(0), [['release'], ['release']]);
  await audio.enable('lily');
  assert.deepEqual(events.splice(0), [['attack', 147], ['attack', 220]]);
  assert.equal(volumes.length, 2, 'Re-enabling sound reuses the pad voices');
  pendingRecordings.get('summer-wind.m4a')();
  await Promise.resolve();
  assert.ok(recordingVolumes.get('summer-wind.m4a') <= recordingVolumes.get('spring-birds.m4a') - 6);
  assert.deepEqual(recordingEvents.splice(0), [
    ['stop', 'winter-snow.m4a'], ['load', 'summer-wind.m4a'], ['start', 'summer-wind.m4a'],
  ]);
  audio.changeStudy('chrysanthemum');
  audio.setVisibility(true);
  audio.changeStudy('poppy');
  audio.mute();
  assert.deepEqual(recordingEvents, [
    ['stop', 'summer-wind.m4a'], ['start', 'light-rain.m4a'], ['stop', 'light-rain.m4a'],
    ['start', 'spring-birds.m4a'], ['stop', 'spring-birds.m4a'],
  ]);
});

test('visual envelopes stay silent before the scheduled note and expire after release', () => {
  const profile = bloomProfile(0);
  assert.equal(bloomEnvelope(-0.1, profile), 0);
  assert.equal(bloomEnvelope(0, profile), 0);
  assert.ok(Math.abs(bloomEnvelope(profile.attack, profile) - 1) < 1e-9);
  const left = bloomEnvelope(profile.gate - 1e-8, profile);
  const right = bloomEnvelope(profile.gate + 1e-8, profile);
  assert.ok(Math.abs(left - right) < 1e-6);
  assert.equal(bloomEnvelope(profile.gate + profile.release, profile), 0);
  assert.ok(bloomEnvelope(0.2, profile) > bloomEnvelope(0.6, profile));
});

test('inertial motion is stable and independent of frame rate', () => {
  const simulate = (hz) => {
    const state = { value: 0, velocity: 0 };
    for (let i = 0; i < hz; i++) stepSpring(state, 1, 1 / hz);
    return state;
  };
  const slow = simulate(20);
  const fast = simulate(144);
  assert.ok(Math.abs(slow.value - fast.value) < 1e-10);
  assert.ok(Math.abs(slow.velocity - fast.velocity) < 1e-10);
  assert.ok(Math.abs(slow.value - 1) < 0.001);
  const state = { value: 1, velocity: 0 };
  for (let i = 0; i < 180; i++) stepSpring(state, 0, 1 / 60);
  assert.ok(Math.abs(state.value) < 1e-6);
});

test('neighboring ripples arrive later with distance and never feed back into their source', () => {
  const profile = bloomProfile(2);
  assert.equal(rippleEnvelope(0.2, 4.4, profile), 0);
  assert.ok(rippleEnvelope(1 + profile.attack, 4.4, profile) > 0);
  assert.equal(rippleEnvelope(0.1, 0, profile), 0);
  assert.equal(rippleEnvelope(3, 10, profile), 0);
  assert.equal(rippleEnvelope(10, 2, profile), 0);
});

test('thick petal variants and flower geometry have finite vertices and valid faces', () => {
  const assets = makeFlowerAssets();
  assert.equal(assets.petals.length, 3);
  for (const geometry of [...assets.petals, assets.leaf]) {
    for (const value of geometry.attributes.position.array) assert.ok(Number.isFinite(value));
    for (const value of geometry.attributes.normal.array) assert.ok(Number.isFinite(value));
    for (const index of geometry.index.array) assert.ok(index < geometry.attributes.position.count);
  }
  const flower = createLily(0, assets, seededRandom(821));
  assert.equal(flower.petals.length, 6);
  assert.equal(flower.anthers.count, 7);
  assert.deepEqual(flower.head.scale.toArray(), [1, 1, 1]);
  let draws = 0;
  flower.root.traverse((object) => { if (object.isMesh && object.material.visible !== false) draws++; });
  assert.equal(flower.companions.length, 2);
  assert.ok(draws <= 18, `Unexpected draw count per flower: ${draws}`);
});

test('upright chrysanthemums have a clustered center and batched moving petal tiers', () => {
  const assets = makeFlowerAssets();
  assets.chrysanthemum = makeChrysanthemumAssets(assets);
  const { tiers, center, leaf } = assets.chrysanthemum;
  const flower = createChrysanthemum(0, assets, seededRandom(821));
  assert.equal(flower.petals.length, 4);
  assert.deepEqual(flower.head.scale.toArray(), [1.5, 1.5, 1.5]);
  assert.ok(flower.head.rotation.x >= 0.42 && flower.head.rotation.x <= 0.69);
  assert.equal(flower.stamens.geometry, center);
  center.computeBoundingBox();
  const centerSize = center.boundingBox.getSize(new THREE.Vector3());
  assert.ok(centerSize.x > 0.32 && centerSize.x < 0.44 && centerSize.y < 0.2);
  assert.equal(center.attributes.position.count / 3, 2720);
  assert.ok(flower.stamens.material.color.equals(assets.anther.color));
  assert.ok(flower.head.children.includes(flower.hit));
  updateFlowerMotion(flower, 0.5, 0.03, -0.02, 0.4);
  assert.ok(tiers.reduce((sum, { geometry }) => sum + geometry.attributes.position.count / 3, 0) <= 24_048);
  for (const geometry of [...tiers.map(({ geometry }) => geometry), center, leaf]) {
    assert.ok(geometry.attributes.position.array.every(Number.isFinite));
    assert.ok(geometry.attributes.normal.array.every(Number.isFinite));
  }
  let draws = 0;
  flower.root.traverse((object) => { if (object.isMesh && object.material.visible !== false) draws++; });
  assert.ok(draws <= 10, `Unexpected draw count per chrysanthemum: ${draws}`);
});

test('autumn clusters mix tall stems with low, upward-facing chrysanthemums', () => {
  const assets = makeFlowerAssets();
  assets.chrysanthemum = makeChrysanthemumAssets(assets);
  const random = seededRandom(821);
  const planting = gardenPlanting(821);
  const blooms = planting.map((_, id) => createChrysanthemum(id, assets, random));
  const clusters = new Set(planting.map(({ cluster }) => cluster));
  assert.ok(blooms[0].height > 2.4, 'The lead bloom keeps a tall stem');
  for (const cluster of clusters) {
    const low = blooms.filter((bloom, id) => planting[id].cluster === cluster && bloom.height < 1);
    assert.equal(low.length, 1);
    const [bloom] = low;
    assert.ok(bloom.height > 0.6);
    assert.ok(bloom.baseRotation.x < 0.4);
    assert.equal(bloom.head.scale.x, blooms[0].head.scale.x);
    updateFlowerMotion(bloom, 1, 0.08, -0.05, 0.3);
    assert.equal(bloom.head.position.y, bloom.height);
    assert.ok(bloom.stemGeometry.attributes.normal.array.every(Number.isFinite));
  }
});

test('autumn petals keep solid, depth-writing bodies with translucent tips and the other seasons are opaque', () => {
  const assets = makeFlowerAssets();
  const snowdrop = makeSnowdropAssets(assets);
  const { materials, centerMaterial } = makeChrysanthemumAssets(assets);
  for (const material of materials) {
    assert.equal(material.opacity, 1);
    assert.ok(material.transparent && material.depthTest && material.depthWrite);
    assert.equal(typeof material.onBeforeCompile, 'function');
    assert.equal(material.side, THREE.FrontSide);
  }
  const opaqueMaterials = [
    ...assets.petalMaterials, ...assets.poppyMaterials, snowdrop.material, snowdrop.innerMaterial, centerMaterial,
  ];
  for (const material of opaqueMaterials) {
    assert.equal(material.opacity, 1);
    assert.ok(!material.transparent && material.depthTest && material.depthWrite);
  }
});

test('summer lily petals arch outward to a visible tapered tip', () => {
  const { petals } = makeFlowerAssets();
  for (const geometry of petals) {
    const { uv, position } = geometry.attributes;
    let furthest = -Infinity;
    let shoulderHeight = -Infinity;
    let tipX = -Infinity;
    let tipHeight = -Infinity;
    let leftEdge = Infinity;
    let rightEdge = -Infinity;
    for (let i = 0; i < uv.count; i++) {
      const t = uv.getY(i);
      if (t === 1) {
        leftEdge = Math.min(leftEdge, position.getZ(i));
        rightEdge = Math.max(rightEdge, position.getZ(i));
      }
      if (uv.getX(i) !== 0.5) continue;
      if (t > 0.65 && t < 0.95) furthest = Math.max(furthest, position.getX(i));
      if (t > 0.54 && t < 0.70) shoulderHeight = Math.max(shoulderHeight, position.getY(i));
      if (t === 1) {
        tipX = Math.max(tipX, position.getX(i));
        tipHeight = Math.max(tipHeight, position.getY(i));
      }
    }
    assert.ok(tipX > furthest + 0.06);
    assert.ok(shoulderHeight > 0.55 && tipHeight < shoulderHeight - 0.33);
    assert.ok(rightEdge - leftEdge < 0.05);
  }
});

test('chrysanthemum petals form a compact dome with broad, rounded tips', () => {
  const { tiers } = makeChrysanthemumAssets(makeFlowerAssets());
  const profile = (geometry, t) => {
    const { uv, position } = geometry.attributes;
    let radius = 0;
    let height = 0;
    let samples = 0;
    for (let i = 0; i < uv.count; i++) {
      if (Math.abs(uv.getY(i) - t) > 0.0001 || Math.abs(uv.getX(i) - 0.5) > 0.1) continue;
      radius += Math.hypot(position.getX(i), position.getZ(i));
      height += position.getY(i);
      samples++;
    }
    assert.ok(samples > 0);
    return { radius: radius / samples, height: height / samples };
  };
  const outer = tiers[0].geometry;
  const inner = tiers.at(-1).geometry;
  const outerShoulder = profile(outer, 0.75);
  const outerTip = profile(outer, 1);
  const innerTip = profile(inner, 1);
  const outerCurl = outerShoulder.radius - outerTip.radius;
  assert.ok(outerShoulder.radius < 1.11);
  assert.ok(outerCurl > 0.025 && outerCurl < 0.14);
  assert.ok(outerTip.height > outerShoulder.height + 0.12);
  assert.ok(innerTip.height > outerTip.height + 0.45);
  const innerRelativeRadius = innerTip.radius / profile(inner, 0.6).radius;
  assert.ok(innerRelativeRadius > 0.64 && innerRelativeRadius < 0.88);
  const { uv, position } = outer.attributes;
  const widthAt = (t) => {
    const edges = [];
    for (let i = 0; i < uv.count && edges.length < 2; i++) {
      if (Math.abs(uv.getY(i) - t) > 0.0001 || uv.getX(i) !== edges.length) continue;
      edges.push(new THREE.Vector3().fromBufferAttribute(position, i));
    }
    assert.equal(edges.length, 2);
    return edges[0].distanceTo(edges[1]);
  };
  const bodyWidth = widthAt(0.55);
  assert.ok(bodyWidth > 0.34);
  assert.ok(widthAt(1) > 0.7 * bodyWidth);
});

test('stem bending preserves its anchored base and remains attached to the head', () => {
  const flower = createLily(0, makeFlowerAssets(), seededRandom(821));
  updateFlowerMotion(flower, 1, 0.25, -0.1, 0.5);
  const result = flower.stemGeometry.attributes.position.array;
  for (let i = 0; i < result.length; i += 3) {
    if (flower.stemPositions[i + 1] <= 0) {
      assert.equal(result[i], flower.stemPositions[i]);
      assert.equal(result[i + 2], flower.stemPositions[i + 2]);
    }
    assert.ok(Number.isFinite(result[i]) && Number.isFinite(result[i + 2]));
  }
  assert.equal(flower.head.position.x, flower.bend + 0.25);
  assert.equal(flower.head.position.z, -0.1);
  updateFlowerMotion(flower, 1, 0, 0, 0, true);
  assert.equal(flower.head.position.x, flower.bend);
  assert.equal(flower.head.position.z, 0);
});

test('pollen storage stays bounded, expires after leaving, and clears immediately', () => {
  const pool = new PollenPool(96, seededRandom(12));
  const origin = { x: 1, y: 3, z: 2 };
  for (let i = 0; i < 100; i++) pool.emit(origin, i / 30, 25, 0.8);
  assert.equal(pool.count(3.3), 96);
  assert.equal(pool.positions.length, 96 * 3);
  for (const glyph of pool.glyphs) assert.ok(glyph >= 0 && glyph < 32);
  assert.equal(pool.count(8), 0);
  pool.emit(origin, 9, 20);
  pool.clear();
  assert.equal(pool.count(9), 0);
  assert.equal(pool.source, -1);
  assert.equal(pool.carry, 0);
});

test('a stationary hover keeps emitting at a consistent rate and leaving stops it', () => {
  const simulate = (hz) => {
    const pool = new PollenPool(384, seededRandom(12));
    const origin = { x: 1, y: 3, z: 2 };
    for (let i = 1; i <= hz * 2; i++) pool.stream(origin, i / hz, 1 / hz, 4, 0.5);
    const emitted = pool.cursor;
    for (let i = 1; i <= hz; i++) pool.stream(null, 2 + i / hz, 1 / hz, -1, 0.5);
    assert.equal(pool.cursor, emitted);
    assert.ok(pool.count(2) > 45);
    return emitted;
  };
  assert.ok(Math.abs(simulate(20) - simulate(144)) <= 1);
});

test('pollen retains its source distortion when another flower starts emitting', () => {
  const pool = new PollenPool(16, seededRandom(12));
  const origin = { x: 1, y: 3, z: 2 };
  pool.emit(origin, 0, 2, 0.5, 0, 0.375);
  pool.stream(origin, 0.0625, 0.05, 1, 0.5, 0, 0.75);
  assert.equal(pool.count(0.0625), 3);
  assert.deepEqual([...pool.distortions.slice(0, 3)], [0.375, 0.375, 0.75]);
});

test('pollen is released from the moving stamens in world space', () => {
  const flower = createLily(0, makeFlowerAssets(), seededRandom(821));
  flower.root.position.set(2, 0, -1);
  flower.root.scale.setScalar(1.2);
  const origin = () => AsciiPollen.prototype.flowerOrigin.call({ origin: new THREE.Vector3() }, flower);
  updateFlowerMotion(flower, 0, 0, 0, 0);
  const before = origin();
  updateFlowerMotion(flower, 2, 0.3, -0.2, 0.5);
  const after = origin();
  assert.ok(before.distanceTo(after) > 0.1);
  const pool = new PollenPool(96, seededRandom(12));
  pool.emit(after, 1, 20);
  for (let i = 0; i < 20; i++) {
    const point = new THREE.Vector3().fromArray(pool.positions, i * 3);
    assert.ok(point.distanceTo(after) < 0.25);
  }
});

test('poppies have a distinct silhouette with finite geometry and a bounded draw count', () => {
  const assets = makeFlowerAssets();
  const poppy = createPoppy(0, assets, seededRandom(821));
  assert.equal(poppy.petals.length, 4);
  assert.equal(poppy.anthers.count, 56);
  assert.equal(poppy.leaves.length, 3);
  assert.equal(poppy.species, 'poppy');
  assert.deepEqual(poppy.head.scale.toArray(), [1, 1, 1]);
  for (const geometry of [...assets.poppyPetals, assets.poppyLeaf, assets.poppyCenter, ...poppy.privateGeometries]) {
    for (const value of geometry.attributes.position.array) assert.ok(Number.isFinite(value));
    for (const value of geometry.attributes.normal.array) assert.ok(Number.isFinite(value));
    if (geometry.index) for (const index of geometry.index.array) assert.ok(index < geometry.attributes.position.count);
  }
  let draws = 0;
  poppy.root.traverse((object) => { if (object.isMesh && object.material.visible !== false) draws++; });
  assert.equal(poppy.companions.length, 2);
  assert.ok(draws <= 16, `Unexpected draw count per poppy: ${draws}`);
});

test('poppy timbres are softer and retain consistent identity, pitch, and envelope timing', () => {
  for (let id = 0; id < 18; id++) {
    const lily = bloomProfile(id, 0.7);
    const poppy = bloomProfile(id, 0.7, 'poppy');
    assert.ok(poppy.attack > lily.attack);
    assert.ok(poppy.brightness < lily.brightness);
    assert.ok(flowerNote(id, 'poppy').frequency < flowerNote(id).frequency);
    assert.deepEqual(poppy.character, bloomProfile(id, 0.1, 'poppy').character);
    assert.ok(Math.abs(bloomEnvelope(poppy.attack, poppy) - 1) < 1e-9);
    assert.equal(bloomEnvelope(poppy.gate + poppy.release, poppy), 0);
  }
});

test('poppy deformation stays attached and its pollen origin follows the central pod', () => {
  const poppy = createPoppy(0, makeFlowerAssets(), seededRandom(821));
  updateFlowerMotion(poppy, 2, 0.23, -0.1, 0.6);
  assert.equal(poppy.head.position.x, poppy.bend + 0.23);
  const origin = AsciiPollen.prototype.flowerOrigin.call({ origin: new THREE.Vector3() }, poppy);
  const local = poppy.head.worldToLocal(origin.clone());
  assert.ok(Math.abs(local.y - 0.43) < 1e-10);
  updateFlowerMotion(poppy, 2, 0, 0, 0, true);
  assert.equal(poppy.head.position.x, poppy.bend);
  for (const petal of poppy.petals) assert.equal(petal.pivot.rotation.z, petal.rotation.z);
});

test('garden studies have independent pollen modes and unknown studies use the lily default', () => {
  assert.equal(gardenStudy('unknown'), gardenStudy('lily'));
  assert.notEqual(gardenStudy('poppy').pollenMode, gardenStudy('lily').pollenMode);
  assert.notEqual(gardenStudy('poppy').genus, gardenStudy('lily').genus);
});

test('the art calendar changes at season boundaries using the local month', () => {
  const dates = [
    [2026, 0, 'Winter', 'snowdrop'], [2026, 1, 'Winter', 'snowdrop'],
    [2026, 2, 'Spring', 'poppy'], [2026, 4, 'Spring', 'poppy'],
    [2026, 5, 'Summer', 'lily'], [2026, 7, 'Summer', 'lily'],
    [2026, 8, 'Autumn', 'chrysanthemum'], [2026, 10, 'Autumn', 'chrysanthemum'],
    [2026, 11, 'Winter', 'snowdrop'], [2027, 0, 'Winter', 'snowdrop'],
  ];
  for (const [year, month, season, species] of dates) {
    const choice = gardenSelection('calendar', new Date(year, month, 1, 0, 0, 0));
    assert.equal(choice.study.id, species);
    assert.equal(choice.season, season);
    assert.equal(choice.monthKey, `${year}-${month}`);
    assert.equal(choice.automatic, true);
  }
  assert.equal(gardenSelection('calendar', new Date(2026, 1, 28, 23, 59, 59)).season, 'Winter');
  assert.equal(gardenSelection('calendar', new Date(2026, 2, 1, 0, 0, 0)).season, 'Spring');
  assert.equal(new Set(dates.map(([, , , species]) => gardenStudy(species).sky.horizon)).size, 4);
});

test('manual flowers survive calendar changes and Now restores the seasonal choice', () => {
  for (const month of [0, 3, 6, 9]) {
    const date = new Date(2026, month, 21);
    for (const id of ['lily', 'poppy', 'chrysanthemum', 'snowdrop']) {
      const choice = gardenSelection(id, date);
      assert.equal(choice.study, gardenStudy(id));
      assert.equal(choice.keyLight, gardenStudy(id).keyLight);
      assert.equal(choice.automatic, false);
      assert.equal(choice.season, choice.study.season);
    }
  }
  const october = new Date(2026, 9, 21);
  assert.equal(gardenSelection('lily', october).study.id, 'lily');
  assert.equal(gardenSelection('calendar', october).study.id, 'chrysanthemum');
  assert.equal(gardenSelection('unknown', october).mode, 'calendar');
});

test('snowdrops hang below an arched stem with finite geometry and few draws', () => {
  const assets = makeFlowerAssets();
  assets.snowdrop = makeSnowdropAssets(assets);
  const flower = createSnowdrop(0, assets, seededRandom(821));
  assert.equal(flower.petals.length, 6);
  assert.equal(flower.anthers.count, 6);
  assert.equal(flower.leaves.length, 2);
  assert.ok(flower.stemGeometry.boundingSphere.radius > 0);
  let highest = 0;
  for (let i = 1; i < flower.stemPositions.length; i += 3) highest = Math.max(highest, flower.stemPositions[i]);
  assert.ok(highest > flower.height + 0.5, 'The stem should arch above its hanging bloom');
  for (const geometry of [...assets.snowdrop.outers, assets.snowdrop.inner, assets.snowdrop.leaf, ...flower.privateGeometries]) {
    for (const value of geometry.attributes.position.array) assert.ok(Number.isFinite(value));
    for (const value of geometry.attributes.normal.array) assert.ok(Number.isFinite(value));
    if (geometry.index) for (const index of geometry.index.array) assert.ok(index < geometry.attributes.position.count);
  }
  assets.snowdrop.outers[0].computeBoundingBox();
  assert.ok(assets.snowdrop.outers[0].boundingBox.min.y < -1.5);
  let draws = 0;
  flower.root.traverse((object) => { if (object.isMesh && object.material.visible !== false) draws++; });
  assert.equal(flower.companions.length, 2);
  assert.ok(draws <= 20, 'A full bloom plus two three-piece companions and their leaves');
});

test('snowdrop motion keeps the bell attached and pollen starts beneath its hem', () => {
  const assets = makeFlowerAssets();
  assets.snowdrop = makeSnowdropAssets(assets);
  const flower = createSnowdrop(0, assets, seededRandom(821));
  updateFlowerMotion(flower, 2, 0.25, -0.15, 0.6);
  assert.equal(flower.head.position.x, flower.bend + 0.25);
  assert.equal(flower.head.position.y, flower.height);
  const origin = AsciiPollen.prototype.flowerOrigin.call({ origin: new THREE.Vector3() }, flower);
  const local = flower.head.worldToLocal(origin.clone());
  assert.ok(Math.abs(local.y + 1.65) < 1e-10);
  updateFlowerMotion(flower, 2, 0, 0, 0, true);
  assert.equal(flower.head.rotation.z, flower.baseRotation.z);
  for (const petal of flower.petals) assert.equal(petal.pivot.rotation.z, petal.rotation.z);
});

test('snowdrop glass tones are higher, quieter, and longer than the lilies', () => {
  for (let id = 0; id < 18; id++) {
    const lily = bloomProfile(id, 0.7);
    const snowdrop = bloomProfile(id, 0.7, 'snowdrop');
    // An octave up. Exponentiation can differ in its last digit between
    // JavaScript engine versions, so compare within a billionth of a hertz.
    assert.ok(Math.abs(flowerNote(id, 'snowdrop').frequency - flowerNote(id).frequency * 2) < 1e-9);
    assert.ok(snowdrop.velocity < lily.velocity);
    assert.ok(snowdrop.decay > lily.decay);
    assert.ok(snowdrop.release > lily.release);
    assert.equal(bloomEnvelope(snowdrop.gate + snowdrop.release, snowdrop), 0);
  }
});

test('winter snowdrops emit sparser pollen and can also be previewed', () => {
  const origin = { x: 0, y: 2, z: 0 };
  const normal = new PollenPool(384, seededRandom(12));
  const winter = new PollenPool(384, seededRandom(12));
  for (let i = 1; i <= 120; i++) {
    normal.stream(origin, i / 60, 1 / 60, 0, 0.5);
    winter.stream(origin, i / 60, 1 / 60, 0, 0.5, 2);
  }
  assert.ok(winter.cursor < normal.cursor / 2);
  const winterDate = new Date(2026, 11, 21);
  assert.equal(gardenSelection('snowdrop', winterDate).study.id, 'snowdrop');
  assert.equal(gardenSelection('snowdrop', winterDate).automatic, false);
  assert.equal(gardenSelection('calendar', winterDate).study.id, 'snowdrop');
});

const visibleDraws = (flower) => {
  let draws = 0;
  flower.root.traverse((object) => { if (object.isMesh && object.material.visible !== false) draws++; });
  return draws;
};
const triangles = (geometry) => (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3;

test('the ground is level where flowers are played and rolls gently behind them', () => {
  for (const [x, z] of [[0, 14], [1.65, 1.1], [-9, -1.8], [6, 3.7], [12, -5]]) assert.equal(groundHeight(x, z), 0);
  let lowest = Infinity, highest = -Infinity;
  for (let x = -30; x <= 30; x += 1.5) for (let z = -40; z <= -5; z += 1.5) {
    const height = groundHeight(x, z);
    assert.ok(Number.isFinite(height));
    lowest = Math.min(lowest, height);
    highest = Math.max(highest, height);
  }
  assert.ok(lowest > -0.7 && highest < 1.25, `Unexpected ground range ${lowest}..${highest}`);
  assert.ok(highest - lowest > 0.6, 'The back of the field should visibly roll');
  const [lead] = gardenPlanting(821);
  assert.equal(groundHeight(lead.x, lead.z), 0, 'The lead bloom stays on level ground');
});

test('contact shadows and ground marks follow the rolling ground', () => {
  const planting = gardenPlanting(821);
  const shadows = createContactShadows(planting.length);
  updateContactShadows(shadows, planting, groundHeight);
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  planting.forEach(({ x, z }, i) => {
    shadows.getMatrixAt(i, matrix);
    position.setFromMatrixPosition(matrix);
    assert.ok(Math.abs(position.y - (-0.14 + groundHeight(x, z))) < 1e-6);
  });
  const scene = new THREE.Scene();
  const signals = new GroundSignals(scene);
  signals.replant(planting, 821, groundHeight);
  const origin = signals.geometry.attributes.origin;
  let lifted = 0;
  for (let i = 0; i < signals.geometry.instanceCount; i++) {
    const expected = -0.12 + groundHeight(origin.getX(i), origin.getZ(i));
    assert.ok(Math.abs(origin.getY(i) - expected) < 1e-5);
    if (Math.abs(origin.getY(i) + 0.12) > 0.01) lifted++;
  }
  assert.ok(lifted > 0, 'Some marks sit on the slope');
  signals.dispose();
});

test('ground marks take a pair of colors per season and default to lime and violet', () => {
  const signals = new GroundSignals(new THREE.Scene());
  const { colorA, colorB } = signals.material.uniforms;
  assert.deepEqual(colorA.value.toArray().map((v) => +v.toFixed(2)), [0.65, 1.1, 0.28]);
  signals.setPalette(gardenStudy('chrysanthemum').signals);
  assert.deepEqual(colorA.value.toArray().map((v) => +v.toFixed(2)), [1.15, 0.78, 0.3]);
  assert.deepEqual(colorB.value.toArray().map((v) => +v.toFixed(2)), [0.95, 0.42, 0.8]);
  signals.setPalette(gardenStudy('lily').signals);
  assert.deepEqual(colorA.value.toArray().map((v) => +v.toFixed(2)), [0.65, 1.1, 0.28]);
  assert.deepEqual(colorB.value.toArray().map((v) => +v.toFixed(2)), [0.56, 0.2, 1.05]);
  signals.dispose();
});

test('distant flowers use coarser meshes with the same structure', () => {
  const assets = makeFlowerAssets();
  assets.snowdrop = makeSnowdropAssets(assets);
  assets.chrysanthemum = makeChrysanthemumAssets(assets);
  const planting = gardenPlanting(821);
  const levels = planting.map(flowerDetail);
  assert.ok(levels.includes(0) && levels.includes(1));
  for (const placement of planting) assert.equal(flowerDetail(placement), placement.z < -6 ? 1 : 0);
  assert.equal(flowerDetail(planting[0]), 0, 'The lead bloom is always the full model');
  const pairs = [
    [assets.petals, assets.distantPetals], [assets.poppyPetals, assets.distantPoppyPetals],
    [assets.snowdrop.outers, assets.snowdrop.distantOuters], [[assets.snowdrop.inner], [assets.snowdrop.distantInner]],
    [assets.chrysanthemum.tiers.map(({ geometry }) => geometry), assets.chrysanthemum.distantTiers.map(({ geometry }) => geometry)],
  ];
  for (const [full, distant] of pairs) {
    assert.equal(full.length, distant.length);
    full.forEach((geometry, i) => {
      assert.ok(triangles(distant[i]) < triangles(geometry) * 0.4, 'Distant meshes are much lighter');
      assert.ok(distant[i].attributes.position.array.every(Number.isFinite));
      assert.ok(distant[i].attributes.normal.array.every(Number.isFinite));
      geometry.computeBoundingSphere();
      distant[i].computeBoundingSphere();
      assert.ok(Math.abs(geometry.boundingSphere.radius - distant[i].boundingSphere.radius) < 0.05, 'The silhouette keeps its size');
    });
  }
  assert.ok(assets.snowdrop.distantInner.attributes.color, 'Distant inner petals keep their jade marks');
  assert.ok(distantDetail.lily.rows < 38 && distantDetail.poppy.rows < 52);
  const factories = [[createLily, 6, 7], [createPoppy, 4, 22], [createSnowdrop, 6, 6], [createChrysanthemum, 4, null]];
  for (const [create, petals, anthers] of factories) {
    const near = create(0, assets, seededRandom(821), 0);
    const far = create(0, assets, seededRandom(821), 1);
    assert.equal(far.petals.length, petals);
    if (anthers !== null) assert.equal(far.anthers.count, anthers);
    assert.ok(visibleDraws(far) <= visibleDraws(near));
    updateFlowerMotion(far, 0.4, 0.05, -0.03, 0.3);
    assert.ok(far.stemGeometry.attributes.position.array.every(Number.isFinite));
  }
});

test('stems taper from a thick base to a slender neck', () => {
  const assets = makeFlowerAssets();
  assets.snowdrop = makeSnowdropAssets(assets);
  const ringRadius = (geometry, ring) => {
    const { path, tubularSegments, radialSegments } = geometry.parameters;
    const centre = path.getPointAt(ring / tubularSegments);
    const position = geometry.attributes.position;
    let total = 0;
    for (let j = 0; j < radialSegments; j++) {
      total += centre.distanceTo(new THREE.Vector3().fromBufferAttribute(position, ring * (radialSegments + 1) + j));
    }
    return total / radialSegments;
  };
  for (const flower of [createLily(0, assets, seededRandom(821)), createPoppy(1, assets, seededRandom(821)), createSnowdrop(2, assets, seededRandom(821))]) {
    const { tubularSegments, radius } = flower.stemGeometry.parameters;
    const base = ringRadius(flower.stemGeometry, 0);
    const middle = ringRadius(flower.stemGeometry, tubularSegments >> 1);
    const neck = ringRadius(flower.stemGeometry, tubularSegments);
    assert.ok(base > middle && middle > neck, 'The stem narrows all the way up');
    assert.ok(base > radius * 1.6 && neck < radius, `Unexpected taper ${base} → ${neck}`);
  }
  const straight = new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(), new THREE.Vector3(0, 2, 0)), 4, 0.1, 6, false);
  taperStem(straight, 2, 0.5);
  assert.ok(Math.abs(ringRadius(straight, 0) - 0.2) < 1e-6);
  assert.ok(Math.abs(ringRadius(straight, 4) - 0.05) < 1e-6);
});

test('buds and companion blooms share their geometry and lean with the breeze', () => {
  const assets = makeFlowerAssets();
  assets.snowdrop = makeSnowdropAssets(assets);
  const cases = [
    [createLily, assets.lilyBud, 18], [createPoppy, assets.poppyBud, 16], [createSnowdrop, assets.snowdrop.companionBell, 20],
  ];
  for (const [create, shared, maxDraws] of cases) {
    const flower = create(0, assets, seededRandom(821));
    const neighbour = create(1, assets, seededRandom(97));
    assert.equal(flower.companions.length, 2);
    assert.equal(create(0, assets, seededRandom(821), 1).companions.length, 1, 'Distant plants keep a single companion');
    assert.ok(visibleDraws(flower) <= maxDraws);
    const meshes = [];
    for (const { group } of [...flower.companions, ...neighbour.companions]) {
      group.traverse((object) => { if (object.isMesh) meshes.push(object); });
      assert.ok(group.scale.x > 0.45 && group.scale.x < 1, 'Companions stay smaller than the bloom');
      assert.ok(Math.hypot(group.position.x, group.position.z) < 0.7, 'Companions grow from the same clump');
    }
    assert.ok(meshes.filter(({ geometry }) => geometry === shared).length === 4, 'Every companion reuses one shared mesh');
    for (const { geometry } of meshes) assert.ok(!flower.privateGeometries.includes(geometry), 'Nothing extra to dispose on replant');
    assert.ok(shared.attributes.position.array.every(Number.isFinite));
    assert.ok(shared.attributes.normal.array.every(Number.isFinite));
    const [{ group, rotation }] = flower.companions;
    updateFlowerMotion(flower, 0, 0, 0, 0, true);
    assert.ok(Math.abs(group.rotation.z - rotation.z) < 1e-12 && Math.abs(group.rotation.x - rotation.x) < 1e-12, 'Paused companions rest');
    updateFlowerMotion(flower, 0, 0.3, -0.2, 0, true);
    assert.ok(group.rotation.z < rotation.z && group.rotation.x < rotation.x, 'Companions lean the way the stem bends');
  }
});

test('chrysanthemums rotate through three petal tints that share one shader', () => {
  const assets = makeFlowerAssets();
  assets.chrysanthemum = makeChrysanthemumAssets(assets);
  const { materials, tiers } = assets.chrysanthemum;
  assert.equal(materials.length, 3);
  assert.equal(new Set(materials.map(({ color }) => color.getHexString())).size, 3);
  for (const material of materials) {
    assert.equal(material.onBeforeCompile, materials[0].onBeforeCompile);
    assert.equal(material.roughnessMap, materials[0].roughnessMap);
    assert.ok(material.transparent && material.depthWrite);
    assert.equal(material.metalness, materials[0].metalness);
  }
  const used = [0, 1, 2, 3].map((id) => createChrysanthemum(id, assets, seededRandom(821)).petals[0].pivot.material);
  assert.deepEqual(used, [materials[0], materials[1], materials[2], materials[0]]);
});

test('the second particle layer has a preset for every season', (context) => {
  const { scene, particles, glyphs } = particleScene(context);
  assert.equal(new Set(glyphs).size > 8, true);
  assert.equal(glyphs.length, 23, 'Borrowed atlas rows are drawn once');
  const expected = {
    Seeds: { count: 54, row: 5, maxSize: 30, mode: 0 },
    NearFireflies: { count: 16, row: 2, maxSize: 64, mode: 2 },
    Petals: { count: 84, row: 4, maxSize: 30, mode: 0 },
    NearSnow: { count: 30, row: 0, maxSize: 72, mode: 0 },
  };
  const { uniforms, geometry } = particles;
  for (const [preset, { count, row, maxSize, mode }] of Object.entries(expected)) {
    particles.select(preset);
    assert.equal(geometry.drawRange.count, count);
    assert.equal(uniforms.atlasRow.value, row);
    assert.equal(uniforms.maxSize.value, maxSize);
    assert.equal(uniforms.mode.value, mode);
    assert.equal(scene.children.length, 1);
    const data = geometry.getAttribute('particle');
    for (let i = 0; i < count; i++) {
      assert.ok(data.getW(i) > 0 && data.getW(i) <= 0.85, 'Opacity stays in range');
      assert.ok(data.getZ(i) > 0);
      if (preset === 'Seeds') assert.ok(data.getY(i) < 0, 'Spring fluff rises');
      else assert.ok(data.getY(i) > 0);
    }
  }
  for (const season of ['Winter', 'Spring', 'Summer', 'Autumn']) {
    particles.select(season);
    assert.equal(uniforms.atlasRow.value, uniforms.mode.value, 'Season layers keep their own atlas row');
    assert.equal(uniforms.maxSize.value, 30);
  }
});

test('every season defines its lighting, shafts, and ground treatment', () => {
  const studies = ['lily', 'poppy', 'snowdrop', 'chrysanthemum'].map(gardenStudy);
  const hex = /^#[0-9a-f]{6}$/;
  for (const study of studies) {
    assert.match(study.keyLight, hex);
    assert.match(study.fillLight, hex);
    assert.equal(study.keyFrom.length, 3);
    assert.ok(study.keyFrom.every(Number.isFinite) && study.keyFrom[1] > 0, 'The key light sits above the ground');
    assert.ok(study.keyFrom[2] < 0, 'The key light sits behind the field, toward the bright sky');
    assert.match(study.beams.color, hex);
    assert.ok(study.beams.strength > 0.05 && study.beams.strength < 0.25);
    assert.ok(Math.abs(study.beams.angle) > 0.2 && Math.abs(study.beams.angle) < 1.2);
    assert.equal(Math.sign(study.beams.angle), -Math.sign(study.keyFrom[0]), 'Shafts lean toward the light');
    assert.ok((study.bloom ?? 1) > 0.5 && (study.bloom ?? 1) <= 1);
    for (const color of Object.values(study.sky)) assert.match(color, hex);
    if (study.tips) {
      assert.match(study.tips[0], hex);
      assert.ok(study.tips[1] > 0 && study.tips[1] <= 1);
    }
    for (const pair of study.signals ? [study.signals] : []) {
      assert.equal(pair.length, 2);
      for (const color of pair) assert.ok(color.length === 3 && color.every((channel) => channel >= 0 && channel < 1.3));
    }
  }
  assert.deepEqual(studies.filter(({ frost }) => frost).map(({ id }) => id), ['snowdrop']);
  assert.deepEqual(studies.filter(({ dew }) => dew).map(({ id }) => id), ['poppy']);
  assert.deepEqual(studies.filter(({ stars }) => stars).map(({ id }) => id), ['lily']);
  assert.equal(new Set(studies.map(({ keyLight }) => keyLight)).size, 4);
});

test('petal meshes and materials are built on first use and then kept', () => {
  const assets = makeFlowerAssets();
  const pending = (name, target = assets) => typeof Object.getOwnPropertyDescriptor(target, name).get === 'function';
  const slow = ['petals', 'distantPetals', 'poppyPetals', 'distantPoppyPetals', 'petalMaterials', 'poppyMaterials'];
  for (const name of slow) assert.ok(pending(name), `${name} should wait until a season needs it`);
  assert.ok(pending('lily', assets.surfaces) && pending('poppy', assets.surfaces));
  createPoppy(0, assets, seededRandom(821));
  assert.ok(!pending('poppyPetals') && !pending('poppyMaterials') && !pending('poppy', assets.surfaces));
  assert.ok(pending('distantPoppyPetals'), 'A full-detail poppy does not build the distant meshes');
  assert.ok(pending('petals') && pending('petalMaterials') && pending('lily', assets.surfaces), 'Planting poppies leaves the lily untouched');
  const { poppyPetals, poppyMaterials } = assets;
  assert.equal(assets.poppyPetals, poppyPetals, 'The same meshes are returned every time');
  assert.equal(assets.poppyMaterials, poppyMaterials);
  assert.ok(Object.keys(assets).includes('petals'), 'Lazy assets stay enumerable');
  // Autumn needs neither the lily meshes nor the lily textures.
  makeChrysanthemumAssets(assets);
  assert.ok(pending('petals') && pending('petalMaterials') && pending('lily', assets.surfaces));
});

test('notes start on the next free pulse and long queues are refused', () => {
  for (const species of ['lily', 'poppy', 'chrysanthemum', 'snowdrop']) {
    const step = pulseFor(species);
    assert.ok(step >= 0.14 && step <= 0.2, 'A pulse is unhurried but quick enough to feel immediate');
    const origin = 3.2;
    for (const now of [origin, origin + 0.01, origin + step * 4.4, origin + step * 9]) {
      const first = nextPulse(now, origin, step);
      assert.ok(first.when >= now - 1e-9 && first.when - now <= step + 1e-9);
      assert.ok(Math.abs((first.when - origin) / step - first.slot) < 1e-9, 'Notes sit on the grid');
      const second = nextPulse(now, origin, step, first.slot);
      assert.equal(second.slot, first.slot + 1, 'A second note takes the following pulse');
      const third = nextPulse(now, origin, step, second.slot);
      assert.ok(third === null || third.when - now <= step * 2 + 1e-9);
      assert.equal(nextPulse(now, origin, step, first.slot + 3), null, 'A long queue is refused');
    }
  }
});

test('every chord keeps the drone and all flowers inside the season\u2019s scale', () => {
  const pitchClass = (midi) => ((midi % 12) + 12) % 12;
  for (const species of ['lily', 'poppy', 'chrysanthemum', 'snowdrop']) {
    const scale = new Set(Array.from({ length: 12 }, (_, id) => pitchClass(flowerNote(id, species).midi)));
    assert.equal(scale.size, 5);
    const root = flowerNote(1, species).midi; // Flower 1 sits on the first degree of the scale.
    const harmony = harmonyFor(species);
    assert.equal(harmony.length, 4);
    assert.deepEqual(harmony[0], [0, 0], 'The cycle starts on the home chord');
    assert.equal(new Set(harmony.map(([semitones]) => pitchClass(semitones))).size, 4, 'Four different roots');
    for (const [semitones, shift] of harmony) {
      assert.ok(scale.has(pitchClass(root + semitones + 7)), `${species}: the drone\u2019s fifth is in the scale`);
      for (let id = 0; id < 24; id++) {
        const note = flowerNote(id, species, shift);
        assert.ok(scale.has(pitchClass(note.midi)), `${species}: flower ${id} stays in the scale`);
        assert.ok(Number.isFinite(note.frequency) && note.name);
      }
    }
    for (let id = 0; id < 24; id++) assert.deepEqual(flowerNote(id, species, 0), flowerNote(id, species));
  }
});

test('the drone changes chord on the clock, restarts with the season, and rests with the sound', async (context) => {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  let audio;
  context.after(() => {
    audio?.mute();
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  });
  let clock = 10;
  const retunes = [];
  const delays = [];
  const machine = [];
  class AudioNode {
    gain = { rampTo() {} };
    ready = Promise.resolve();
    connect() { return this; }
    toDestination() { return this; }
    triggerAttack() {}
    triggerRelease() {}
    triggerAttackRelease(...args) { machine.push(args); }
    setNote(hz) { retunes.push(Math.round(hz)); }
    load() { return new Promise(() => {}); }
  }
  class Delay extends AudioNode { delayTime = { rampTo(value) { delays.push(value); } }; }
  globalThis.window = { Tone: {
    start: async () => {}, now: () => clock, getContext: () => ({ state: 'running' }),
    Limiter: AudioNode, Gain: AudioNode, Filter: AudioNode, Reverb: AudioNode,
    FeedbackDelay: Delay, Panner: AudioNode, MonoSynth: AudioNode, FMSynth: AudioNode, MembraneSynth: AudioNode,
    NoiseSynth: AudioNode, Synth: class extends AudioNode { triggerAttackRelease() {} }, Player: AudioNode,
  } };
  globalThis.document = { hidden: false, body: { dataset: { page: 'garden' } } };
  audio = new GardenAudio();
  assert.equal(audio.noteShift, 0, 'Flowers keep their home notes while sound is off');
  assert.equal(audio.advanceHarmony(), false);

  await audio.enable('lily');
  const chord = pulseFor('lily') * 64;
  assert.ok(Math.abs(delays.at(-1) - pulseFor('lily') * 2) < 1e-9, 'The echo follows the pulse');
  assert.equal(audio.advanceHarmony(), false, 'Nothing moves inside the first chord');
  assert.deepEqual(retunes, []);
  assert.ok(machine.length >= 2, 'The machine starts with the sound');
  assert.ok(machine.every((args) => args.some((value) => typeof value === 'number' && value >= 10 && value < 10.36)), 'Steps are queued just ahead of the clock');
  machine.length = 0;
  audio.scheduleAhead();
  assert.deepEqual(machine, [], 'A step is never queued twice');
  clock = 10 + pulseFor('lily') * 16;
  audio.scheduleAhead();
  assert.ok(machine.length >= 2 && machine.length <= 12, 'Only the next few steps are queued after a pause in the timer');

  const expected = harmonyFor('lily');
  const home = 147; // D3
  for (let step = 1; step <= 4; step++) {
    clock = 10 + chord * step + 0.01;
    assert.equal(audio.advanceHarmony(), true);
    assert.equal(audio.advanceHarmony(), false, 'One change per chord');
    const [semitones, shift] = expected[step % 4];
    assert.equal(audio.noteShift, shift);
    assert.equal(retunes.splice(0)[0], Math.round(home * 2 ** (semitones / 12)));
  }

  clock += chord * 1.5;
  audio.changeStudy('chrysanthemum');
  assert.equal(audio.noteShift, 0, 'A new season starts on its home chord');
  assert.deepEqual(retunes.splice(0), [196, 294]);
  assert.ok(Math.abs(delays.at(-1) - pulseFor('chrysanthemum') * 2) < 1e-9);

  clock += pulseFor('chrysanthemum') * 64 + 0.01;
  audio.mute();
  assert.equal(audio.advanceHarmony(), false, 'The chords rest while the garden is silent');
  assert.equal(audio.noteShift, 0);
  assert.equal(audio.harmonyTimer, null);
});

test('the drum machine and music-box line stay sparse, on the grid, and in the scale', () => {
  const pitchClass = (midi) => ((midi % 12) + 12) % 12;
  for (const species of ['lily', 'poppy', 'chrysanthemum', 'snowdrop']) {
    const scale = new Set(Array.from({ length: 12 }, (_, id) => pitchClass(flowerNote(id, species).midi)));
    const bar = Array.from({ length: 16 }, (_, slot) => sequenceStep(species, slot));
    assert.ok(bar[0].kick && bar[0].bell !== null, 'Every bar starts on a kick and a bell');
    assert.ok(bar.some((step) => step.clap) && bar.some((step) => step.hat));
    const count = (part) => bar.filter((step) => part === 'bell' ? step.bell !== null : step[part]).length;
    assert.ok(count('bell') >= 3);
    for (const part of ['kick', 'clap', 'hat', 'bell']) assert.ok(count(part) <= 7, `${species}: the ${part} stays sparse`);
    assert.deepEqual(sequenceStep(species, 16), bar[0], 'The pattern repeats every sixteen pulses');
    const firstNotes = new Set();
    for (let slot = 0; slot < 64 * 4; slot++) {
      const { bell } = sequenceStep(species, slot);
      if (bell === null) continue;
      assert.ok(bell >= 62 && bell <= 98, `${species}: the bells stay in a music-box register (${bell})`);
      assert.ok(scale.has(pitchClass(bell)), `${species}: bell ${bell} is in the scale`);
      if (slot % 16 === 0) firstNotes.add(bell);
    }
    assert.equal(firstNotes.size, 4, 'The bells follow all four chords');
    assert.deepEqual(sequenceStep(species, 64 * 4), bar[0], 'The chord cycle returns home');
  }
  assert.deepEqual(sequenceStep('unknown', 3), sequenceStep('lily', 3));
  const waves = new Set(Array.from({ length: 16 }, (_, id) => leadWave(id)));
  assert.equal(waves.size, 4);
  for (const wave of waves) assert.match(wave, /^(sine|triangle\d*|square2)$/, 'Lead waveforms stay rounded');
  for (let id = 0; id < 16; id++) assert.equal(leadWave(id), leadWave(id), 'A flower keeps its waveform');
});

const sourceOf = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const gardenModules = readdirSync(new URL('.', import.meta.url)).filter((name) => name.endsWith('.js'));

test('every module is imported under one URL, so the browser loads it once', () => {
  const urls = new Map();
  for (const name of gardenModules) {
    for (const [, file, version = ''] of sourceOf(`./${name}`).matchAll(/from '\.\/([\w-]+\.js)(\?v=[\w-]+)?'/g)) {
      urls.set(file, (urls.get(file) ?? new Set()).add(version));
    }
  }
  assert.ok(urls.size > 5);
  for (const [file, versions] of urls) assert.equal(versions.size, 1, `${file} is imported as ${[...versions].join(' and ')}`);
});

test('a failed sound setup is cleared away, and the next attempt builds one set of voices', async (context) => {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  context.after(() => {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  });
  const nodes = [];
  let reverbFails = true;
  class AudioNode {
    gain = { rampTo() {} };
    ready = Promise.resolve();
    constructor() { nodes.push(this); }
    connect() { return this; }
    toDestination() { return this; }
    triggerAttack() {}
    triggerAttackRelease() {}
    triggerRelease() {}
    load() { return new Promise(() => {}); }
    dispose() { this.disposed = true; }
  }
  class Reverb extends AudioNode {
    ready = reverbFails ? Promise.reject(new Error('no impulse response')) : Promise.resolve();
  }
  globalThis.window = { Tone: {
    start: async () => {}, now: () => 1, getContext: () => ({ state: 'running' }),
    Limiter: AudioNode, Gain: AudioNode, Filter: AudioNode, Reverb,
    FeedbackDelay: AudioNode, Panner: AudioNode, MonoSynth: AudioNode, FMSynth: AudioNode, MembraneSynth: AudioNode,
    NoiseSynth: AudioNode, Synth: AudioNode, Player: AudioNode,
  } };
  globalThis.document = { hidden: false, body: { dataset: { page: 'garden' } } };
  const audio = new GardenAudio();
  await assert.rejects(audio.enable('lily'), /no impulse response/);
  assert.equal(audio.ready, false);
  assert.equal(audio.enabled, false);
  assert.equal(audio.voices.length, 0);
  assert.equal(audio.bells.length, 0);
  assert.equal(audio.drums, null);
  assert.ok(nodes.length > 20 && nodes.every((node) => node.disposed));

  reverbFails = false;
  await audio.enable('lily');
  assert.equal(audio.ready, true);
  assert.equal(audio.voices.length, 8);
  assert.equal(audio.bells.length, 3);
  audio.mute();
});

test('the English garden label reads naturally with a plural flower name', () => {
  const label = translations.en['garden.region'].replace('{flower}', gardenStudy('lily').name.toLowerCase());
  assert.equal(label, 'Interactive garden of chrome lilies');
});

test('every translated string is used by the page or the garden', () => {
  const page = sourceOf('../index.html');
  const script = sourceOf('./main.js') + sourceOf('./i18n.js');
  const used = new Set([...page.matchAll(/data-i18n(?:-\w+)?="([^"]+)"/g)].map(([, key]) => key));
  const dynamic = [...script.matchAll(/`(\w+)\.\$\{/g)].map(([, prefix]) => `${prefix}.`);
  for (const [language, strings] of Object.entries(translations)) {
    for (const key of Object.keys(strings)) {
      const referenced = used.has(key) || script.includes(`'${key}'`) || dynamic.some((prefix) => key.startsWith(prefix));
      assert.ok(referenced, `${language} translates ${key}, which nothing displays`);
    }
  }
});

test('decorative crosses are hidden from assistive technology', () => {
  const crosses = sourceOf('../index.html').match(/<span class="tiny-cross"[^>]*>/g);
  assert.ok(crosses.length >= 4);
  for (const cross of crosses) assert.match(cross, /aria-hidden="true"/);
});
