import test from 'node:test';
import assert from 'node:assert/strict';
import { bloomEnvelope, bloomProfile, flowerCharacter, gestureStrength, rippleEnvelope, stepSpring } from './expressions.js';
import { createLily, createPoppy, makeFlowerAssets, seededRandom, updateLilyMotion, updateFlowerMotion } from './flowers.js';
import { AsciiPollen, PollenPool } from './pollen.js';
import * as THREE from './vendor/three.module.min.js';
import { flowerNote } from './audio.js';
import { gardenStudy } from './studies.js';

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
  let draws = 0;
  flower.root.traverse((object) => { if (object.isMesh && object.material.visible !== false) draws++; });
  assert.ok(draws <= 13, `Unexpected draw count per flower: ${draws}`);
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
  assert.equal(poppy.anthers.count, 36);
  assert.equal(poppy.leaves.length, 3);
  assert.equal(poppy.species, 'poppy');
  for (const geometry of [...assets.poppyPetals, assets.poppyCenter, ...poppy.privateGeometries]) {
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
