import * as THREE from './vendor/three.module.min.js';

const GLYPHS = Array.from('*+.:;01<>/\\{}[]^~|#%=-xv?&$!_bc@');

// Fixed storage: even rapid visits to every flower cannot grow the effect.
export class PollenPool {
  constructor(capacity = 384, random = Math.random) {
    this.capacity = capacity;
    this.random = random;
    this.positions = new Float32Array(capacity * 3);
    this.particles = new Float32Array(capacity * 4);
    this.glyphs = new Float32Array(capacity);
    this.cursor = 0;
    this.carry = 0;
    this.source = -1;
    this.dirty = false;
    this.clear();
  }

  clear() {
    for (let i = 0; i < this.capacity; i++) this.particles[i * 4] = -10000;
    this.carry = 0;
    this.source = -1;
    this.dirty = true;
  }

  emit(origin, time, count, strength = 0.5) {
    for (let i = 0; i < Math.min(this.capacity, count); i++) {
      const slot = this.cursor++ % this.capacity;
      const angle = this.random() * Math.PI * 2;
      const radius = Math.sqrt(this.random()) * 0.23;
      this.positions.set([origin.x + Math.cos(angle) * radius, origin.y + (this.random() - 0.5) * 0.16, origin.z + Math.sin(angle) * radius], slot * 3);
      this.particles.set([time, 2.6 + this.random() * 1.6, this.random(), Math.max(0, Math.min(1, strength))], slot * 4);
      this.glyphs[slot] = Math.floor(this.random() * GLYPHS.length);
    }
    this.dirty = true;
  }

  stream(origin, time, delta, source, strength) {
    if (source !== this.source) this.carry = 0;
    this.source = source;
    if (source < 0) return;
    this.carry += Math.min(0.05, Math.max(0, delta)) * (19 + strength * 15);
    const count = Math.floor(this.carry);
    this.carry -= count;
    if (count) this.emit(origin, time, count, strength);
  }

  count(time) {
    let count = 0;
    for (let i = 0; i < this.capacity; i++) {
      const age = time - this.particles[i * 4];
      if (age >= 0 && age < this.particles[i * 4 + 1]) count++;
    }
    return count;
  }
}

function glyphAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  context.font = '42px monospace';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = '#ffffff';
  GLYPHS.forEach((glyph, i) => context.fillText(glyph, (i % 8) * 64 + 32, Math.floor(i / 8) * 64 + 33));
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

export class AsciiPollen {
  constructor(scene) {
    this.pool = new PollenPool();
    this.origin = new THREE.Vector3();
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.pool.positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('particle', new THREE.BufferAttribute(this.pool.particles, 4).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('glyph', new THREE.BufferAttribute(this.pool.glyphs, 1).setUsage(THREE.DynamicDrawUsage));
    this.material = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: true,
      uniforms: {
        atlas: { value: glyphAtlas() }, time: { value: 0 },
        scale: { value: 800 }, pixelRatio: { value: 1 }, distortion: { value: 0.55 },
      },
      vertexShader: `
        attribute vec4 particle;attribute float glyph;
        uniform float time;uniform float scale;uniform float pixelRatio;uniform float distortion;
        varying float vSeed;varying float vGlyph;varying float vFade;
        float hash(float n){return fract(sin(n*127.1)*43758.5453);}
        void main(){
          float age=max(0.,time-particle.x);float seed=particle.z;
          vSeed=seed;vGlyph=glyph;
          vFade=smoothstep(0.,.12,age)*(1.-smoothstep(particle.y*.55,particle.y,age));
          vec3 p=position;
          float angle=seed*62.83+age*(.8+seed*.7);
          float radius=(.04+age*.18)*(0.5+seed);
          p.x+=cos(angle)*radius+sin(age*.7+seed*20.)*age*.1;
          p.z+=sin(angle)*radius;
          p.y+=age*(.48+seed*.38+particle.w*.15);
          float tick=floor(time*12.+seed*30.);
          p.x+=(hash(tick+seed*97.)-.5)*step(.91,hash(tick+seed*43.))*distortion*.28;
          vec4 view=modelViewMatrix*vec4(p,1.);
          gl_Position=projectionMatrix*view;
          gl_PointSize=clamp((.19+seed*.08)*scale/max(1.,-view.z),8.*pixelRatio,27.*pixelRatio);
          if(age>=particle.y||time<particle.x){gl_Position=vec4(2.,2.,2.,1.);gl_PointSize=0.;}
        }`,
      fragmentShader: `
        uniform sampler2D atlas;uniform float time;uniform float distortion;
        varying float vSeed;varying float vGlyph;varying float vFade;
        float hash(float n){return fract(sin(n*127.1)*43758.5453);}
        float ink(vec2 uv,float glyph){
          if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.)return 0.;
          return texture2D(atlas,(vec2(mod(glyph,8.),3.-floor(glyph/8.))+uv)/vec2(8.,4.)).a;
        }
        void main(){
          vec2 uv=vec2(gl_PointCoord.x,1.-gl_PointCoord.y);
          float tick=floor(time*10.+vSeed*31.);
          float glitch=step(.83,hash(tick+vSeed*71.))*distortion;
          float glyph=mix(vGlyph,floor(hash(tick+vSeed*29.)*32.),step(.01,glitch)*step(.45,hash(tick+vSeed*9.)));
          uv.x+=step(.6,uv.y)*step(uv.y,.78)*glitch*.18;
          float core=ink(uv,glyph);
          float echo=ink(uv+vec2(.12+glitch*.13,0.),glyph)*glitch*.65;
          vec3 color=vSeed>.8?vec3(1.3,.18,.86):vSeed>.65?vec3(.91,1.,.87):vec3(.66,1.2,.28);
          float alpha=max(core,echo)*vFade*.88;
          alpha*=1.-step(.94,hash(tick+vSeed*53.))*distortion*.65;
          if(alpha<.015)discard;
          gl_FragColor=vec4(mix(color,vec3(1.4,.12,.7),echo/(core+echo+.001)),alpha);
        }`,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    // Origins move and trajectories are computed on the GPU, outside the static bounds.
    this.points.frustumCulled = false;
    this.points.renderOrder = 2;
    scene.add(this.points);
  }

  flowerOrigin(flower) {
    this.origin.set(0, 0.85, 0);
    return flower.head.localToWorld(this.origin);
  }

  burst(flower, time, strength) {
    this.pool.emit(this.flowerOrigin(flower), time, 15 + Math.floor(strength * 12), strength);
  }

  clear() { this.pool.clear(); }

  resize(height, fov, pixelRatio) {
    this.material.uniforms.scale.value = height * pixelRatio / (2 * Math.tan(fov * Math.PI / 360));
    this.material.uniforms.pixelRatio.value = pixelRatio;
  }

  update(time, delta, flower, strength, distortion) {
    this.pool.stream(flower ? this.flowerOrigin(flower) : null, time, delta, flower ? flower.id : -1, strength);
    this.material.uniforms.time.value = time;
    this.material.uniforms.distortion.value = distortion;
    if (this.pool.dirty) {
      for (const attribute of Object.values(this.geometry.attributes)) attribute.needsUpdate = true;
      this.pool.dirty = false;
    }
    const count = this.pool.count(time);
    this.points.visible = count > 0;
    return count;
  }
}
