import * as THREE from './vendor/three.module.min.js';
import { seededRandom } from './flowers.js?v=sculpted-flowers-1';
import { gardenAtmosphere } from './composition.js?v=garden-depth-1';

const TRACE_COUNT = 260;
const GLYPH_COUNT = 110;
const MAX_ROOTS = 18;
const MAX_MARKS = TRACE_COUNT + GLYPH_COUNT + MAX_ROOTS;

// A tiny, font-independent ASCII atlas. Rows are written bottom-up for UV space.
export function groundGlyphAtlas() {
  const glyphs = [
    ['00000', '00100', '00100', '11111', '00100', '00100', '00000'], // +
    ['01110', '10001', '10011', '10101', '11001', '10001', '01110'], // 0
    ['00100', '01100', '00100', '00100', '00100', '00100', '01110'], // 1
    ['01010', '01010', '11111', '01010', '11111', '01010', '01010'], // #
    ['00001', '00010', '00010', '00100', '01000', '01000', '10000'], // /
    ['00000', '00100', '00100', '00000', '00100', '00100', '00000'], // :
    ['00000', '00000', '00000', '00000', '00000', '00000', '11111'], // _
    ['00000', '00000', '00000', '00000', '00000', '00110', '00110'], // .
  ];
  const pixels = new Uint8Array(64 * 8 * 4);
  glyphs.forEach((rows, glyph) => rows.forEach((row, y) => [...row].forEach((ink, x) => {
    const offset = ((7 - y) * 64 + glyph * 8 + x + 1) * 4;
    pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 255;
    pixels[offset + 3] = ink === '1' ? 255 : 0;
  })));
  const atlas = new THREE.DataTexture(pixels, 64, 8);
  atlas.magFilter = atlas.minFilter = THREE.NearestFilter;
  atlas.needsUpdate = true;
  return atlas;
}

export function groundMarks(planting, seed) {
  const random = seededRandom(seed + 4201);
  const roots = planting.slice(0, MAX_ROOTS);
  const marks = [];
  if (!roots.length) return marks;
  for (let i = 0; i < TRACE_COUNT + GLYPH_COUNT; i++) {
    const rootId = Math.floor(random() ** 1.5 * roots.length);
    const root = roots[rootId];
    const nearRoot = random() < 0.55;
    const angle = random() * Math.PI * 2;
    const radius = 0.7 + random() * 3.2;
    const glyph = i >= TRACE_COUNT;
    marks.push({
      x: nearRoot ? root.x + Math.cos(angle) * radius : (random() - 0.5) * 27,
      z: nearRoot ? root.z + Math.sin(angle) * radius : -17 + random() * 23,
      width: glyph ? 0.22 + random() * 0.13 : 0.25 + random() ** 1.5 * 1.25,
      height: glyph ? 0.34 + random() * 0.16 : 0.025 + random() * 0.035,
      angle: random() < 0.22 ? Math.PI / 2 : 0,
      kind: glyph ? 1 : 0,
      seed: random(), glyph: Math.floor(random() * 8), root: nearRoot ? rootId : -1,
    });
  }
  roots.forEach(({ x, z, scale }, root) => marks.push({
    x, z, width: 4.8 * scale, height: 4.8 * scale,
    angle: 0, kind: 2, seed: random(), glyph: 0, root,
  }));
  return marks;
}

