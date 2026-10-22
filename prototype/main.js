import './site.js?v=seasonal-study-1';
import * as THREE from './vendor/three.module.min.js';
import { AsciiPollen } from './pollen.js?v=snowdrop-study-1';
import { createLily, createPoppy, makeFlowerAssets, seededRandom, updateFlowerMotion } from './flowers.js?v=snowdrop-study-1';
import { createSnowdrop, makeSnowdropAssets } from './snowdrops.js?v=snowdrop-study-1';
import { GardenAudio, flowerNote } from './audio.js?v=snowdrop-study-1';
import { bloomEnvelope, bloomProfile, flowerCharacter, gestureStrength, rippleEnvelope, stepSpring } from './expressions.js?v=snowdrop-study-1';
import { gardenSelection } from './studies.js?v=snowdrop-study-1';

const flowerFactories = { lily: createLily, poppy: createPoppy, snowdrop: createSnowdrop };

const $ = (selector) => document.querySelector(selector);
const garden = $('#garden');
const canvas = $('#scene');
const soundButton = $('#sound-toggle');
const soundLabel = $('#sound-label');
const status = $('#interaction-status');
const card = $('.specimen-card');
const cursor = $('#flower-cursor');
const motionButton = $('#motion-toggle');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const audio = new GardenAudio();
let paused = reducedMotion.matches;
let intensity = 0.55;
let notesPlayed = 0;
let app;

const studyPreferenceKey = 'evelyn-garden-study';
function savedStudyMode() {
  try { return sessionStorage.getItem(studyPreferenceKey) || 'calendar'; }
  catch { return 'calendar'; }
}

for (const [i, bar] of [...document.querySelectorAll('.signal i')].entries()) {
  bar.style.setProperty('--bar-height', `${3 + Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.4)) * 20}px`);
}

function syncMotion() {
  motionButton.setAttribute('aria-pressed', String(paused));
  motionButton.textContent = paused ? 'Resume motion' : 'Pause motion';
  document.body.dataset.motion = paused ? 'paused' : 'running';
}
syncMotion();

async function toggleSound() {
  soundButton.disabled = true;
  try {
    if (audio.enabled) {
      audio.mute();
      status.textContent = 'Sound resting. Garden awake.';
    } else {
      soundLabel.textContent = 'Tuning…';
      await audio.enable();
      status.textContent = 'Wander over a flower';
      if (app && document.body.dataset.page === 'garden') app.playFlower(app.selectedId, 0.35);
      audio.setVisibility(document.body.dataset.page === 'garden');
    }
  } catch (error) {
    console.error(error);
    status.textContent = 'Sound unavailable. Try again.';
    audio.mute();
  } finally {
    soundButton.setAttribute('aria-pressed', String(audio.enabled));
    soundLabel.textContent = audio.enabled ? 'Sound on' : 'Enable sound';
    soundButton.disabled = false;
  }
}
soundButton.addEventListener('click', toggleSound);

$('#distortion').addEventListener('input', (event) => {
  intensity = Number(event.target.value) / 100;
  $('#distortion-value').value = `${event.target.value}%`;
});
motionButton.addEventListener('click', () => {
  paused = !paused;
  app?.clearResponses();
  syncMotion();
});
reducedMotion.addEventListener('change', (event) => {
  paused = event.matches;
  app?.clearResponses();
  syncMotion();
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) app?.refreshCalendar();
  audio.setVisibility(!document.hidden && document.body.dataset.page === 'garden');
  if (document.hidden) app?.clearResponses();
});

