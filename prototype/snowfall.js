import * as THREE from './vendor/three.module.min.js';
import { seededRandom } from './flowers.js?v=pearl-blooms-1';

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
  Autumn: {
    mode: 3, glyphs: ['<>', '()', '/', '~'], colors: ['#ffd464', '#f79b42', '#ed6754', '#db4740'], fontSize: 42,
    count: 72, seed: 919, height: 8.5, speed: [0.58, 0.52], size: [0.22, 0.25], sway: 0.24, spin: 0.46,
    place: (positions, index, random, height) => positions.setXYZ(index, (random() - 0.5) * 52, random() * height, -19 + random() * 25),
  },
};

const capacity = Math.max(...Object.values(presets).map(({ count }) => count));

function createGlyphAtlas() {
  const cell = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = cell * 4;
  const context = canvas.getContext('2d');
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  for (const { mode, glyphs, colors, halo = 0, fontSize = 54 } of Object.values(presets)) {
    context.font = `${fontSize}px monospace`;
    context.shadowBlur = halo;
    glyphs.forEach((glyph, i) => {
      context.fillStyle = colors[i];
      if (halo) context.shadowColor = colors[i];
      context.fillText(glyph, (i + 0.5) * cell, (mode + 0.5) * cell);
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
        uniform float time, viewportHeight, fieldHeight, sway, spin;
        varying float opacity, angle, glyph, leafWidth;
        void main() {
          vec3 point = position;
          float phase = particle.x;
          float rate = particle.y;
          float edge = 1.;
          float pulse = 1.;
          vec2 flight = vec2(0.);
          angle = 0.;
          leafWidth = 1.;
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
            point.y = .12 + mod(position.y - time * rate, fieldHeight);
            if (mode == 3) {
              // Drift with the wind and fade before wrapping the same leaf back into the sky.
              point.x = mod(position.x + time * rate * .60 + 26., 52.) - 26.;
              point.x += sway * sin(time * 1.4 + phase);
              point.z += .21 * cos(time * 1.1 + phase);
              edge = smoothstep(.12, .72, point.y) * (1. - smoothstep(fieldHeight - .9, fieldHeight, point.y));
              edge *= 1. - smoothstep(24., 26., abs(point.x));
              angle = phase + time * (spin + rate * .35);
              leafWidth = .7 + .3 * abs(cos(phase + time * 2.1));
            } else {
              point.x += sway * sin(time * .46 + phase);
              point.z += sway * .4 * cos(time * .34 + phase);
              edge = smoothstep(.12, .65, point.y) * (1. - smoothstep(fieldHeight - 1., fieldHeight, point.y));
              angle = sin(phase + time * (spin + abs(rate) * .35)) * .54;
            }
          }
          vec4 view = modelViewMatrix * vec4(point, 1.);
          float depth = -view.z;
          opacity = particle.w * edge * pulse * (1. - smoothstep(18., 37., depth));
          if (opacity < .025 || depth <= 0.) {
            gl_Position = vec4(2., 2., 2., 1.);
            gl_PointSize = 1.;
            return;
          }
          gl_PointSize = clamp(particle.z * viewportHeight * projectionMatrix[1][1] / (2. * depth), 2., 30.);
          gl_Position = projectionMatrix * view;
          if (mode == 1) gl_Position.xy = flight * gl_Position.w;
        }
      `,
      fragmentShader: `
        uniform sampler2D spriteMap;
        uniform int mode;
        varying float opacity, angle, glyph, leafWidth;
        void main() {
          float c = cos(angle), s = sin(angle);
          vec2 uv = mat2(c, -s, s, c) * (gl_PointCoord - .5) + .5;
          if (mode != 0) uv.y = 1. - uv.y;
          uv.x = (uv.x - .5) / leafWidth + .5;
          if (any(lessThan(uv, vec2(0.))) || any(greaterThan(uv, vec2(1.)))) discard;
          vec2 tile = vec2(glyph, 3. - float(mode));
          vec4 sprite = texture2D(spriteMap, (tile + uv) / 4.);
          float alpha = sprite.a * opacity;
          if (alpha < .025) discard;
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
    const { mode, count, seed, height = 1, speed, size, sway, spin = 0, place } = presets[season];
    const random = seededRandom(seed);
    for (let i = 0; i < count; i++) {
      place(this.positions, i, random, height);
      const phase = random() * Math.PI * 2;
      const rate = speed[0] + random() * speed[1];
      const diameter = size[0] + random() ** 2 * size[1];
      const opacity = 0.48 + random() * 0.37;
      this.particles.setXYZW(i, phase, rate, diameter, opacity);
    }
    for (const attribute of [this.positions, this.particles]) {
      attribute.clearUpdateRanges();
      attribute.addUpdateRange(0, count * attribute.itemSize);
      attribute.needsUpdate = true;
    }
    this.geometry.setDrawRange(0, count);
    this.uniforms.mode.value = mode;
    this.uniforms.fieldHeight.value = height;
    this.uniforms.sway.value = sway;
    this.uniforms.spin.value = spin;
  }

  update(elapsed, viewportHeight) {
    this.uniforms.time.value = elapsed;
    this.uniforms.viewportHeight.value = viewportHeight;
  }
}

// Cached versions of the garden still import the winter-only factory.
export function createSnowfall() {
  const particles = new SeasonalParticles();
  particles.select('Winter');
  return particles.points;
}
