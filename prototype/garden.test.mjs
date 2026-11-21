import test from 'node:test';
import assert from 'node:assert/strict';
import { bloomEnvelope, bloomProfile, flowerCharacter, gestureStrength, rippleEnvelope, stepSpring } from './expressions.js';
import { createLily, createPoppy, createChrysanthemum, makeChrysanthemumAssets, makeFlowerAssets, seededRandom, updateLilyMotion, updateFlowerMotion } from './flowers.js';
import { AsciiPollen, PollenPool } from './pollen.js';
import * as THREE from './vendor/three.module.min.js';
import { flowerNote, GardenAudio } from './audio.js';
import { gardenStudy, gardenSelection } from './studies.js';
import { createSnowdrop, makeSnowdropAssets } from './snowdrops.js';
import { gardenPlanting, placeFlower, meadowGrass, gardenAtmosphere, createContactShadows, updateContactShadows } from './composition.js';
import { GroundSignals, groundMarks, groundGlyphAtlas } from './ground-signals.js';
import { createPetalSurfaces } from './petal-surfaces.js';
import { SeasonalParticles } from './snowfall.js';

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

test('cached garden versions can still initialize and animate winter snowfall', async (context) => {
  particleScene(context);
  const { createSnowfall } = await import('./snowfall.js');
  assert.equal(typeof createSnowfall, 'function');
  const snow = createSnowfall();
  assert.ok(snow.isPoints);
  assert.equal(snow.geometry.drawRange.count, 170);
  assert.equal(snow.material.uniforms.time.value, 0);
  assert.equal(snow.material.uniforms.viewportHeight.value, 1);
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
    [assets.poppyMaterials, assets.surfaces.poppy, 0.8, 0.08, 0.43],
    [[assets.snowdrop.material, assets.snowdrop.innerMaterial], assets.snowdrop.surface, 0.65, 0.08, 0.45],
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
    assert.equal(material.metalness, 0.97);
    assert.equal(material.envMapIntensity, 1.65);
  }
  for (const { material } of makeChrysanthemumAssets(assets).tiers) {
    assert.equal(material.metalness, winterPetal.metalness);
    assert.equal(material.roughness, winterPetal.roughness);
    assert.equal(material.envMapIntensity, winterPetal.envMapIntensity);
    assert.ok(material.color.equals(winterPetal.color));
  }
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
  assert.ok(bright.modulation > soft.modulation);
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
    FeedbackDelay: AudioNode, Panner: AudioNode, FMSynth: AudioNode, Synth: PadVoice, Player: Recording,
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
  assert.deepEqual(recordingEvents.splice(0), [['load', 'spring-birds.wav']]);

  audio.changeStudy('chrysanthemum');
  assert.deepEqual(events.splice(0), [['retune', 196], ['retune', 294]]);
  pendingRecordings.get('spring-birds.wav')();
  await Promise.resolve();
  audio.setVisibility(false);
  assert.deepEqual(recordingEvents.splice(0), [['load', 'light-rain.wav']]);
  pendingRecordings.get('light-rain.wav')();
  await Promise.resolve();
  assert.deepEqual(recordingEvents, []);
  audio.changeStudy('snowdrop');
  assert.deepEqual(events.splice(0), [['release'], ['release']]);
  audio.setVisibility(true);
  assert.deepEqual(events.splice(0), [['attack', 147], ['attack', 220]]);
  pendingRecordings.get('winter-snow.wav')();
  await Promise.resolve();
  assert.deepEqual(recordingEvents.splice(0), [['load', 'winter-snow.wav'], ['start', 'winter-snow.wav']]);

  audio.mute();
  audio.setVisibility(true);
  assert.deepEqual(events.splice(0), [['release'], ['release']]);
  await audio.enable('lily');
  assert.deepEqual(events.splice(0), [['attack', 147], ['attack', 220]]);
  assert.equal(volumes.length, 2, 'Re-enabling sound reuses the pad voices');
  pendingRecordings.get('summer-wind.wav')();
  await Promise.resolve();
  assert.ok(recordingVolumes.get('summer-wind.wav') <= recordingVolumes.get('spring-birds.wav') - 6);
  assert.deepEqual(recordingEvents.splice(0), [
    ['stop', 'winter-snow.wav'], ['load', 'summer-wind.wav'], ['start', 'summer-wind.wav'],
  ]);
  audio.changeStudy('chrysanthemum');
  audio.setVisibility(true);
  audio.changeStudy('poppy');
  audio.mute();
  assert.deepEqual(recordingEvents, [
    ['stop', 'summer-wind.wav'], ['start', 'light-rain.wav'], ['stop', 'light-rain.wav'],
    ['start', 'spring-birds.wav'], ['stop', 'spring-birds.wav'],
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
  assert.ok(draws <= 14, `Unexpected draw count per flower: ${draws}`);
});

test('upright chrysanthemums have a clustered center and batched moving petal tiers', () => {
  const assets = makeFlowerAssets();
  assets.chrysanthemum = makeChrysanthemumAssets(assets);
  const { tiers, center, leaf } = assets.chrysanthemum;
  const flower = createChrysanthemum(0, assets, seededRandom(821));
  assert.equal(flower.petals.length, 4);
  assert.deepEqual(flower.head.scale.toArray(), [1.4, 1.4, 1.4]);
  assert.ok(flower.head.rotation.x >= 0.42 && flower.head.rotation.x <= 0.69);
  assert.equal(flower.stamens.geometry, center);
  center.computeBoundingBox();
  const centerSize = center.boundingBox.getSize(new THREE.Vector3());
  assert.ok(centerSize.x > 0.32 && centerSize.x < 0.44 && centerSize.y < 0.2);
  assert.equal(center.attributes.position.count / 3, 1920);
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
  const { tiers, centerMaterial } = makeChrysanthemumAssets(assets);
  for (const { material } of tiers) {
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
  updateLilyMotion(flower, 1, 0.25, -0.1, 0.5);
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
  updateLilyMotion(flower, 1, 0, 0, 0, true);
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
  updateLilyMotion(flower, 0, 0, 0, 0);
  const before = origin();
  updateLilyMotion(flower, 2, 0.3, -0.2, 0.5);
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
  assert.ok(draws <= 13, `Unexpected draw count per poppy: ${draws}`);
});

test('poppy timbres are softer and retain consistent identity, pitch, and envelope timing', () => {
  for (let id = 0; id < 18; id++) {
    const lily = bloomProfile(id, 0.7);
    const poppy = bloomProfile(id, 0.7, 'poppy');
    assert.ok(poppy.attack > lily.attack);
    assert.ok(poppy.brightness < lily.brightness);
    assert.ok(poppy.modulation < lily.modulation);
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
      assert.equal(choice.caption, `${choice.study.season} preview · ${choice.study.name}`);
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
  assets.snowdrop.outer.computeBoundingBox();
  assert.ok(assets.snowdrop.outer.boundingBox.min.y < -1.5);
  let draws = 0;
  flower.root.traverse((object) => { if (object.isMesh && object.material.visible !== false) draws++; });
  assert.ok(draws <= 13);
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
    assert.equal(flowerNote(id, 'snowdrop').frequency, flowerNote(id).frequency * 2);
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
