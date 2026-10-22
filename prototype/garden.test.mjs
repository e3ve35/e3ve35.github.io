import test from 'node:test';
import assert from 'node:assert/strict';
import { bloomEnvelope, bloomProfile, flowerCharacter, gestureStrength, rippleEnvelope, stepSpring } from './expressions.js';
import { createLily, makeFlowerAssets, seededRandom, updateLilyMotion } from './flowers.js';

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
