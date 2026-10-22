const clamp = (value, low = 0, high = 1) => Math.min(high, Math.max(low, value));

// Independent of frame rate, pointer resolution, and the audio implementation.
export function gestureStrength(distance, milliseconds, shortSide) {
  const screensPerSecond = Math.max(0, distance) * 1000 / Math.max(8, milliseconds) / Math.max(320, shortSide);
  return clamp(screensPerSecond / 1.8);
}

export function flowerCharacter(id, species = 'lily') {
  const color = (((id + 1) * 2654435761) >>> 0) % 997 / 997;
  const family = (id * 7) % 4;
  if (species === 'poppy') return {
    name: ['Silk tone', 'Copper hum', 'Rose chime', 'Hollow tone'][family],
    harmonicity: [1.002, 1.5, 2.001, 1][family],
    modulation: [0.35, 0.45, 0.6, 0.3][family], color,
  };
  return {
    name: ['Silver bell', 'Glass bell', 'Violet bell', 'Air bell'][family],
    harmonicity: [2.002, 3.001, 1.003, 2.5][family],
    modulation: [1.5, 1.1, 2.0, 0.9][family],
    color,
  };
}

export function bloomProfile(id, strength = 0.45, species = 'lily') {
  const character = flowerCharacter(id, species);
  strength = clamp(strength);
  if (species === 'poppy') return {
    character, strength,
    attack: 0.035 + (1 - strength) * 0.045,
    decay: 1.2 + character.color * 0.4,
    gate: 0.65 + character.color * 0.2,
    release: 1.65 + character.color * 0.4,
    velocity: 0.29 + strength * 0.27,
    brightness: 900 + strength * 2200 + character.color * 300,
    modulation: character.modulation + strength * 0.7,
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
    modulation: character.modulation + strength * 1.9,
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