function environmentTexture(renderer) {
  // A studio lighting rig painted into an environment, with high-contrast strips
  // to make the silver read as metal rather than uniformly colored plastic.
  const surface = document.createElement('canvas');
  surface.width = 1024;
  surface.height = 512;
  const ctx = surface.getContext('2d');
  const base = ctx.createLinearGradient(0, 0, 0, 512);
  base.addColorStop(0, '#a39ba8');
  base.addColorStop(0.25, '#33253c');
  base.addColorStop(0.48, '#09080d');
  base.addColorStop(0.53, '#ab96ba');
  base.addColorStop(0.58, '#0c0b13');
  base.addColorStop(1, '#161322');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 1024, 512);
  const strip = (x, width, color, y = 30, height = 360) => {
    const gradient = ctx.createLinearGradient(x, 0, x + width, 0);
    gradient.addColorStop(0, '#000000');
    gradient.addColorStop(0.18, color);
    gradient.addColorStop(0.78, color);
    gradient.addColorStop(1, '#000000');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);
  };
  strip(40, 150, '#e7e6ea', 10, 300);
  strip(220, 85, '#eafecc', 10, 440);
  strip(370, 180, '#ff81df', 130, 200);
  strip(580, 36, '#ffffff', 0, 430);
  strip(690, 190, '#b8a1ff', 10, 290);
  strip(930, 50, '#ddff9d', 100, 320);
  const map = new THREE.CanvasTexture(surface);
  map.mapping = THREE.EquirectangularReflectionMapping;
  map.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromEquirectangular(map);
  map.dispose();
  pmrem.dispose();
  return target;
}

function setupBackground(scene) {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: `varying vec3 vPosition;
      void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec3 vPosition;
      void main(){
        vec3 d=normalize(vPosition);
        float horizon=pow(max(0.,1.-abs(d.y+.025)*2.5),7.);
        vec3 color=mix(vec3(.019,.012,.029),vec3(.12,.027,.18),horizon);
        float pink=exp(-pow((d.x-.38)*2.6,2.)-pow((d.y-.05)*5.,2.));
        float green=exp(-pow((d.x+.6)*4.,2.)-pow((d.y+.03)*8.,2.));
        color+=vec3(.15,.008,.10)*pink+vec3(.018,.055,.026)*green;
        gl_FragColor=vec4(color,1.);
      }`,
  });
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(65, 32, 16), material);
  scene.add(sphere);
  const floorMaterial = new THREE.MeshStandardMaterial({ color: '#19121f', roughness: 0.4, metalness: 0.72, envMapIntensity: 0.48, transparent: true, depthWrite: false });
  // Fade the far edge into the atmosphere rather than exposing a hard horizon.
  floorMaterial.onBeforeCompile = (shader) => {
    shader.vertexShader = 'varying float vGroundDistance;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvGroundDistance=length((modelMatrix*vec4(transformed,1.)).xz);');
    shader.fragmentShader = 'varying float vGroundDistance;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\ngl_FragColor.a*=1.-smoothstep(10.,48.,vGroundDistance);');
  };
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(150, 150),
    floorMaterial,
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.15;
  scene.add(floor);

  const dustRandom = seededRandom(508);
  const positions = new Float32Array(190 * 3);
  for (let i = 0; i < 190; i++) {
    positions[i * 3] = (dustRandom() - 0.5) * 25;
    positions[i * 3 + 1] = dustRandom() * 8;
    positions[i * 3 + 2] = (dustRandom() - 0.6) * 20;
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: '#c8a9de', size: 0.016, transparent: true, opacity: 0.38, sizeAttenuation: true }));
  scene.add(dust);
}

class Garden {
  constructor() {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor('#09070d');
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2('#130b1d', 0.042);
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 150);
    this.environment = environmentTexture(this.renderer);
    this.scene.environment = this.environment.texture;
    setupBackground(this.scene);
    this.scene.add(new THREE.HemisphereLight('#e4cee7', '#2d243b', 1.2));
    const white = new THREE.DirectionalLight('#f0eaf4', 2.7);
    white.position.set(-3, 9, 5);
    this.scene.add(white);
    const pink = new THREE.DirectionalLight('#f061c9', 2.4);
    pink.position.set(5, 4, -5);
    this.scene.add(pink);
    const lime = new THREE.DirectionalLight('#cbff94', 2.2);
    lime.position.set(-6, 3, 1);
    this.scene.add(lime);
    this.keyLight = pink;
    this.fillLight = lime;
    this.selection = gardenSelection(savedStudyMode());
    this.study = this.selection.study;
    this.keyLight.color.set(this.selection.keyLight);
    this.fillLight.color.set(this.selection.fillLight);
    this.nextCalendarCheck = 0;

