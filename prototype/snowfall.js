import * as THREE from './vendor/three.module.min.js';
import { seededRandom } from './flowers.js?v=review-fixes-1';

const flockPositions = [[0.52, 0.51, -6], [-0.28, 0.62, -9], [-1.08, 0.71, -12]];
const birdsPerFlock = 5;
const presets = {
  Winter: {
    mode: 0, glyphs: ['*', '+', 'x', '.'], colors: ['#fff8ee', '#d9edff', '#e9f4ff', '#ffffff'],
    count: 170, seed: 153, height: 9, speed: [0.17, 0.24], size: [0.085, 0.19], sway: 0.55, spin: 0.15,
    place: (positions, index, random, height) => positions.setXYZ(index, (random() - 0.5) * 28, random() * height, -22 + random() * 30),
  },
  Spring: {
    mode: 1, glyphs: ['v', '-', '^'], colors: ['#f8e2dc', '#f8e2dc', '#f8e2dc'],
    count: flockPositions.length * birdsPerFlock, seed: 613, speed: [6.5, 1.9], size: [0.54, 0.17], sway: 0.024,
    place(positions, index, random) {
      // Store x and y in normalized screen coordinates so flocks stay within the sky band.
      const [x, y, z] = flockPositions[Math.floor(index / birdsPerFlock)];
      const bird = index % birdsPerFlock;
      positions.setXYZ(index,
        x - bird * 0.047 + random() * 0.018,
        y + (bird % 2 ? 1 : -1) * bird * 0.016 + random() * 0.01,
        z - bird * 0.52 + random() * 0.25);
    },
  },
  Summer: {
    mode: 2, glyphs: ['.', '+', '*', ':'], colors: ['#e9ff84', '#f5ffab', '#ffdf76', '#fff7a1'], halo: 8,
    count: 64, seed: 741, speed: [0.76, 0.78], size: [0.14, 0.23], sway: 0.73,
    place: (positions, index, random) => positions.setXYZ(index, (random() - 0.5) * 25, 1.25 + random() * 4.6, -16 + random() * 22),
  },
  // Loose petals drift down beside the autumn rain. Mode 0 reuses the snow
  // motion; row 4 is this preset's own strip of the glyph atlas.
  Petals: {
    mode: 0, row: 4, glyphs: ['(', ')', 'o', '~'], colors: ['#f7cfe0', '#f2deea', '#f2d48c', '#dccbff'],
    count: 84, seed: 277, height: 9, speed: [0.3, 0.32], size: [0.2, 0.3], sway: 0.95, spin: 0.7,
    place: (positions, index, random, height) => positions.setXYZ(index, (random() - 0.5) * 26, random() * height, -18 + random() * 27),
  },
  // Spring fluff rises instead of falling: the snow motion with a negative rate.
  Seeds: {
    mode: 0, row: 5, glyphs: ['*', '.', "'", '+'], colors: ['#f4ffd8', '#ffffff', '#ffe3f1', '#eaffc0'],
    count: 54, seed: 461, height: 8, speed: [-0.14, -0.16], size: [0.1, 0.16], sway: 1.25, spin: 0.5, opacity: 0.8,
    place: (positions, index, random, height) => positions.setXYZ(index, (random() - 0.5) * 24, random() * height, -14 + random() * 23),
  },
  // Larger fireflies drift between the camera and the lead bloom.
  NearFireflies: {
    mode: 2, row: 2, glyphs: ['.', '+', '*', ':'], colors: ['#e9ff84', '#f5ffab', '#ffdf76', '#fff7a1'],
    count: 16, seed: 523, speed: [0.6, 0.7], size: [0.3, 0.26], sway: 0.9, maxSize: 64,
    place: (positions, index, random) => positions.setXYZ(index, (random() - 0.5) * 16, 1 + random() * 3.6, 3 + random() * 7),
  },
  // A few large, soft flakes close to the lens give the snowfall depth.
  NearSnow: {
    mode: 0, row: 0, glyphs: ['*', '+', 'x', '.'], colors: ['#fff8ee', '#d9edff', '#e9f4ff', '#ffffff'],
    count: 30, seed: 389, height: 8, speed: [0.3, 0.2], size: [0.2, 0.22], sway: 0.7, spin: 0.2, maxSize: 72, opacity: 0.55,
    place: (positions, index, random, height) => positions.setXYZ(index, (random() - 0.5) * 15, 1 + random() * height, 4 + random() * 7),
  },
  Autumn: {
    mode: 3, glyphs: ['|', '|', '|', ':'], colors: ['#c5d2ec', '#e1e6f5', '#b6cced', '#d0c8e4'],
    count: 160, seed: 919, height: 11, speed: [4.6, 3.2], size: [0.13, 0.96], sway: 0.22,
    place(positions, index, random, height) {
      const foreground = index < 24;
      const width = foreground ? 24 : 52;
      positions.setXYZ(index, (random() - 0.5) * width, random() * height,
        foreground ? 2 + random() * 7 : -19 + random() * 21);
    },
  },
};

