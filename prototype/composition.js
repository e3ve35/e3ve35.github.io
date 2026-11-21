import * as THREE from './vendor/three.module.min.js';
import { seededRandom } from './flowers.js?v=pearl-blooms-1';

// The lead bloom and foreground edges frame a few loose, receding drifts.
// Local jitter preserves the clearings instead of scattering every stem uniformly.
const drifts = [
  { x: 1.65, z: 1.1, yaw: -0.12, flowers: [[0, 0, 1.18], [2.6, -2.8, 0.88], [-0.8, -5, 0.70]] },
  { x: -5.2, z: -3.5, yaw: 0.38, flowers: [[0, 0, 0.88], [1.9, -2.8, 0.72], [-1.6, -4.2, 0.67]] },
  { x: 6.8, z: -6.3, yaw: -0.42, flowers: [[0, 0, 0.83], [2.7, -1.8, 0.76], [-1.6, -3.4, 0.70]] },
  { x: -4.3, z: -14.4, yaw: 0.30, flowers: [[-1.1, 0, 0.76], [1.2, -1.5, 0.65], [-0.3, -4.4, 0.61]] },
  { x: 4.4, z: -21, yaw: -0.20, flowers: [[0, 0.5, 0.73], [2.7, -1.5, 0.62], [-2, -3.7, 0.59]] },
  { x: 0, z: 0, yaw: 0, flowers: [[5.9, 3.7, 1.21], [-5.2, 3, 1.05], [-9.3, -1.8, 0.94]] },
];
const sizeFactors = [0.72, 1, 1.23];
const distortionRanges = [[0.11, 0.27], [0.40, 0.64], [0.80, 0.95]];

export const gardenAtmosphere = Object.freeze({ color: '#24152f', near: 18, far: 43 });

export function gardenPlanting(seed) {
  const random = seededRandom(seed + 1709);
  const sizeRandom = seededRandom(seed + 2027);
  const angleRandom = seededRandom(seed + 2519);
  const distortionRandom = seededRandom(seed + 3011);
  return drifts.flatMap((drift, cluster) => {
    const dx = (random() - 0.5) * 0.45;
    const dz = (random() - 0.5) * 0.55;
    const sizeOffset = Math.floor(sizeRandom() * sizeFactors.length);
    const distortionOffset = Math.floor(distortionRandom() * distortionRanges.length);
    return drift.flowers.map(([x, z, scale], index) => {
      const lead = cluster === 0 && index === 0;
      const jitter = lead ? 0.12 : 0.55;
      const sizeFactor = lead ? 1 : sizeFactors[(index + sizeOffset) % sizeFactors.length];
      const [minDistortion, maxDistortion] = distortionRanges[(index + distortionOffset) % distortionRanges.length];
      return {
        x: drift.x + x + (lead ? 0 : dx) + (random() - 0.5) * jitter,
        z: drift.z + z + (lead ? 0 : dz) + (random() - 0.5) * jitter,
        scale: THREE.MathUtils.clamp(scale * sizeFactor * (0.95 + random() * 0.10), 0.52, 1.28),
        yaw: lead ? -0.08 + (random() - 0.5) * 0.10 : drift.yaw + (random() - 0.5) * 1.68,
        pitch: lead ? 0 : (angleRandom() - 0.5) * 0.44,
        roll: lead ? 0 : (angleRandom() - 0.5) * 0.38,
        distortion: THREE.MathUtils.lerp(minDistortion, maxDistortion, distortionRandom()),
        cluster,
      };
    });
  });
}

// Flowers past the middle drifts are small on screen and use the coarser meshes.
export function flowerDetail({ z }) { return z < -6 ? 1 : 0; }

// The meadow is level where the flowers are played and rolls upward behind
// them, so the far drifts stack into the view instead of flattening out.
export function groundHeight(x, z) {
  const far = THREE.MathUtils.smoothstep(-z, 5, 24);
  return far * (0.3 + 0.55 * Math.sin(x * 0.16 + 1.3) + 0.35 * Math.sin(x * 0.07 - z * 0.11));
}

export function placeFlower(flower, { x, z, scale, yaw, pitch, roll, distortion }) {
  flower.distortion = distortion;
  flower.root.position.set(x, 0, z);
  flower.root.scale.setScalar(scale);
  flower.root.rotation.y = yaw;
  flower.baseRotation.x += pitch;
  flower.baseRotation.z += roll;
  flower.head.rotation.copy(flower.baseRotation);
}

export function meadowGrass(planting, seed, count = 220) {
  const random = seededRandom(seed + 186);
  return Array.from({ length: count }, () => {
    const nearFlower = random() < 0.75;
    const flower = planting[Math.floor(random() * planting.length)];
    const angle = random() * Math.PI * 2;
    const radius = (0.4 + random() ** 1.5 * 2.7) * flower.scale;
    return {
      x: nearFlower ? flower.x + Math.cos(angle) * radius : (random() - 0.5) * 30,
      z: nearFlower ? flower.z + Math.sin(angle) * radius : (random() - 0.78) * 32,
      yaw: random() * Math.PI * 2,
      lean: 0.65 + random() * 0.6,
      scale: (0.13 + random() * 0.45) * (nearFlower ? Math.min(1, flower.scale) : 1),
    };
  });
}

export function createContactShadows(count) {
  const size = 64;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const radius = Math.hypot((x + 0.5) / size * 2 - 1, (y + 0.5) / size * 2 - 1);
    const offset = (y * size + x) * 4;
    pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 255;
    pixels[offset + 3] = Math.round(Math.exp(-radius * radius * 6) * (1 - THREE.MathUtils.smoothstep(radius, 0.7, 1)) * 255);
  }
  const map = new THREE.DataTexture(pixels, size, size);
  map.needsUpdate = true;
  map.magFilter = map.minFilter = THREE.LinearFilter;
  const material = new THREE.MeshBasicMaterial({
    color: '#08050d', map, transparent: true, opacity: 0.62, depthWrite: false, toneMapped: false,
  });
  const shadows = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), material, count);
  // The translucent floor draws first; opaque stems still occlude the shadows.
  shadows.renderOrder = 1;
  return shadows;
}

export function updateContactShadows(shadows, planting, heightAt = () => 0) {
  const dummy = new THREE.Object3D();
  for (let i = 0; i < planting.length; i++) {
    const { x, z, scale, yaw } = planting[i];
    dummy.position.set(x, -0.14 + heightAt(x, z), z);
    dummy.rotation.set(-Math.PI / 2, 0, yaw);
    dummy.scale.set(scale * 2.5, scale * 1.9, 1);
    dummy.updateMatrix();
    shadows.setMatrixAt(i, dummy.matrix);
  }
  shadows.instanceMatrix.needsUpdate = true;
  shadows.computeBoundingSphere();
}
