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

export function createSnowfall() {
  const count = 170;
  const random = seededRandom(153);
  const positions = new Float32Array(count * 3);
  const flakes = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    positions.set([(random() - 0.5) * 28, random() * 9, -22 + random() * 30], i * 3);
    const phase = random() * Math.PI * 2;
    const speed = 0.17 + random() * 0.24;
    const size = 0.045 + random() ** 2 * 0.14;
    const opacity = 0.48 + random() * 0.37;
    flakes.set([phase, speed, size, opacity], i * 4);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('flake', new THREE.BufferAttribute(flakes, 4));
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      flakeMap: { value: snowflakeTexture() },
      time: { value: 0 },
      viewportHeight: { value: 1 },
    },
    vertexShader: `
      attribute vec4 flake;
      uniform float time, viewportHeight;
      varying float opacity, angle;
      void main() {
        vec3 point = position;
        point.x += .55 * sin(time * .46 + flake.x);
        point.z += .22 * cos(time * .34 + flake.x);
        point.y = .12 + mod(position.y - time * flake.y, 9.);
        vec4 view = modelViewMatrix * vec4(point, 1.);
        float depth = -view.z;
        float edge = smoothstep(.12, .65, point.y) * (1. - smoothstep(8., 9., point.y));
        opacity = flake.w * edge * (1. - smoothstep(18., 37., depth));
        angle = flake.x + time * (.15 + flake.y * .35);
        gl_PointSize = clamp(flake.z * viewportHeight * projectionMatrix[1][1] / (2. * max(depth, .1)), 2., 26.);
        gl_Position = projectionMatrix * view;
      }
    `,
    fragmentShader: `
      uniform sampler2D flakeMap;
      varying float opacity, angle;
      void main() {
        float c = cos(angle), s = sin(angle);
        vec2 uv = mat2(c, -s, s, c) * (gl_PointCoord - .5) + .5;
        float alpha = texture2D(flakeMap, uv).a * opacity;
        if (alpha < .025) discard;
        gl_FragColor = vec4(1., .97, .92, alpha);
      }
    `,
  });
  const snow = new THREE.Points(geometry, material);
  snow.frustumCulled = false; // The shader moves flakes beyond the initial bounds.
  snow.renderOrder = 1.75;
  return snow;
}
