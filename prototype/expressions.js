const clamp = (value, low = 0, high = 1) => Math.min(high, Math.max(low, value));

// Independent of frame rate, pointer resolution, and the audio implementation.
export function gestureStrength(distance, milliseconds, shortSide) {
  const screensPerSecond = Math.max(0, distance) * 1000 / Math.max(8, milliseconds) / Math.max(320, shortSide);
  return clamp(screensPerSecond / 1.8);
}

export function flowerCharacter(id, species = 'lily') {
  const color = (((id + 1) * 2654435761) >>> 0) % 997 / 997;
  const family = (id * 7) % 4;
  if (species === 'chrysanthemum') return {
    name: ['Copper pluck', 'Amber string', 'Bronze chime', 'Ember tone'][family],
    color,
  };
  if (species === 'snowdrop') return {
    name: ['Ice bell', 'Frost glass', 'Silver droplet', 'Winter chime'][family],
    color,
  };
  if (species === 'poppy') return {
    name: ['Silk tone', 'Copper hum', 'Rose chime', 'Hollow tone'][family],
    color,
  };
  return {
    name: ['Silver bell', 'Glass bell', 'Violet bell', 'Air bell'][family],
    color,
  };
}

export function bloomProfile(id, strength = 0.45, species = 'lily') {
  const character = flowerCharacter(id, species);
  strength = clamp(strength);
  if (species === 'chrysanthemum') return {
    character, strength,
    attack: 0.010 + (1 - strength) * 0.010,
    decay: 0.64 + character.color * 0.34,
    gate: 0.38 + character.color * 0.14,
    release: 1.1 + character.color * 0.45,
    velocity: 0.28 + strength * 0.30,
    brightness: 1150 + strength * 2450 + character.color * 350,
    energy: 0.45 + strength * 0.52,
  };
  if (species === 'snowdrop') return {
    character, strength,
    attack: 0.012 + (1 - strength) * 0.012,
    decay: 2.2 + character.color * 0.8,
    gate: 0.9 + character.color * 0.18,
    release: 2.6 + character.color * 0.5,
    velocity: 0.2 + strength * 0.22,
    brightness: 2100 + strength * 1600 + character.color * 300,
    energy: 0.3 + strength * 0.4,
  };
  if (species === 'poppy') return {
    character, strength,
    attack: 0.035 + (1 - strength) * 0.045,
    decay: 1.2 + character.color * 0.4,
    gate: 0.65 + character.color * 0.2,
    release: 1.65 + character.color * 0.4,
    velocity: 0.29 + strength * 0.27,
    brightness: 900 + strength * 2200 + character.color * 300,
    energy: 0.4 + strength * 0.5,
  };
  return {
    character,
    strength,
    attack: 0.008 + (1 - strength) * 0.009,
    decay: 0.75 + character.color * 0.28,
    gate: 0.35 + character.color * 0.11,
    release: 1.15 + character.color * 0.45,
    velocity: 0.31 + strength * 0.38,
    brightness: 1600 + strength * 3900 + character.color * 600,
    energy: 0.46 + strength * 0.54,
  };
}

// Uses the same attack, gate, decay, and release parameters as the synth.
// The exponential approximation lets motion follow the bell's audible contour.
export function bloomEnvelope(age, profile) {
  if (age < 0 || age >= profile.gate + profile.release) return 0;
  if (age < profile.attack) return age / profile.attack;
  const decayAt = (time) => Math.exp(-4.5 * Math.max(0, time - profile.attack) / profile.decay);
  if (age < profile.gate) return decayAt(age);
  return decayAt(profile.gate) * Math.exp(-5.5 * (age - profile.gate) / profile.release);
}

// Exact solution of an underdamped spring with a fixed target for this frame.
export function stepSpring(state, target, delta, frequency = 13, damping = 0.67) {
  if (delta <= 0) return state.value;
  const w = frequency;
  const wd = w * Math.sqrt(1 - damping * damping);
  const x = state.value - target;
  const velocity = state.velocity;
  const decay = Math.exp(-damping * w * delta);
  const sine = Math.sin(wd * delta);
  const cosine = Math.cos(wd * delta);
  state.value = target + decay * (x * cosine + (velocity + damping * w * x) / wd * sine);
  state.velocity = decay * (velocity * cosine - (damping * w * velocity + w * w * x) / wd * sine);
  return state.value;
}

export function rippleEnvelope(age, distance, profile) {
  if (distance <= 0.01 || distance > 9) return 0;
  const arrived = age - distance / 4.4;
  return bloomEnvelope(arrived, profile) * profile.energy * Math.exp(-distance * 0.28) * 0.32;
}
