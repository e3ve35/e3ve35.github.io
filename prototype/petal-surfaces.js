import * as THREE from './vendor/three.module.min.js';

// Shared PBR maps follow the petal UVs: u across its width, t from root to tip.
// Smoother rims catch thin reflections; the body keeps a fine brushed finish.
export function createPetalSurfaces(species = 'lily') {
  const styles = {
    lily: { frequency: 84, grain: 0.13, rootShade: 0.34, crease: 0.18, seed: 744 },
    poppy: { frequency: 34, grain: 0.17, rootShade: 0.22, crease: 0.08, seed: 931 },
    snowdrop: { frequency: 65, grain: 0.085, rootShade: 0.30, crease: 0.12, seed: 1208 },
  };
  const style = styles[species] || styles.lily;
  const width = 128, height = 256;
  const pixels = { roughnessMap: new Uint8Array(width * height * 4), bumpMap: new Uint8Array(width * height * 4), aoMap: new Uint8Array(width * height * 4) };
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const u = x / (width - 1) * 2 - 1;
    const t = y / (height - 1);
    const middle = Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.7);
    const rim = THREE.MathUtils.smoothstep(Math.abs(u), 0.62, 0.97) * THREE.MathUtils.smoothstep(t, 0.05, 0.28);
    const tip = THREE.MathUtils.smoothstep(t, 0.72, 1);
    const noise = ((Math.imul(x + style.seed, 374761393) ^ Math.imul(y + 17, 668265263)) >>> 0) / 4294967295 - 0.5;
    const grain = Math.sin(u * style.frequency + Math.sin(t * 8 + u * 3) * 0.65);
    const fine = Math.sin(u * 173 + t * 2.5) * 0.025;
    const roughness = THREE.MathUtils.clamp(0.91 - rim * 0.49 - tip * 0.36
      + (grain * 0.025 + noise * 0.035) * middle, 0.28, 0.98);
    const brushed = middle * (1 - rim * 0.65) * (1 - tip * 0.72);
    const bump = 0.5 + (grain * style.grain + fine + noise * 0.018) * brushed;
    const rootShade = (1 - THREE.MathUtils.smoothstep(t, 0.02, 0.23)) * style.rootShade;
    const crease = Math.exp(-u * u * 45) * middle * style.crease;
    const ao = 1 - rootShade - crease;
    const offset = (y * width + x) * 4;
    for (const [name, value] of [['roughnessMap', roughness], ['bumpMap', bump], ['aoMap', ao]]) {
      const shade = Math.round(THREE.MathUtils.clamp(value, 0, 1) * 255);
      pixels[name][offset] = pixels[name][offset + 1] = pixels[name][offset + 2] = shade;
      pixels[name][offset + 3] = 255;
    }
  }
  return Object.fromEntries(Object.entries(pixels).map(([name, data]) => {
    const texture = new THREE.DataTexture(data, width, height);
    texture.name = `${species}-${name}`;
    texture.channel = 0;
    texture.colorSpace = THREE.NoColorSpace;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;
    return [name, texture];
  }));
}