export class GroundSignals {
  constructor(scene) {
    const quad = new THREE.PlaneGeometry(1, 1);
    this.geometry = new THREE.InstancedBufferGeometry();
    this.geometry.setIndex(quad.index.clone());
    this.geometry.setAttribute('position', quad.attributes.position.clone());
    this.geometry.setAttribute('uv', quad.attributes.uv.clone());
    quad.dispose();
    this.geometry.setAttribute('origin', new THREE.InstancedBufferAttribute(new Float32Array(MAX_MARKS * 3), 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('shape', new THREE.InstancedBufferAttribute(new Float32Array(MAX_MARKS * 4), 4).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('signal', new THREE.InstancedBufferAttribute(new Float32Array(MAX_MARKS * 4), 4).setUsage(THREE.DynamicDrawUsage));
    this.geometry.instanceCount = 0;
    this.material = new THREE.ShaderMaterial({
      transparent: true, depthTest: true, depthWrite: false, blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide, forceSinglePass: true,
      uniforms: {
        atlas: { value: groundGlyphAtlas() }, time: { value: 0 }, motion: { value: 1 },
        distortion: { value: 0.55 }, fogNear: { value: gardenAtmosphere.near }, fogFar: { value: gardenAtmosphere.far },
        pulseRoot: { value: -1 }, pulseTime: { value: 0 }, pulseStrength: { value: 0 },
      },
      vertexShader: `
        attribute vec3 origin; attribute vec4 shape; attribute vec4 signal;
        uniform float time; uniform float motion; uniform float distortion;
        varying vec2 vUv; varying float vKind; varying float vSeed;
        varying float vGlyph; varying float vRoot; varying float vDepth;
        float hash(float n){return fract(sin(n*127.1)*43758.5453);}
        void main(){
          vUv=uv; vKind=shape.w; vSeed=signal.x; vGlyph=signal.z; vRoot=signal.w;
          vec2 p=position.xy*shape.xy;
          float tick=floor(time*7.+signal.y*19.);
          float skip=step(.96,hash(tick+signal.x*91.))*motion*distortion;
          if(shape.w<1.5) p.x+=skip*(hash(tick+signal.y)-.5)*.24;
          float c=cos(shape.z),s=sin(shape.z);
          vec3 point=origin+vec3(p.x*c-p.y*s,0.,-p.x*s-p.y*c);
          vec4 mvPosition=modelViewMatrix*vec4(point,1.);
          vDepth=-mvPosition.z;
          gl_Position=projectionMatrix*mvPosition;
        }`,
      fragmentShader: `
        uniform sampler2D atlas; uniform float time; uniform float motion; uniform float distortion;
        uniform float fogNear; uniform float fogFar;
        uniform float pulseRoot; uniform float pulseTime; uniform float pulseStrength;
        varying vec2 vUv; varying float vKind; varying float vSeed;
        varying float vGlyph; varying float vRoot; varying float vDepth;
        float hash(float n){return fract(sin(n*127.1)*43758.5453);}
        float ink(vec2 uv,float glyph){
          if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.)return 0.;
          return texture2D(atlas,vec2((glyph+uv.x)/8.,uv.y)).a;
        }
        void main(){
          float tick=floor(time*9.+vSeed*23.);
          float glitch=step(.93,hash(tick+vSeed*67.))*motion*distortion;
          float age=time-pulseTime;
          float selected=(1.-step(.1,abs(vRoot-pulseRoot)))*step(-.5,pulseRoot);
          float pulse=selected*step(0.,age)*exp(-max(0.,age)*1.1)*pulseStrength*motion;
          float mask=0.,opacity=0.;
          if(vKind<.5){
            float dash=step(.18,fract(vUv.x*(3.+floor(vSeed*5.))));
            mask=(1.-smoothstep(.22,.5,abs(vUv.y-.5)))*dash;
            opacity=.13+distortion*.15+pulse*.24;
          }else if(vKind<1.5){
            vec2 uv=vUv;
            uv.x+=step(.55,uv.y)*step(uv.y,.76)*glitch*.18;
            float glyph=mod(vGlyph+floor(hash(tick+vSeed)*8.)*step(.2,glitch),8.);
            mask=ink(uv,glyph);
            float echo=ink(uv+vec2(.13,0.),glyph)*glitch*.6;
            mask=max(mask,echo);
            opacity=.28+distortion*.18+pulse*.28;
          }else{
            vec2 p=vUv*2.-1.; float r=length(p);
            float angle=atan(p.y,p.x);
            float broken=step(.32,fract(angle*2.7+vSeed*7.));
            float radius=.43+.025*sin(time*.65+vSeed*12.)*motion;
            float line=1.-smoothstep(.012,.032,abs(r-radius));
            float wave=1.-smoothstep(.016,.04,abs(r-(.16+max(0.,age)*.24)));
            mask=(line*.12+wave*pulse*.85)*broken;
            opacity=.55;
          }
          float flicker=1.-glitch*.58;
          float haze=1.-smoothstep(fogNear,fogFar,vDepth);
          float alpha=mask*opacity*flicker*haze;
          if(alpha<.004)discard;
          vec3 color=mix(vec3(.65,1.1,.28),vec3(.56,.20,1.05),step(.7,vSeed));
          color=mix(color,vec3(.95,.24,.8),glitch*.45);
          gl_FragColor=vec4(color,alpha);
        }`,
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    // Bounds live in per-instance origins, rather than the shared unit quad.
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1.5;
    scene.add(this.mesh);
  }

  replant(planting, seed) {
    const marks = groundMarks(planting, seed);
    const { origin, shape, signal } = this.geometry.attributes;
    marks.forEach((mark, i) => {
      origin.setXYZ(i, mark.x, -0.12, mark.z);
      shape.setXYZW(i, mark.width, mark.height, mark.angle, mark.kind);
      signal.setXYZW(i, mark.seed, mark.seed * 3.7, mark.glyph, mark.root);
    });
    origin.needsUpdate = shape.needsUpdate = signal.needsUpdate = true;
    this.geometry.instanceCount = marks.length;
    this.mesh.visible = marks.length > 0;
    this.clear();
  }

  pulse(root, time, strength) {
    const uniforms = this.material.uniforms;
    uniforms.pulseRoot.value = root;
    uniforms.pulseTime.value = time;
    uniforms.pulseStrength.value = THREE.MathUtils.clamp(strength, 0, 1);
  }

  clear() {
    this.material.uniforms.pulseRoot.value = -1;
    this.material.uniforms.pulseStrength.value = 0;
  }

  update(time, distortion, paused) {
    const uniforms = this.material.uniforms;
    if (!paused) uniforms.time.value = time;
    uniforms.motion.value = paused ? 0 : 1;
    uniforms.distortion.value = distortion;
    if (paused) this.clear();
  }

  dispose() {
    this.mesh.removeFromParent();
    this.geometry.dispose();
    this.material.uniforms.atlas.value.dispose();
    this.material.dispose();
  }
}
