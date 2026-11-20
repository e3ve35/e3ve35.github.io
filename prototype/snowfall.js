import * as THREE from './vendor/three.module.min.js';
import { seededRandom } from './flowers.js?v=four-seasons-1';

function snowflakeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const context = canvas.getContext('2d');
  context.translate(32, 32);
  context.strokeStyle = '#fff';
  context.lineWidth = 3;
  context.lineCap = 'round';
  for (let arm = 0; arm < 6; arm++) {
    context.rotate(Math.PI / 3);
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(0, -26);
    context.moveTo(-7, -17);
    context.lineTo(0, -11);
    context.lineTo(7, -17);
    context.stroke();
  }
  return new THREE.CanvasTexture(canvas);
}

export function createDriftingParticles({
  texture, count, seed, height, speed, size, sway, spin, shimmer,
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
      time: { value: 0 },
      viewportHeight: { value: 1 },
      fieldHeight: { value: height },
      sway: { value: sway },
      spin: { value: spin },
      shimmer: { value: shimmer },
    },
    vertexShader: `
      attribute vec4 particle;
      uniform float time, viewportHeight, fieldHeight, sway, spin, shimmer;
      varying float opacity, angle;
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
        angle = particle.x + time * (spin + abs(particle.y) * .35);
        gl_PointSize = clamp(particle.z * viewportHeight * projectionMatrix[1][1] / (2. * max(depth, .1)), 2., 30.);
        gl_Position = projectionMatrix * view;
      }
    `,
    fragmentShader: `
      uniform sampler2D spriteMap;
      varying float opacity, angle;
      void main() {
        float c = cos(angle), s = sin(angle);
        vec2 uv = mat2(c, -s, s, c) * (gl_PointCoord - .5) + .5;
        if (any(lessThan(uv, vec2(0.))) || any(greaterThan(uv, vec2(1.)))) discard;
        vec4 sprite = texture2D(spriteMap, uv);
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
  return createDriftingParticles({
    texture: snowflakeTexture(), count: 170, seed: 153, height: 9,
    speed: [0.17, 0.24], size: [0.045, 0.14], sway: 0.55, spin: 0.15, shimmer: 0,
  });
}