const capacity = Math.max(...Object.values(presets).map(({ count }) => count));

const atlasRows = 6;

function createGlyphAtlas() {
  const cell = 64;
  const canvas = document.createElement('canvas');
  canvas.width = cell * 4;
  canvas.height = cell * atlasRows;
  const context = canvas.getContext('2d');
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = '54px monospace';
  const drawn = new Set();
  for (const { mode, row = mode, glyphs, colors, halo = 0 } of Object.values(presets)) {
    // Layers that borrow a season's row reuse its glyphs; drawing them again
    // would thicken the strokes.
    if (drawn.has(row)) continue;
    drawn.add(row);
    context.shadowBlur = halo;
    glyphs.forEach((glyph, i) => {
      context.fillStyle = colors[i];
      if (halo) context.shadowColor = colors[i];
      context.fillText(glyph, (i + 0.5) * cell, (row + 0.5) * cell);
    });
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class SeasonalParticles {
  constructor(scene) {
    this.positions = new THREE.BufferAttribute(new Float32Array(capacity * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.particles = new THREE.BufferAttribute(new Float32Array(capacity * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', this.positions);
    this.geometry.setAttribute('particle', this.particles);
    this.geometry.setDrawRange(0, 0);
    this.uniforms = {
      spriteMap: { value: createGlyphAtlas() },
      mode: { value: 0 },
      atlasRow: { value: 0 },
      maxSize: { value: 30 },
      time: { value: 0 },
      viewportHeight: { value: 1 },
      fieldHeight: { value: 1 },
      sway: { value: 0 },
      spin: { value: 0 },
    };
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: this.uniforms,
      vertexShader: `
        attribute vec4 particle;
        uniform int mode;
        uniform float time, viewportHeight, fieldHeight, sway, spin, maxSize;
        varying float opacity, angle, glyph;
        varying float ripple, rippleSquash, streakWidth;
        void main() {
          vec3 point = position;
          float phase = particle.x;
          float rate = particle.y;
          float edge = 1.;
          float pulse = 1.;
          float diameter = particle.z;
          float sizeLimit = maxSize;
          vec2 flight = vec2(0.);
          angle = 0.;
          ripple = -1.;
          rippleSquash = 1.;
          streakWidth = 1.;
          glyph = floor(phase / 6.28319 * 4.);
          if (mode == 1) {
            flight.x = mod(position.x + time * .11 + 1.2, 2.4) - 1.2;
            flight.y = position.y + sway * sin(flight.x * 3.) + .011 * sin(time * 2.6 + phase);
            point.xy = vec2(0., 6.5);
            edge = 1. - smoothstep(.98, 1.2, abs(flight.x));
            glyph = floor((.5 + .499 * sin(time * rate + phase)) * 3.);
          } else if (mode == 2) {
            point.x += sway * sin(time * .53 + phase);
            point.z += sway * .65 * cos(time * .39 + phase);
            point.y += .50 * sin(time * .61 + phase * 1.7);
            float glow = .5 + .5 * sin(time * rate + phase);
            pulse = .10 + .90 * glow * glow * glow;
          } else {
            float fall = time * rate;
            if (mode == 3) {
              // Each drop lands, briefly becomes a ripple, then wraps to the top.
              float foreground = smoothstep(2., 7., position.z);
              float halfWidth = mix(26., 12., step(2., position.z));
              float lean = sway * mix(.65, 1.18, phase / 6.28319);
              float rippleDuration = .48;
              float cycleDistance = mod(fall - position.y, fieldHeight + rate * rippleDuration);
              float afterImpact = max(0., cycleDistance - fieldHeight);
              point.x = mod(position.x + (fall - afterImpact) * lean + halfWidth, 2. * halfWidth) - halfWidth;
              edge = 1. - smoothstep(halfWidth - 2., halfWidth, abs(point.x));
              if (afterImpact > 0.) {
                ripple = afterImpact / (rate * rippleDuration);
                point.y = -.12;
                diameter = mix(.18, 1.35, ripple);
                sizeLimit = 48.;
                pulse = .52 * (1. - smoothstep(.12, 1., ripple)) * smoothstep(-11., -5., point.z);
              } else {
                float height = fieldHeight - cycleDistance;
                point.y = -.12 + height + diameter * .34;
                edge *= smoothstep(0., .23, height) * (1. - smoothstep(fieldHeight - .9, fieldHeight, height));
                angle = -atan(lean);
                streakWidth = min(1., .29 / diameter);
                sizeLimit = mix(33., 56., foreground);
              }
            } else {
              point.y = .12 + mod(position.y - fall, fieldHeight);
              point.x += sway * sin(time * .46 + phase);
              point.z += sway * .4 * cos(time * .34 + phase);
              edge = smoothstep(.12, .65, point.y) * (1. - smoothstep(fieldHeight - 1., fieldHeight, point.y));
              angle = sin(phase + time * (spin + abs(rate) * .35)) * .54;
            }
          }
          vec4 view = modelViewMatrix * vec4(point, 1.);
          float depth = -view.z;
          if (mode == 3) pulse *= mix(1., .16, smoothstep(8., 24., depth));
          if (ripple >= 0.) rippleSquash = clamp((cameraPosition.y - point.y) / max(depth, 1.), .16, .72);
          opacity = particle.w * edge * pulse * (1. - smoothstep(18., 37., depth));
          if (opacity < (mode == 3 ? .012 : .025) || depth <= 0.) {
            gl_Position = vec4(2., 2., 2., 1.);
            gl_PointSize = 1.;
            return;
          }
          gl_PointSize = clamp(diameter * viewportHeight * projectionMatrix[1][1] / (2. * depth), 2., sizeLimit);
          gl_Position = projectionMatrix * view;
          if (mode == 1) gl_Position.xy = flight * gl_Position.w;
        }
      `,
      fragmentShader: `
        uniform sampler2D spriteMap;
        uniform int mode;
        uniform float atlasRow;
        varying float opacity, angle, glyph;
        varying float ripple, rippleSquash, streakWidth;
        void main() {
          if (ripple >= 0.) {
            vec2 p = gl_PointCoord * 2. - 1.;
            p.y /= rippleSquash;
            float ring = 1. - smoothstep(.035, .12, abs(length(p) - .75));
            float gaps = smoothstep(.12, .26, fract(atan(p.y, p.x) * .96 + glyph * .19));
            float alpha = ring * gaps * opacity;
            if (alpha < .012) discard;
            gl_FragColor = vec4(.56, .69, .88, alpha);
            return;
          }
          float c = cos(angle), s = sin(angle);
          vec2 uv = mat2(c, -s, s, c) * (gl_PointCoord - .5) + .5;
          if (mode != 0) uv.y = 1. - uv.y;
          uv.x = (uv.x - .5) / streakWidth + .5;
          if (any(lessThan(uv, vec2(0.))) || any(greaterThan(uv, vec2(1.)))) discard;
          vec2 tile = vec2(glyph, 6. - 1. - atlasRow);
          vec4 sprite = texture2D(spriteMap, (tile + uv) / vec2(4., 6.));
          float alpha = sprite.a * opacity;
          if (alpha < (mode == 3 ? .012 : .025)) discard;
          gl_FragColor = vec4(sprite.rgb, alpha);
        }
      `,
    });
    this.points = new THREE.Points(this.geometry, material);
    this.points.frustumCulled = false; // Positions move beyond the input bounds in the shader.
    this.points.renderOrder = 1.75;
    scene?.add(this.points);
  }

  select(season) {
    if (this.season === season) return;
    this.season = season;
    const { mode, row = mode, count, seed, height = 1, speed, size, sway, spin = 0, maxSize = 30, opacity: strength = 1, place } = presets[season];
    const random = seededRandom(seed);
    for (let i = 0; i < count; i++) {
      place(this.positions, i, random, height);
      const phase = random() * Math.PI * 2;
      const rate = speed[0] + random() * speed[1];
      const diameter = size[0] + random() ** 2 * size[1];
      const opacity = (0.48 + random() * 0.37) * strength;
      this.particles.setXYZW(i, phase, rate, diameter, opacity);
    }
    for (const attribute of [this.positions, this.particles]) {
      attribute.clearUpdateRanges();
      attribute.addUpdateRange(0, count * attribute.itemSize);
      attribute.needsUpdate = true;
    }
    this.geometry.setDrawRange(0, count);
    this.uniforms.mode.value = mode;
    this.uniforms.atlasRow.value = row;
    this.uniforms.maxSize.value = maxSize;
    this.uniforms.fieldHeight.value = height;
    this.uniforms.sway.value = sway;
    this.uniforms.spin.value = spin;
  }

  update(elapsed, viewportHeight) {
    this.uniforms.time.value = elapsed;
    this.uniforms.viewportHeight.value = viewportHeight;
  }
}
