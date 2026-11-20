import * as THREE from './vendor/three.module.min.js';
import { seededRandom } from './flowers.js?v=sculpted-petals-1';

export function createAsciiParticles({ glyphs, colors, ...motion }) {
  const canvas = document.createElement('canvas');
  const cell = 64;
  canvas.width = cell * glyphs.length;
  canvas.height = cell;
  const context = canvas.getContext('2d');
  context.font = '54px monospace';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  glyphs.forEach((glyph, i) => {
    context.fillStyle = colors[i];
    context.fillText(glyph, (i + 0.5) * cell, cell / 2);
  });
  return createDriftingParticles({
    ...motion, texture: new THREE.CanvasTexture(canvas), columns: glyphs.length,
  });
}

export function createDriftingParticles({
  texture, columns = 1, count, seed, height, speed, size, sway, spin, shimmer,
}) {
  const random = seededRandom(seed);
  const positions = new Float32Array(count * 3);
  const particles = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    positions.set([(random() - 0.5) * 28, random() * height, -22 + random() * 30], i * 3);
    const phase = random() * Math.PI * 2;
    const fallRate = speed[0] + random() * speed[1];
    const diameter = size[0] + random() ** 2 * size[1];
    const opacity = 0.48 + random() * 0.37;
    particles.set([phase, fallRate, diameter, opacity], i * 4);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('particle', new THREE.BufferAttribute(particles, 4));
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      spriteMap: { value: texture },
      columns: { value: columns },
      time: { value: 0 },
      viewportHeight: { value: 1 },
      fieldHeight: { value: height },
      sway: { value: sway },
      spin: { value: spin },
      shimmer: { value: shimmer },
    },
    vertexShader: `
      attribute vec4 particle;
      uniform float time, viewportHeight, fieldHeight, sway, spin, shimmer, columns;
      varying float opacity, angle, glyph;
      void main() {
        vec3 point = position;
        point.x += sway * sin(time * .46 + particle.x);
        point.z += sway * .4 * cos(time * .34 + particle.x);
        point.y = .12 + mod(position.y - time * particle.y, fieldHeight);
        point.y += shimmer * .28 * sin(time * .6 + particle.x);
        vec4 view = modelViewMatrix * vec4(point, 1.);
        float depth = -view.z;
        float edge = smoothstep(.12, .65, point.y) * (1. - smoothstep(fieldHeight - 1., fieldHeight, point.y));
        float pulse = mix(1., .62 + .38 * sin(time * 1.7 + particle.x), shimmer);
        opacity = particle.w * edge * pulse * (1. - smoothstep(18., 37., depth));
        angle = sin(particle.x + time * (spin + abs(particle.y) * .35)) * mix(.54, .14, shimmer);
        glyph = floor(particle.x / 6.28319 * columns);
        gl_PointSize = clamp(particle.z * viewportHeight * projectionMatrix[1][1] / (2. * max(depth, .1)), 2., 30.);
        gl_Position = projectionMatrix * view;
      }
    `,
    fragmentShader: `
      uniform sampler2D spriteMap;
      uniform float columns;
      varying float opacity, angle, glyph;
      void main() {
        float c = cos(angle), s = sin(angle);
        vec2 uv = mat2(c, -s, s, c) * (gl_PointCoord - .5) + .5;
        if (any(lessThan(uv, vec2(0.))) || any(greaterThan(uv, vec2(1.)))) discard;
        vec4 sprite = texture2D(spriteMap, vec2((uv.x + glyph) / columns, uv.y));
        float alpha = sprite.a * opacity;
        if (alpha < .025) discard;
        gl_FragColor = vec4(sprite.rgb, alpha);
      }
    `,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false; // The shader moves particles beyond the initial bounds.
  points.renderOrder = 1.75;
  return points;
}

export function createSnowfall() {
  return createAsciiParticles({
    glyphs: ['*', '+', 'x', '.'], colors: ['#fff8ee', '#d9edff', '#e9f4ff', '#ffffff'],
    count: 170, seed: 153, height: 9,
    speed: [0.17, 0.24], size: [0.085, 0.19], sway: 0.55, spin: 0.15, shimmer: 0,
  });
}