    this.assets = makeFlowerAssets();
    this.assets.snowdrop = makeSnowdropAssets(this.assets);
    this.pollen = new AsciiPollen(this.scene);
    this.flowers = [];
    this.selectedId = 0;
    this.hoveredId = -1;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2(3, 3);
    this.pointerInside = false;
    this.gestureStrength = 0.35;
    this.lastPointerSample = null;
    this.ripples = [];
    this.visualGesture = null;
    this.contentOpen = document.body.dataset.page !== 'garden';
    this.contentNeedsRender = true;
    this.needsPicking = false;
    this.elapsed = 0;
    this.lastTime = 0;
    this.burst = 0;
    this.projected = new THREE.Vector3();
    this.targetCamera = new THREE.Vector3();
    this.seed = 821;
    this.buildPost();
    this.replant();
    this.resize();
    this.bind();
    this.render = this.render.bind(this);
    requestAnimationFrame(this.render);
    document.body.dataset.gardenState = 'ready';
    document.body.dataset.gardenRevision = 'snowdrop-study';
    $('#loading').classList.add('loaded');
    $('#loading').setAttribute('aria-hidden', 'true');
  }

  buildPost() {
    this.renderTarget = new THREE.WebGLRenderTarget(1, 1, {
      depthBuffer: true, samples: 2,
      type: this.renderer.extensions.has('EXT_color_buffer_float') ? THREE.HalfFloatType : THREE.UnsignedByteType,
    });
    this.postScene = new THREE.Scene();
    this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.post = new THREE.ShaderMaterial({
      depthTest: false, depthWrite: false,
      uniforms: {
        image: { value: this.renderTarget.texture }, resolution: { value: new THREE.Vector2() },
        time: { value: 0 }, burst: { value: 0 }, distortion: { value: intensity },
        focus: { value: new THREE.Vector2(0.6, 0.6) }, motion: { value: paused ? 0 : 1 },
      },
      vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,
      fragmentShader: `
        uniform sampler2D image;uniform vec2 resolution;uniform float time;
        uniform float burst;uniform float distortion;uniform vec2 focus;uniform float motion;varying vec2 vUv;
        float hash(float n){return fract(sin(n*127.1)*43758.5453);}
        void main(){
          vec2 uv=vUv;
          float region=exp(-length((uv-focus)*vec2(resolution.x/resolution.y,1.))*4.);
          float energy=burst*distortion*motion;
          float band=floor(uv.y*85.);
          float tick=floor(time*18.);
          float tear=step(.91,hash(band+tick*29.));
          uv.x+=tear*(hash(band+tick)-.5)*.13*energy*region;
          float split=(.00045+energy*region*.018)*distortion;
          vec3 col;
          col.r=texture2D(image,uv+vec2(split,0.)).r;
          col.g=texture2D(image,uv).g;
          col.b=texture2D(image,uv-vec2(split,0.)).b;
          vec3 glow=vec3(0.);
          vec2 pixel=1./resolution;
          for(int i=0;i<8;i++){
            float a=float(i)*.785398;
            vec2 offset=vec2(cos(a),sin(a))*pixel*5.;
            vec3 sampleColor=texture2D(image,uv+offset).rgb;
            vec3 hot=max(sampleColor-1.35,0.);
            glow+=hot/(1.+hot);
          }
          col+=glow*.06;
          float scan=sin(vUv.y*resolution.y*1.4)*.007*distortion;
          col-=scan;
          col+=vec3(.13,.01,.1)*tear*energy*region*.15;
          gl_FragColor=vec4(col,1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.post));
  }

  replant() {
    for (const flower of this.flowers) {
      this.scene.remove(flower.root);
      flower.anthers.dispose();
      flower.privateGeometries.forEach((geometry) => geometry.dispose());
    }
    const random = seededRandom(this.seed);
    this.flowers = [];
    const placements = [
      [1.65, 1.1, 1.18], [-2.2, -0.5, 0.90], [4.6, -1.4, 0.91],
      [-4.9, -3.4, 0.79], [0.3, -3.2, 0.81], [2.8, -5.6, 0.78],
      [-2.8, -6.8, 0.73], [6.7, -6.4, 0.85], [-7.0, -7.7, 0.83],
      [5.9, 3.7, 1.21], [-5.2, 3.0, 1.05], [8.9, -2.0, 1.0],
      [-0.7, -10.4, 0.79], [4.0, -11.5, 0.92], [-5.7, -12.1, 0.78],
      [8.4, -12.0, 1.0], [-9.2, -2.2, 0.94], [0.6, -16, 0.84],
    ];
    placements.forEach(([x, z, scale], id) => {
      const flower = flowerFactories[this.study.id](id, this.assets, random);
      flower.root.position.set(x + (random() - 0.5) * (id ? 1.1 : 0.2), 0, z + (random() - 0.5) * 0.6);
      flower.root.scale.setScalar(scale * (0.94 + random() * 0.12));
      flower.root.rotation.y = (random() - 0.5) * 0.5;
      this.scene.add(flower.root);
      this.flowers.push(flower);
    });
    this.hitTargets = this.flowers.map((flower) => flower.hit);
    if (!this.grass) this.createGrass();
    this.selectedId = 0;
    this.hoveredId = -1;
    this.needsPicking = true;
    this.clearResponses();
    cursor.classList.remove('visible');
    $('#specimen-id').textContent = '001';
    $('#note-name').textContent = this.study.noteLabel;
    this.syncStudyLabels();
    document.body.dataset.seed = String(this.seed);
  }

  syncStudyLabels() {
    document.body.dataset.study = this.study.id;
    document.body.dataset.studyMode = this.selection.mode;
    document.body.dataset.gardenMonth = this.selection.month;
    document.body.dataset.studyLabel = `${this.study.index} — ${this.study.name.toUpperCase()}`;
    $('#flower-genus').textContent = this.study.genus;
    $('#garden-study-index').textContent = this.study.index.padStart(3, '0');
    $('#garden-month').textContent = this.selection.month.toUpperCase();
    $('#study-caption').textContent = this.selection.caption;
    garden.setAttribute('aria-label', `Interactive chrome ${this.study.name.toLowerCase()} garden`);
    for (const button of document.querySelectorAll('button[data-study-mode]')) {
      button.setAttribute('aria-pressed', String(button.dataset.studyMode === this.selection.mode));
    }
    if (!this.contentOpen) $('.footer-index').textContent = document.body.dataset.studyLabel;
    $('.pointer-instruction').textContent = `Wander over the ${this.study.name.toLowerCase()}.`;
    $('.touch-instruction').textContent = `Tap the ${this.study.name.toLowerCase()}.`;
    $('.touch-instruction:last-child').textContent = 'Each flower has its own voice.';
  }

  changeStudy(mode, remember = true) {
    const selection = gardenSelection(mode);
    if (selection.mode === this.selection.mode && selection.monthKey === this.selection.monthKey) return;
    this.selection = selection;
    if (remember) {
      try { sessionStorage.setItem(studyPreferenceKey, selection.mode); } catch { /* Storage can be disabled. */ }
    }
    this.keyLight.color.set(selection.keyLight);
    this.fillLight.color.set(selection.fillLight);
    this.contentNeedsRender = true;
    if (selection.study !== this.study) {
      audio.changeStudy();
      this.study = selection.study;
      this.pointerInside = false;
      this.gestureStrength = 0.35;
      this.replant();
    } else this.syncStudyLabels();
    status.textContent = selection.automatic ? `${selection.month} garden. Following the season.` : `${this.study.name} selected. ${audio.enabled ? 'Wander to listen.' : 'Enable sound to listen.'}`;
  }

  refreshCalendar() { this.changeStudy(this.selection.mode, false); }

  createGrass() {
    const random = seededRandom(186);
    this.grass = new THREE.InstancedMesh(this.assets.leaf, this.assets.green, 220);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 220; i++) {
      dummy.position.set((random() - 0.5) * 30, -0.1, (random() - 0.7) * 29);
      dummy.rotation.set(0, random() * Math.PI * 2, 0.65 + random() * 0.6);
      const scale = 0.13 + random() * 0.45;
      dummy.scale.set(scale, scale, scale * 0.65);
      dummy.updateMatrix();
      this.grass.setMatrixAt(i, dummy.matrix);
    }
    this.scene.add(this.grass);
  }

  resize() {
    this.contentNeedsRender = true;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.mobile = this.width < 601;
    this.pixelRatio = Math.min(devicePixelRatio, this.mobile ? 1.35 : 1.65);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(this.width, this.height, false);
    this.renderTarget.setSize(Math.round(this.width * this.pixelRatio), Math.round(this.height * this.pixelRatio));
    this.post.uniforms.resolution.value.set(this.width * this.pixelRatio, this.height * this.pixelRatio);
    this.camera.aspect = this.width / this.height;
    this.camera.fov = this.mobile ? 49 : 40;
    this.camera.updateProjectionMatrix();
    this.pollen.resize(this.height, this.camera.fov, this.pixelRatio);
    this.baseCamera = this.mobile ? new THREE.Vector3(1.0, 6.8, 13.6) : new THREE.Vector3(0, 5.65, 13.9);
    this.lookAt = this.mobile ? new THREE.Vector3(1, 2.0, 0) : new THREE.Vector3(0, 2.5, 0);
    this.camera.position.copy(this.baseCamera);
    this.camera.lookAt(this.lookAt);
    this.needsPicking = true;
  }

  bind() {
    window.addEventListener('garden:pagechange', (event) => {
      this.contentOpen = event.detail.page !== 'garden';
      this.refreshCalendar();
      this.contentNeedsRender = true;
      this.pointerInside = false;
      this.hoveredId = -1;
      this.clearResponses();
      cursor.classList.remove('visible');
      garden.style.cursor = 'default';
      audio.setVisibility(!this.contentOpen && !document.hidden);
    });
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('focus', () => this.refreshCalendar());
    garden.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch') return;
      const time = performance.now();
      if (this.lastPointerSample) {
        const distance = Math.hypot(event.clientX - this.lastPointerSample.x, event.clientY - this.lastPointerSample.y);
        const strength = gestureStrength(distance, Math.min(64, time - this.lastPointerSample.time), Math.min(this.width, this.height));
        this.gestureStrength = this.gestureStrength * 0.55 + strength * 0.45;
      }
      this.lastPointerSample = { x: event.clientX, y: event.clientY, time };
      this.pointer.set((event.clientX / this.width) * 2 - 1, -(event.clientY / this.height) * 2 + 1);
      this.pointerInside = true;
      this.needsPicking = true;
      cursor.style.transform = `translate(${event.clientX}px,${event.clientY}px)`;
    });
    garden.addEventListener('pointerleave', () => {
      this.pointerInside = false;
      this.hoveredId = -1;
      this.lastPointerSample = null;
      this.gestureStrength = 0.35;
      cursor.classList.remove('visible');
    });
    garden.addEventListener('pointerdown', (event) => {
      this.gestureStrength = event.pointerType === 'touch' ? 0.5 + Math.min(1, event.pressure || 0) * 0.15 : Math.max(0.45, this.gestureStrength);
      this.pointer.set((event.clientX / this.width) * 2 - 1, -(event.clientY / this.height) * 2 + 1);
      this.pointerInside = true;
      this.pick(true);
      if (event.pointerType === 'touch') {
        this.pointerInside = false;
        this.hoveredId = -1;
        cursor.classList.remove('visible');
      }
    });
    garden.addEventListener('keydown', (event) => {
      if (event.target !== garden) return;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault();
        const direction = ['ArrowLeft', 'ArrowDown'].includes(event.key) ? -1 : 1;
        this.selectedId = (this.selectedId + direction + this.flowers.length) % this.flowers.length;
        this.playFlower(this.selectedId, 0.45);
      } else if (event.code === 'Space' || event.key === 'Enter') {
        event.preventDefault();
        if (event.repeat) return;
        this.playFlower(this.selectedId, 0.45);
      }
    });
    $('#reseed').addEventListener('click', () => {
      this.seed += 127;
      this.replant();
      status.textContent = 'A new arrangement, same roots';
    });
    for (const button of document.querySelectorAll('button[data-study-mode]')) {
      button.addEventListener('click', () => this.changeStudy(button.dataset.studyMode));
    }
    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      audio.mute();
      soundButton.setAttribute('aria-pressed', 'false');
      soundLabel.textContent = 'Enable sound';
      $('#fallback').hidden = false;
      document.body.dataset.gardenState = 'context-lost';
    });
    canvas.addEventListener('webglcontextrestored', () => window.location.reload());
  }

  pick(force = false) {
    this.scene.updateMatrixWorld();
    this.camera.updateMatrixWorld();
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.hitTargets, false);
    const id = hits.length ? hits[0].object.userData.flowerId : -1;
    if (id >= 0 && (id !== this.hoveredId || force)) this.playFlower(id, this.gestureStrength);
    this.hoveredId = id;
    cursor.classList.toggle('visible', id >= 0 && !this.mobile);
    garden.style.cursor = id >= 0 && !this.mobile ? 'none' : 'default';
    if (id >= 0) $('#cursor-label').textContent = `${this.study.genus.toUpperCase()} / ${String(id + 1).padStart(3, '0')}`;
  }

  clearResponses() {
    this.pollen.clear();
    document.body.dataset.pollenCount = '0';
    this.ripples.length = 0;
    this.visualGesture = null;
    this.burst = 0;
    this.lastPointerSample = null;
    if (this.baseCamera) {
      this.camera.position.copy(this.baseCamera);
      this.camera.lookAt(this.lookAt);
    }
    for (const flower of this.flowers) {
      flower.gesture = null;
      flower.response.value = 0;
      flower.response.velocity = 0;
    }
    card.classList.remove('playing');
  }

  playFlower(id, strength = 0.45) {
    const flower = this.flowers[id];
    if (!flower) return;
    this.selectedId = id;
    flower.head.getWorldPosition(this.projected);
    this.projected.project(this.camera);
    const pan = this.projected.x * 0.5 + 0.5;
    const note = audio.play(id, pan, strength, this.study.id);
    const now = performance.now() / 1000;
    // Visual pollen is available with sound off and when all audio voices are busy.
    if (!paused && now - (flower.lastPollen || -Infinity) > 0.18) {
      flower.lastPollen = now;
      this.pollen.burst(flower, this.elapsed, strength);
    }
    if (note || (!audio.enabled && now - flower.lastGesture > 0.25)) {
      flower.lastGesture = now;
      const gesture = note || { ...bloomProfile(id, strength, this.study.id), startedAt: now };
      if (!paused) {
        flower.gesture = gesture;
        this.visualGesture = gesture;
        this.ripples.push({ ...gesture, id, x: flower.root.position.x, z: flower.root.position.z });
        this.ripples = this.ripples.slice(-6);
      }
      this.post.uniforms.focus.value.set(pan, this.projected.y * 0.5 + 0.5);
    }
    $('#specimen-id').textContent = String(id + 1).padStart(3, '0');
    $('#note-name').textContent = `${flowerNote(id, this.study.id).name} / ${flowerCharacter(id, this.study.id).name.toUpperCase()}`;
    const bloomStatus = this.study.id === 'lily' ? strength > 0.65 ? 'A bright, ringing bloom' : 'A gentle, synthetic bloom' : this.study.sound;
    status.textContent = note ? bloomStatus : audio.enabled ? 'Listening to the last bloom' : 'Enable sound to hear this bloom';
    document.body.dataset.selectedFlower = String(id);
    if (note) {
      notesPlayed++;
      $('#note-count').textContent = String(notesPlayed).padStart(2, '0');
    }
  }

  render(timestamp) {
    requestAnimationFrame(this.render);
    if (timestamp >= this.nextCalendarCheck && !document.hidden) {
      this.refreshCalendar();
      this.nextCalendarCheck = timestamp + 60000;
    }
    if (document.hidden) { this.lastTime = timestamp; return; }
    if (this.contentOpen && !this.contentNeedsRender) { this.lastTime = timestamp; return; }
    this.contentNeedsRender = false;
    const delta = Math.min((timestamp - (this.lastTime || timestamp)) / 1000, 0.05);
    this.lastTime = timestamp;
    if (!paused) this.elapsed += delta;
    const now = timestamp / 1000;
    this.ripples = this.ripples.filter((ripple) => now - ripple.startedAt < ripple.gate + ripple.release + 9 / 4.4);
    this.burst = this.visualGesture ? bloomEnvelope(now - this.visualGesture.startedAt, this.visualGesture) * this.visualGesture.energy : 0;
    const parallaxX = this.pointerInside && !paused ? this.pointer.x * 0.16 : 0;
    const parallaxY = this.pointerInside && !paused ? this.pointer.y * 0.06 : 0;
    this.targetCamera.copy(this.baseCamera).add(new THREE.Vector3(parallaxX, parallaxY, 0));
    this.camera.position.lerp(this.targetCamera, 1 - Math.exp(-delta * 3));
    this.camera.lookAt(this.lookAt);
    for (const flower of this.flowers) {
      const envelope = flower.gesture ? bloomEnvelope(now - flower.gesture.startedAt, flower.gesture) * flower.gesture.energy : 0;
      let wave = 0, waveX = 0, waveZ = 0;
      for (const ripple of this.ripples) {
        if (ripple.id === flower.id) continue;
        const dx = flower.root.position.x - ripple.x;
        const dz = flower.root.position.z - ripple.z;
        const distance = Math.hypot(dx, dz);
        const amount = rippleEnvelope(now - ripple.startedAt, distance, ripple);
        wave += amount;
        waveX += amount * dx / (distance || 1) * 0.2;
        waveZ += amount * dz / (distance || 1) * 0.2;
      }
      const response = paused ? 0 : stepSpring(flower.response, envelope + Math.min(0.4, wave), delta);
      const phase = this.elapsed * 0.57 + flower.root.position.x * 0.17 + flower.root.position.z * 0.13;
      const breezeX = paused ? 0 : Math.sin(phase) * 0.1 + Math.sin(phase * 0.47 + flower.phase) * 0.035 + waveX;
      const breezeZ = paused ? 0 : Math.cos(phase * 0.72 + flower.phase * 0.35) * 0.05 + waveZ;
      const yaw = flower.root.rotation.y;
      const swayX = breezeX * Math.cos(yaw) - breezeZ * Math.sin(yaw) + response * Math.sin(flower.phase) * 0.1;
      const swayZ = breezeX * Math.sin(yaw) + breezeZ * Math.cos(yaw) + response * Math.cos(flower.phase) * 0.045;
      updateFlowerMotion(flower, this.elapsed, swayX, swayZ, response * intensity, paused);
      if (flower.id === this.selectedId) {
        card.classList.toggle('playing', !paused && envelope > 0.006);
        card.style.setProperty('--signal-strength', String(Math.max(0.12, Math.min(1, envelope))));
      }
    }
    // Raycast only after pointer movement. Animated flowers passing a still cursor
    // should not repeatedly retrigger music.
    if (this.pointerInside && this.needsPicking) { this.pick(); this.needsPicking = false; }
    const pollenFlower = !paused && !this.contentOpen && this.pointerInside && this.hoveredId >= 0 ? this.flowers[this.hoveredId] : null;
    const pollenCount = this.pollen.update(this.elapsed, paused ? 0 : delta, pollenFlower, this.gestureStrength, intensity, this.study.pollenMode);
    if (document.body.dataset.pollenCount !== String(pollenCount)) document.body.dataset.pollenCount = String(pollenCount);
    this.post.uniforms.time.value = this.elapsed;
    this.post.uniforms.burst.value = this.burst;
    this.post.uniforms.distortion.value = intensity;
    this.post.uniforms.motion.value = paused ? 0 : 1;
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.postScene, this.postCamera);
  }
}

try {
  app = new Garden();
} catch (error) {
  console.error('Garden initialization failed:', error);
  $('#loading').hidden = true;
  $('#fallback').hidden = false;
  $('.intro').hidden = true;
  $('.specimen-card').hidden = true;
  $('.season-preview').hidden = true;
  soundButton.disabled = true;
  document.body.dataset.gardenState = 'unavailable';
}
