import './site.js?v=garden-controls-1';
import * as THREE from './vendor/three.module.min.js';
import { AsciiPollen } from './pollen.js?v=seasonal-pollen-1';
import { createLily, createPoppy, createChrysanthemum, makeChrysanthemumAssets, makeFlowerAssets, seededRandom, updateFlowerMotion } from './flowers.js?v=lazy-assets-1';
import { createSnowdrop, makeSnowdropAssets } from './snowdrops.js?v=lazy-assets-1';
import { GardenAudio, flowerNote, loadSoundLibrary } from './audio.js?v=idle-sound-1';
import { bloomEnvelope, bloomProfile, flowerCharacter, gestureStrength, rippleEnvelope, stepSpring } from './expressions.js?v=four-seasons-1';
import { gardenSelection } from './studies.js?v=spring-summer-2';
import { SeasonalParticles } from './snowfall.js?v=lazy-assets-1';
import { gardenPlanting, placeFlower, flowerDetail, groundHeight, meadowGrass, gardenAtmosphere, createContactShadows, updateContactShadows } from './composition.js?v=rolling-meadow-1';
import { GroundSignals } from './ground-signals.js?v=season-traces-1';
import { currentLanguage, text } from './i18n.js?v=garden-controls-1';

const flowerFactories = { lily: createLily, poppy: createPoppy, snowdrop: createSnowdrop, chrysanthemum: createChrysanthemum };
// Enough for 1.65x on a laptop and above 1x on a 1440p window. Slow devices
// step the buffer down at run time instead of everyone starting soft.
const maxRenderPixels = 4_200_000;
const grassBlades = 2600;

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
const phoneLayout = matchMedia('(max-width: 600px)');
const audio = new GardenAudio();
let paused = reducedMotion.matches;
let notesPlayed = 0;
let app;
let soundTuning = false;
let renderStatus = () => { status.textContent = text('status.waiting'); };

const studyPreferenceKey = 'evelyn-garden-season';
function savedStudyMode() {
  try { return sessionStorage.getItem(studyPreferenceKey) || 'calendar'; }
  catch { return 'calendar'; }
}

for (const [i, bar] of [...document.querySelectorAll('.signal i')].entries()) {
  bar.style.setProperty('--bar-height', `${3 + Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.4)) * 20}px`);
}

function syncMotion() {
  motionButton.setAttribute('aria-pressed', String(paused));
  motionButton.textContent = text(paused ? 'garden.resume' : 'garden.pause');
  document.body.dataset.motion = paused ? 'paused' : 'running';
}
syncMotion();

function syncSoundLabel() {
  soundLabel.textContent = text(soundTuning ? 'sound.tuning' : audio.enabled ? 'sound.on' : 'sound.enable');
}
syncSoundLabel();

function setStatus(key, values, fallback) {
  renderStatus = () => { status.textContent = text(key, values?.(), fallback); };
  renderStatus();
}
renderStatus();

window.addEventListener('site:localechange', () => {
  syncMotion();
  syncSoundLabel();
  renderStatus();
  app?.syncStudyLabels();
});

async function toggleSound() {
  soundButton.disabled = true;
  try {
    if (audio.enabled) {
      audio.mute();
      setStatus('status.muted');
    } else {
      soundTuning = true;
      syncSoundLabel();
      await audio.enable(app?.study.id);
      setStatus('status.ready');
      if (app && document.body.dataset.page === 'garden') app.playFlower(app.selectedId, 0.35);
    }
  } catch (error) {
    console.error(error);
    setStatus('status.unavailable');
    audio.mute();
  } finally {
    soundButton.setAttribute('aria-pressed', String(audio.enabled));
    soundTuning = false;
    syncSoundLabel();
    soundButton.disabled = false;
  }
}
soundButton.addEventListener('click', toggleSound);

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

function environmentTexture(renderer, palette) {
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
  strip(548, 14, '#faf9ff', 45, 350);
  strip(862, 11, '#f8ffed', 130, 240);
  // Wash the rig with the season's sky and ground so reflections belong to
  // the scene, and so downward-facing chrome picks up bounce instead of black.
  ctx.globalCompositeOperation = 'screen';
  const wash = ctx.createLinearGradient(0, 0, 0, 512);
  wash.addColorStop(0, palette.night);
  wash.addColorStop(0.42, palette.horizon);
  wash.addColorStop(0.5, palette.horizon);
  wash.addColorStop(0.6, palette.fog);
  wash.addColorStop(1, palette.ground);
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, 1024, 512);
  const sun = ctx.createRadialGradient(640, 236, 0, 640, 236, 250);
  sun.addColorStop(0, palette.glow);
  sun.addColorStop(1, '#000000');
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, 1024, 512);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
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
  const sky = {
    night: { value: new THREE.Color() },
    horizonColor: { value: new THREE.Color() },
    glowColor: { value: new THREE.Color() },
    accentColor: { value: new THREE.Color() },
    stars: { value: 0 }, skyTime: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: sky,
    vertexShader: `varying vec3 vPosition;
      void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec3 vPosition;
      uniform vec3 night, horizonColor, glowColor, accentColor;
      uniform float stars, skyTime;
      void main(){
        vec3 d=normalize(vPosition);
        float horizon=pow(max(0.,1.-abs(d.y+.025)*2.5),7.);
        vec3 color=mix(night,horizonColor,horizon);
        vec2 glowOffset=vec2((d.x-.38)*2.6,(d.y-.05)*5.);
        vec2 accentOffset=vec2((d.x+.6)*4.,(d.y+.03)*8.);
        color+=glowColor*exp(-dot(glowOffset,glowOffset))+accentColor*exp(-dot(accentOffset,accentOffset));
        if(stars>0.){
          // Stars sit where the sky dome passes near the centre of a grid cell.
          vec3 grid=d*90.;
          vec3 cell=floor(grid);
          float seed=fract(sin(dot(cell,vec3(12.9898,78.233,37.719)))*43758.5453);
          float point=1.-smoothstep(.05,.22,length(fract(grid)-.5));
          float twinkle=.55+.45*sin(skyTime*1.7+seed*60.);
          color+=vec3(.85,.88,1.)*step(.86,seed)*point*twinkle*stars*smoothstep(.015,.06,d.y);
        }

        gl_FragColor=vec4(color,1.);
      }`,
  });
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(65, 32, 16), material);
  // Drawn after the other opaque meshes, so pixels the flowers cover are
  // rejected by the depth test before the sky shader runs.
  sphere.renderOrder = 1;
  scene.add(sphere);
  const frost = { amount: { value: 0 }, time: { value: 0 }, dew: { value: 0 }, glintColor: { value: new THREE.Vector3(0.75, 0.9, 1.2) } };
  const floorMaterial = new THREE.MeshStandardMaterial({ color: '#19121f', roughness: 0.4, metalness: 0.72, envMapIntensity: 0.48, transparent: true, depthWrite: false });
  // Fade the far edge into the atmosphere rather than exposing a hard horizon.
  floorMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.frost = frost.amount;
    shader.uniforms.frostTime = frost.time;
    shader.uniforms.dew = frost.dew;
    shader.uniforms.glintColor = frost.glintColor;
    shader.vertexShader = 'varying float vGroundDistance;varying vec2 vGroundPlace;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvGroundPlace=(modelMatrix*vec4(transformed,1.)).xz;vGroundDistance=length(vGroundPlace);');
    shader.fragmentShader = 'varying float vGroundDistance;varying vec2 vGroundPlace;uniform float frost;uniform float frostTime;uniform float dew;uniform vec3 glintColor;\n' + shader.fragmentShader;
    // Winter dusts the ground with pale drifts and ice glints; spring keeps only
    // the glints, as dew.
    shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      if(frost>0.||dew>0.){
        vec2 q=vGroundPlace;
        float drift=sin(q.x*.33+sin(q.y*.21)*1.7)*sin(q.y*.29+1.3+sin(q.x*.17)*1.4);
        float snow=smoothstep(-.05,.7,drift);
        vec2 cell=floor(q*7.);
        float seed=fract(sin(dot(cell,vec2(12.9898,78.233)))*43758.5453);
        float glint=step(.985,seed)*(1.-smoothstep(.1,.42,length(fract(q*7.)-.5)));
        glint*=.35+.65*pow(.5+.5*sin(frostTime*2.4+seed*90.),3.);
        float near=1.-smoothstep(16.,34.,vGroundDistance);
        totalEmissiveRadiance+=vec3(.50,.58,.78)*snow*.22*frost+glintColor*glint*near*((.4+snow)*frost+dew);
      }`);
    // The key light sits behind the field; without this its mirror image
    // flares across the polished ground in front of the camera.
    shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\nreflectedLight.directSpecular*=.15;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\ngl_FragColor.a*=1.-smoothstep(10.,48.,vGroundDistance);');
  };
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(150, 150, 120, 120),
    floorMaterial,
  );
  // The plane lies in local x/y; after the rotation below, local -y is world z.
  const floorPosition = floor.geometry.attributes.position;
  for (let i = 0; i < floorPosition.count; i++) floorPosition.setZ(i, groundHeight(floorPosition.getX(i), -floorPosition.getY(i)));
  // Normals stay vertical on purpose: tilted ones mirror the bright horizon and
  // turn the slope grey, while flat shading keeps the season's ground color.
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.15;
  scene.add(floor);

  // Two soft ridges give the eye somewhere to land between meadow and sky.
  const ridge = (radius, low, high, seed) => {
    const geometry = new THREE.CylinderGeometry(radius, radius, 1, 180, 1, true, Math.PI - 1.25, 2.5);
    const position = geometry.attributes.position;
    const colors = new Float32Array(position.count * 4).fill(1);
    for (let i = 0; i < position.count; i++) {
      const crest = position.getY(i) > 0;
      const angle = Math.atan2(position.getX(i), position.getZ(i));
      const noise = 0.5 + 0.25 * Math.sin(angle * 7 + seed) + 0.15 * Math.sin(angle * 17 + seed * 2.3) + 0.1 * Math.sin(angle * 31 + seed * 0.7);
      // Only the crest is drawn; each ridge fades out below it like mist.
      position.setY(i, low + (high - low) * noise - (crest ? 0 : 2.4));
      colors[i * 4 + 3] = crest ? 0.6 : 0;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4));
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
      side: THREE.BackSide, fog: false, vertexColors: true, transparent: true, depthWrite: false,
    }));
    mesh.renderOrder = -1; // Behind the translucent floor and everything on it.
    scene.add(mesh);
    return mesh.material.color;
  };
  // Heights sit just around eye level, so the ridges only graze the horizon glow.
  const farRidge = ridge(58, 4.6, 6.7, 1.7);
  const nearRidge = ridge(46, 3.4, 5.3, 4.1);
  const horizonTint = new THREE.Color();
  const apply = (palette) => {
    sky.night.value.set(palette.night);
    sky.horizonColor.value.set(palette.horizon);
    sky.glowColor.value.set(palette.glow);
    sky.accentColor.value.set(palette.accent);
    // Distant flowers dissolve toward the sky behind them, not a darker haze.
    scene.fog.color.set(palette.fog).lerp(horizonTint.set(palette.horizon), 0.7);
    floorMaterial.color.set(palette.ground);
    nearRidge.set(palette.ground).lerp(horizonTint, 0.58);
    farRidge.set(palette.ground).lerp(horizonTint, 0.82);
  };
  apply.frost = frost;
  apply.sky = sky;
  return apply;
}

// Shafts of light: a handful of long additive quads at different depths, all
// leaning the same way, so flowers in front of each one cut into it.
function createLightBeams(scene) {
  const layout = [[-9, -18, 4.6], [-3, -12, 3], [4, -7, 3.8], [-7, -3, 2.6], [2, 1, 3.2], [9, -15, 5], [-13, -9, 3.5]];
  const quad = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setIndex(quad.index.clone());
  geometry.setAttribute('position', quad.attributes.position.clone());
  geometry.setAttribute('uv', quad.attributes.uv.clone());
  quad.dispose();
  const beam = new Float32Array(layout.length * 4);
  layout.forEach(([x, z, width], i) => beam.set([x, z, width, (i * 0.37) % 1], i * 4));
  geometry.setAttribute('beam', new THREE.InstancedBufferAttribute(beam, 4));
  geometry.instanceCount = layout.length;
  const uniforms = { beamColor: { value: new THREE.Color() }, strength: { value: 0 }, angle: { value: 0 }, time: { value: 0 } };
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms,
    vertexShader: `
      attribute vec4 beam;
      uniform float angle;
      varying vec2 vUv; varying float vSeed;
      void main(){
        vUv=uv; vSeed=beam.w;
        vec2 p=vec2(position.x*beam.z,position.y*28.);
        float c=cos(angle),s=sin(angle);
        vec3 point=vec3(beam.x+p.x*c-p.y*s,-.6+p.x*s+p.y*c,beam.y);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(point,1.);
      }`,
    fragmentShader: `
      uniform vec3 beamColor; uniform float strength; uniform float time;
      varying vec2 vUv; varying float vSeed;
      void main(){
        // Clamp first: sin() dips just below zero at the edge and pow() would return NaN.
        float across=pow(max(0.,sin(3.14159*vUv.x)),1.6);
        float streak=.62+.38*sin(vUv.x*31.+vSeed*17.+time*.13)*sin(vUv.x*9.-time*.06+vSeed*5.);
        float along=smoothstep(0.,.2,vUv.y)*mix(.3,1.,vUv.y)*(1.-smoothstep(.85,1.,vUv.y));
        float breathe=.8+.2*sin(time*.21+vSeed*9.);
        gl_FragColor=vec4(beamColor*across*streak*along*breathe*strength,1.);
      }`,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false; // Bounds live in the per-instance attribute.
  mesh.renderOrder = 1.7;
  scene.add(mesh);
  return uniforms;
}

class Garden {
  constructor() {
    // The canvas only ever receives the full-screen post quad, so its own
    // multisampling and depth buffer would be paid for and never used. The
    // scene is antialiased in the render target instead.
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, depth: false, powerPreference: 'high-performance' });
    this.renderer.setClearColor('#09070d');
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(gardenAtmosphere.color, gardenAtmosphere.near, gardenAtmosphere.far);
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 150);
    this.environments = new Map();
    this.setBackgroundPalette = setupBackground(this.scene);
    this.seasonalParticles = new SeasonalParticles(this.scene);
    // A second layer: falling petals in autumn, large near flakes in winter.
    this.fallingPetals = new SeasonalParticles(this.scene);
    this.lightBeams = createLightBeams(this.scene);
    this.grassTip = { color: { value: new THREE.Color() }, amount: { value: 0 } };
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
    this.glowScale = 1;
    this.desktopStudyMode = savedStudyMode();
    this.selection = gardenSelection(phoneLayout.matches ? 'lily' : this.desktopStudyMode);
    this.study = this.selection.study;
    this.nextCalendarCheck = 0;

    this.assets = makeFlowerAssets();
    this.groundSignals = new GroundSignals(this.scene);
    this.pollen = new AsciiPollen(this.scene);
    this.applySeasonPalette();
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
    this.needsRender = true;
    this.needsPicking = false;
    this.elapsed = 0;
    this.lastTime = 0;
    this.burst = 0;
    this.projected = new THREE.Vector3();
    this.targetCamera = new THREE.Vector3();
    this.focusPoint = new THREE.Vector3();
    this.currentLook = new THREE.Vector3();
    this.focusAmount = 0;
    this.focusUntil = 0;
    this.focusDistance = 13.5;
    this.quality = 1;
    this.frameAverage = 16;
    this.frameSamples = 0;
    this.seed = 821;
    this.buildPost();
    this.replant();
    this.resize();
    this.bind();
    this.render = this.render.bind(this);
    requestAnimationFrame(this.render);
    document.body.dataset.gardenState = 'ready';
    document.body.dataset.gardenRevision = 'pearl-blooms';
    $('#loading').classList.add('loaded');
    $('#loading').setAttribute('aria-hidden', 'true');
  }

  buildPost() {
    const hdr = this.renderer.extensions.has('EXT_color_buffer_float');
    const type = hdr ? THREE.HalfFloatType : THREE.UnsignedByteType;
    this.baseGlow = hdr ? 0.4 : 0.3;
    this.renderTarget = new THREE.WebGLRenderTarget(1, 1, {
      depthBuffer: true, samples: 4, type, depthTexture: new THREE.DepthTexture(1, 1),
    });
    // Two half-resolution targets hold a blurred scene for depth of field;
    // two quarter-resolution ones spread the highlights into bloom.
    this.blurTargets = [0, 1, 2, 3].map(() => new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false, type }));
    this.postScene = new THREE.Scene();
    this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const vertexShader = `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
    this.blur = new THREE.ShaderMaterial({
      depthTest: false, depthWrite: false, toneMapped: false,
      uniforms: { image: { value: null }, direction: { value: new THREE.Vector2() }, threshold: { value: 0 } },
      vertexShader,
      fragmentShader: `
        uniform sampler2D image;uniform vec2 direction;uniform float threshold;varying vec2 vUv;
        vec3 tap(vec2 uv){
          vec3 c=texture2D(image,uv).rgb;
          if(threshold>0.){
            // Chrome speculars are far above 1; cap them so one pixel cannot
            // print a hard-edged copy of the blur kernel.
            float level=max(c.r,max(c.g,c.b));
            c=min(c,vec3(2.5))*smoothstep(threshold,threshold+.7,level);
          }
          return c;
        }
        void main(){
          vec3 sum=tap(vUv)*.227027;
          sum+=(tap(vUv+direction*1.384615)+tap(vUv-direction*1.384615))*.316216;
          sum+=(tap(vUv+direction*3.230769)+tap(vUv-direction*3.230769))*.070270;
          gl_FragColor=vec4(sum,1.);
        }`,
    });
    this.post = new THREE.ShaderMaterial({
      depthTest: false, depthWrite: false,
      uniforms: {
        image: { value: this.renderTarget.texture }, depthMap: { value: this.renderTarget.depthTexture },
        soft: { value: this.blurTargets[1].texture }, glow: { value: this.blurTargets[3].texture },
        resolution: { value: new THREE.Vector2() }, focusDistance: { value: 13.5 },
        glowStrength: { value: hdr ? 0.4 : 0.3 },
        time: { value: 0 }, burst: { value: 0 }, distortion: { value: 0 },
        focus: { value: new THREE.Vector2(0.6, 0.6) }, motion: { value: paused ? 0 : 1 },
      },
      vertexShader,
      fragmentShader: `
        uniform sampler2D image;uniform sampler2D depthMap;uniform sampler2D soft;uniform sampler2D glow;
        uniform vec2 resolution;uniform float time;uniform float focusDistance;uniform float glowStrength;
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
          float split=.00045*.55+energy*region*.018*distortion;
          vec3 col;
          col.r=texture2D(image,uv+vec2(split,0.)).r;
          col.g=texture2D(image,uv).g;
          col.b=texture2D(image,uv-vec2(split,0.)).b;
          // Depth of field: the selected flower's distance stays sharp. The sky
          // writes no depth, so the glyphs drawn over it stay crisp.
          float depth=texture2D(depthMap,uv).r;
          float ndc=depth*2.-1.;
          float range=2.*.1*150./(150.1-ndc*149.9);
          float farBlur=smoothstep(focusDistance+5.,focusDistance+22.,range)*.92;
          float nearBlur=smoothstep(focusDistance-6.,focusDistance-15.,range)*.6;
          float circle=depth>.99999?0.:max(farBlur,nearBlur);
          col=mix(col,texture2D(soft,uv).rgb,circle);
          col+=texture2D(glow,uv).rgb*glowStrength;
          // Three-pixel lines survive the canvas being scaled without moire.
          col-=sin(gl_FragCoord.y*2.0944)*.0016;
          col+=vec3(.13,.01,.1)*tear*energy*region*.15;
          gl_FragColor=vec4(col,1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.post);
    this.postScene.add(this.postQuad);
  }

  blurPass(source, target, x, y, threshold = 0) {
    this.blur.uniforms.image.value = source.texture;
    // Offsets are in target texels, so taps stay adjacent and never ghost.
    this.blur.uniforms.direction.value.set(x / target.width, y / target.height);
    this.blur.uniforms.threshold.value = threshold;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.postScene, this.postCamera);
  }

  replant() {
    for (const flower of this.flowers) {
      this.scene.remove(flower.root);
      flower.anthers?.dispose();
      flower.privateGeometries.forEach((geometry) => geometry.dispose());
    }
    const random = seededRandom(this.seed);
    this.flowers = [];
    const placements = gardenPlanting(this.seed);
    if (this.study.id === 'snowdrop' && !this.assets.snowdrop) this.assets.snowdrop = makeSnowdropAssets(this.assets);
    if (this.study.id === 'chrysanthemum' && !this.assets.chrysanthemum) {
      this.assets.chrysanthemum = makeChrysanthemumAssets(this.assets);
    }
    placements.forEach((placement, id) => {
      const flower = flowerFactories[this.study.id](id, this.assets, random, flowerDetail(placement));
      placeFlower(flower, placement);
      flower.root.position.y = groundHeight(placement.x, placement.z);
      this.scene.add(flower.root);
      this.flowers.push(flower);
    });
    this.hitTargets = this.flowers.map((flower) => flower.hit);
    this.createGrass(placements);
    if (!this.contactShadows) {
      this.contactShadows = createContactShadows(placements.length);
      this.scene.add(this.contactShadows);
    }
    updateContactShadows(this.contactShadows, placements, groundHeight);
    this.groundSignals.replant(placements, this.seed, groundHeight);
    this.selectedId = 0;
    this.hoveredId = -1;
    this.needsPicking = true;
    this.clearResponses();
    cursor.classList.remove('visible');
    $('#specimen-id').textContent = '001';
    this.specimenNoteId = null;
    this.syncStudyLabels();
    document.body.dataset.seed = String(this.seed);
  }

  studyCaption() {
    const season = text(`season.${this.study.season}`, {}, this.study.season);
    const heading = this.selection.automatic || phoneLayout.matches ? season : text('season.preview', { season });
    return `${heading} · ${text(`species.${this.study.id}`, {}, this.study.name)}`;
  }

  syncSpecimenNote() {
    const species = this.study.id;
    let label = text(`scale.${species}`, {}, this.study.noteLabel);
    if (this.specimenNoteId !== null) {
      const note = flowerNote(this.specimenNoteId, species).name;
      const timbre = flowerCharacter(this.specimenNoteId, species).name;
      label = `${note} / ${text(`timbre.${timbre}`, {}, timbre.toUpperCase())}`;
    }
    $('#note-name').textContent = label;
  }

  syncStudyLabels() {
    const name = text(`species.${this.study.id}`, {}, this.study.name);
    const flower = name.toLowerCase();
    document.body.dataset.study = this.study.id;
    document.body.dataset.studyMode = this.selection.mode;
    document.body.dataset.season = this.selection.season.toLowerCase();
    document.body.dataset.gardenMonth = this.selection.month;
    $('#flower-genus').textContent = this.study.genus;
    $('#garden-study-index').textContent = this.study.index.padStart(3, '0');
    const month = new Date(2020, this.selection.monthIndex, 1);
    const currentFlower = gardenSelection('calendar', month).study;
    const currentName = text(`species.${currentFlower.id}`, {}, currentFlower.name);
    const calendarButton = $('button[data-study-mode="calendar"]');
    const calendarLabel = `${text('season.now', {}, 'Now')} - ${currentName}`;
    calendarButton.textContent = calendarLabel;
    calendarButton.setAttribute('aria-label', `${calendarLabel} — ${text('season.nowLabel', {}, 'Follow the current season')}`);
    $('#garden-month').textContent = month.toLocaleDateString(currentLanguage(), { month: 'long' }).toUpperCase();
    $('#study-caption').textContent = this.studyCaption();
    garden.setAttribute('aria-label', text('garden.region', { flower }));
    for (const button of document.querySelectorAll('button[data-study-mode]')) {
      button.setAttribute('aria-pressed', String(button.dataset.studyMode === this.selection.mode));
    }
    this.syncSpecimenNote();
  }

  applySeasonPalette() {
    this.keyLight.color.set(this.selection.keyLight);
    this.keyLight.position.fromArray(this.selection.study.keyFrom);
    const { color: beamColor, strength: beamStrength, angle: beamAngle } = this.selection.study.beams;
    this.lightBeams.beamColor.value.set(beamColor);
    this.lightBeams.strength.value = beamStrength;
    this.lightBeams.angle.value = beamAngle;
    this.fillLight.color.set(this.selection.fillLight);
    const study = this.selection.study;
    this.setBackgroundPalette(study.sky);
    // One prefiltered environment per season, built the first time it is shown.
    if (!this.environments.has(study.id)) this.environments.set(study.id, environmentTexture(this.renderer, study.sky));
    this.scene.environment = this.environments.get(study.id).texture;
    this.seasonalParticles.select(this.selection.season);
    const extraLayer = { Spring: 'Seeds', Summer: 'NearFireflies', Autumn: 'Petals', Winter: 'NearSnow' }[this.selection.season];
    if (extraLayer) this.fallingPetals.select(extraLayer);
    this.fallingPetals.points.visible = Boolean(extraLayer);
    const ground = this.setBackgroundPalette.frost;
    ground.amount.value = study.frost || 0;
    ground.dew.value = study.dew || 0;
    if (study.glint) ground.glintColor.value.fromArray(study.glint);
    this.setBackgroundPalette.sky.stars.value = study.stars || 0;
    // Grass tips take a seasonal tint: new growth, moonlight, or frost.
    const [tipColor, tipAmount] = study.tips || ['#ffffff', 0];
    this.grassTip.color.value.set(tipColor);
    this.grassTip.amount.value = tipAmount;
    this.groundSignals.setPalette(study.signals);
    this.glowScale = study.bloom || 1;
    this.pollen.setSeason(this.selection.season);
  }

  changeStudy(mode, remember = true) {
    if (remember && phoneLayout.matches) return;
    const selection = gardenSelection(mode);
    if (selection.mode === this.selection.mode && selection.monthKey === this.selection.monthKey) return;
    this.selection = selection;
    if (remember) {
      this.desktopStudyMode = selection.mode;
      try { sessionStorage.setItem(studyPreferenceKey, selection.mode); } catch { /* Storage can be disabled. */ }
    }
    this.applySeasonPalette();
    this.needsRender = true;
    if (selection.study !== this.study) {
      audio.changeStudy(selection.study.id);
      this.study = selection.study;
      this.pointerInside = false;
      this.gestureStrength = 0.35;
      this.replant();
    } else this.syncStudyLabels();
    const message = selection.automatic ? 'following' : audio.enabled ? 'previewAudible' : 'previewMuted';
    setStatus(`status.${message}`, () => ({ caption: this.studyCaption() }));
  }

  refreshCalendar() { this.changeStudy(phoneLayout.matches ? 'lily' : this.desktopStudyMode, false); }

  createGrass(placements) {
    if (!this.grass) {
      const material = this.assets.green.clone();
      material.color.set('#ffffff');
      material.metalness = 0.22;
      material.roughness = 0.54;
      material.envMapIntensity = 0.55;
      // Half-transparent blades read as a soft field and leave the blooms in charge.
      material.transparent = true;
      material.opacity = 0.32;
      material.depthWrite = false;
      // Wind lives in the vertex shader: blades bend from the root with a
      // phase taken from where they stand, so gusts travel across the meadow.
      this.grassWind = { value: 0 };
      material.onBeforeCompile = (shader) => {
        shader.uniforms.windTime = this.grassWind;
        shader.uniforms.tipColor = this.grassTip.color;
        shader.uniforms.tipAmount = this.grassTip.amount;
        // Each blade shifts toward the season's tip color as it rises.
        shader.fragmentShader = 'uniform vec3 tipColor;uniform float tipAmount;varying float vBladeHeight;\n' + shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,tipColor,smoothstep(.25,1.,vBladeHeight)*tipAmount);');
        shader.vertexShader = 'uniform float windTime;varying float vBladeHeight;\n' + shader.vertexShader.replace('#include <project_vertex>', `
          vec4 mvPosition=vec4(transformed,1.);
          vBladeHeight=clamp(position.x/1.85,0.,1.);
          #ifdef USE_INSTANCING
            mvPosition=instanceMatrix*mvPosition;
            float bladeHeight=vBladeHeight;
            float bend=bladeHeight*bladeHeight*length(instanceMatrix[0].xyz);
            vec2 root=instanceMatrix[3].xz;
            float gust=windTime*1.25+root.x*.33+root.y*.27;
            mvPosition.x+=(sin(gust)*.16+sin(gust*2.3+root.y)*.06)*bend;
            mvPosition.z+=cos(gust*.8+root.x)*.08*bend;
          #endif
          mvPosition=modelViewMatrix*mvPosition;
          gl_Position=projectionMatrix*mvPosition;`);
      };
      this.grass = new THREE.InstancedMesh(this.assets.grassBlade, material, grassBlades);
      // Bounds are fixed at planting; the shader sway stays well inside them.
      this.grass.renderOrder = 1.6; // After the floor, shadows and ground signals.
      this.scene.add(this.grass);
    }
    this.grass.count = window.innerWidth < 601 ? Math.round(grassBlades * 0.55) : grassBlades;
    const dummy = new THREE.Object3D();
    const [shade, tip] = this.study.grass.map((color) => new THREE.Color(color));
    const bladeColor = new THREE.Color();
    const greyTint = new THREE.Color();
    const variation = seededRandom(this.seed + 371);
    meadowGrass(placements, this.seed, this.grass.count).forEach(({ x, z, yaw, lean, scale }, i) => {
      dummy.position.set(x, -0.1 + groundHeight(x, z), z);
      dummy.rotation.set(0, yaw, lean);
      dummy.scale.set(scale, scale, scale * 0.65);
      dummy.updateMatrix();
      this.grass.setMatrixAt(i, dummy.matrix);
      // Pull each blade a third of the way to its own grey so the field recedes.
      bladeColor.lerpColors(shade, tip, variation());
      const grey = bladeColor.r * 0.3 + bladeColor.g * 0.55 + bladeColor.b * 0.15;
      this.grass.setColorAt(i, bladeColor.lerp(greyTint.setScalar(grey), 0.38));
    });
    this.grass.instanceMatrix.needsUpdate = true;
    this.grass.instanceColor.needsUpdate = true;
    this.grass.computeBoundingSphere();
  }

  resize() {
    this.needsRender = true;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.mobile = phoneLayout.matches;
    this.sizeBuffers();
    this.camera.aspect = this.width / this.height;
    this.camera.fov = this.mobile ? 49 : 40;
    this.camera.updateProjectionMatrix();
    this.pollen.resize(this.height, this.camera.fov, this.pixelRatio);
    this.baseCamera = this.mobile ? new THREE.Vector3(1.0, 6.8, 13.6) : new THREE.Vector3(0, 5.65, 13.9);
    this.lookAt = this.mobile ? new THREE.Vector3(1, 2.0, 0) : new THREE.Vector3(0, 2.5, 0);
    this.camera.position.copy(this.baseCamera);
    this.currentLook.copy(this.lookAt);
    this.camera.lookAt(this.lookAt);
    this.needsPicking = true;
  }

  sizeBuffers() {
    const budgetRatio = Math.sqrt(maxRenderPixels / Math.max(1, this.width * this.height));
    this.pixelRatio = Math.min(devicePixelRatio, this.mobile ? 1.5 : 1.65, budgetRatio) * this.quality;
    this.renderer.setDrawingBufferSize(this.width, this.height, this.pixelRatio);
    this.renderTarget.setSize(canvas.width, canvas.height);
    const halfWidth = Math.max(1, canvas.width >> 1), halfHeight = Math.max(1, canvas.height >> 1);
    this.blurTargets[0].setSize(halfWidth, halfHeight);
    this.blurTargets[1].setSize(halfWidth, halfHeight);
    this.blurTargets[2].setSize(Math.max(1, halfWidth >> 1), Math.max(1, halfHeight >> 1));
    this.blurTargets[3].setSize(Math.max(1, halfWidth >> 1), Math.max(1, halfHeight >> 1));
    this.post.uniforms.resolution.value.set(canvas.width, canvas.height);
  }

  // Sustained slow frames trade resolution for smoothness, one step at a time.
  watchFrameTime(elapsedMs) {
    if (elapsedMs > 200) return; // A throttled or just-restored tab says nothing about the GPU.
    this.frameAverage += (elapsedMs - this.frameAverage) * 0.05;
    // 40 ms sits below a 30 fps battery-saver cap, which is not a slow GPU.
    if (++this.frameSamples < 120 || this.frameAverage < 40) return;
    // Halving the antialiasing samples costs far less sharpness than a
    // resolution step and saves about as much, so it goes first.
    if (this.renderTarget.samples > 2) {
      this.renderTarget.samples = 2;
      this.renderTarget.dispose();
    } else if (this.quality > 0.55) this.quality *= 0.8;
    else return;
    this.frameSamples = 0;
    this.frameAverage = 16;
    this.sizeBuffers();
    this.pollen.resize(this.height, this.camera.fov, this.pixelRatio);
  }

  bind() {
    window.addEventListener('garden:pagechange', (event) => {
      this.contentOpen = event.detail.page !== 'garden';
      this.refreshCalendar();
      this.pointerInside = false;
      this.hoveredId = -1;
      this.clearResponses();
      cursor.classList.remove('visible');
      garden.style.cursor = 'default';
      audio.setVisibility(!this.contentOpen && !document.hidden);
    });
    window.addEventListener('resize', () => this.resize());
    phoneLayout.addEventListener('change', () => this.refreshCalendar());
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
      document.body.dataset.gardenTouched = 'true';
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
        document.body.dataset.gardenTouched = 'true';
      } else if (event.code === 'Space' || event.key === 'Enter') {
        event.preventDefault();
        if (event.repeat) return;
        this.playFlower(this.selectedId, 0.45);
      }
    });
    $('#reseed').addEventListener('click', () => {
      this.seed += 127;
      this.replant();
      setStatus('status.replant');
    });
    for (const button of document.querySelectorAll('button[data-study-mode]')) {
      button.addEventListener('click', () => this.changeStudy(button.dataset.studyMode));
    }
    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      audio.mute();
      soundButton.setAttribute('aria-pressed', 'false');
      syncSoundLabel();
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

  pickIfNeeded() {
    if (!this.pointerInside || !this.needsPicking) return;
    this.needsPicking = false;
    this.pick();
  }

  clearResponses() {
    this.needsRender = true;
    this.pollen.clear();
    this.groundSignals.clear();
    document.body.dataset.pollenCount = '0';
    this.ripples.length = 0;
    this.visualGesture = null;
    this.burst = 0;
    this.lastPointerSample = null;
    this.focusUntil = 0;
    this.focusAmount = 0;
    if (this.baseCamera) {
      this.camera.position.copy(this.baseCamera);
      this.currentLook.copy(this.lookAt);
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
    // The camera leans toward the played flower and the lens refocuses on it.
    this.focusPoint.copy(this.projected);
    this.focusUntil = performance.now() + 4200;
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
        this.visualGesture = { ...gesture, distortion: flower.distortion };
        this.ripples.push({ ...gesture, id, x: flower.root.position.x, z: flower.root.position.z });
        this.ripples = this.ripples.slice(-6);
        this.groundSignals.pulse(id, this.elapsed, strength);
      }
      this.post.uniforms.focus.value.set(pan, this.projected.y * 0.5 + 0.5);
    }
    $('#specimen-id').textContent = String(id + 1).padStart(3, '0');
    this.specimenNoteId = id;
    this.syncSpecimenNote();
    const bloom = this.study.id === 'lily' ? strength > 0.65 ? 'brightLily' : 'softLily' : this.study.id;
    setStatus(`status.${note ? bloom : audio.enabled ? 'listening' : 'enableBloom'}`, undefined, this.study.sound);
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
    if ((paused || this.contentOpen) && !this.needsRender) {
      this.lastTime = timestamp;
      if (!this.contentOpen) this.pickIfNeeded();
      return;
    }
    this.needsRender = false;
    const frameMs = timestamp - (this.lastTime || timestamp);
    const delta = Math.min(frameMs / 1000, 0.05);
    this.lastTime = timestamp;
    if (!paused && !this.contentOpen && frameMs > 0) this.watchFrameTime(frameMs);
    if (!paused) this.elapsed += delta;
    const now = timestamp / 1000;
    if (this.ripples.length) this.ripples = this.ripples.filter((ripple) => now - ripple.startedAt < ripple.gate + ripple.release + 9 / 4.4);
    this.burst = this.visualGesture ? bloomEnvelope(now - this.visualGesture.startedAt, this.visualGesture) * this.visualGesture.energy : 0;
    const parallaxX = this.pointerInside && !paused ? this.pointer.x * 0.16 : 0;
    const parallaxY = this.pointerInside && !paused ? this.pointer.y * 0.06 : 0;
    // A slow drift keeps the reflections alive; playing a flower eases the
    // camera a little toward it, then lets it settle back.
    const drift = paused ? 0 : 1;
    this.focusAmount += ((!paused && timestamp < this.focusUntil ? 1 : 0) - this.focusAmount) * (1 - Math.exp(-delta * 1.6));
    this.targetCamera.copy(this.baseCamera);
    this.targetCamera.x += parallaxX + Math.sin(this.elapsed * 0.11) * 0.3 * drift;
    this.targetCamera.y += parallaxY + Math.sin(this.elapsed * 0.083 + 1.3) * 0.1 * drift;
    this.targetCamera.lerp(this.focusPoint, 0.05 * this.focusAmount);
    this.camera.position.lerp(this.targetCamera, 1 - Math.exp(-delta * 3));
    this.targetLook = (this.targetLook || new THREE.Vector3()).copy(this.lookAt).lerp(this.focusPoint, 0.16 * this.focusAmount);
    if (paused) this.currentLook.copy(this.lookAt);
    else this.currentLook.lerp(this.targetLook, 1 - Math.exp(-delta * 2.2));
    this.camera.lookAt(this.currentLook);
    const selected = this.flowers[this.selectedId];
    if (selected) {
      const lens = selected.head.getWorldPosition(this.projected).distanceTo(this.camera.position);
      this.focusDistance += (lens - this.focusDistance) * (paused ? 1 : 1 - Math.exp(-delta * 2.5));
    }
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
      updateFlowerMotion(flower, this.elapsed, swayX, swayZ, response * flower.distortion, paused);
      if (flower.id === this.selectedId) {
        card.classList.toggle('playing', !paused && envelope > 0.006);
        card.style.setProperty('--signal-strength', String(Math.max(0.12, Math.min(1, envelope))));
      }
    }
    // Raycast only after pointer movement. Animated flowers passing a still cursor
    // should not repeatedly retrigger music.
    this.pickIfNeeded();
    const pollenFlower = !paused && !this.contentOpen && this.pointerInside && this.hoveredId >= 0 ? this.flowers[this.hoveredId] : null;
    const pollenCount = this.pollen.update(this.elapsed, paused ? 0 : delta, pollenFlower, this.gestureStrength, this.study.pollenMode);
    if (document.body.dataset.pollenCount !== String(pollenCount)) document.body.dataset.pollenCount = String(pollenCount);
    this.post.uniforms.time.value = this.elapsed;
    this.post.uniforms.burst.value = this.burst;
    this.post.uniforms.distortion.value = this.visualGesture?.distortion ?? 0;
    this.post.uniforms.motion.value = paused ? 0 : 1;
    this.groundSignals.update(this.elapsed, paused);
    this.lightBeams.time.value = this.elapsed;
    this.seasonalParticles.update(this.elapsed, this.renderTarget.height);
    this.fallingPetals.update(this.elapsed, this.renderTarget.height);
    this.post.uniforms.glowStrength.value = this.baseGlow * this.glowScale;
    this.post.uniforms.focusDistance.value = this.focusDistance;
    this.grassWind.value = this.elapsed;
    this.setBackgroundPalette.frost.time.value = this.elapsed;
    this.setBackgroundPalette.sky.skyTime.value = this.elapsed;
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(this.scene, this.camera);
    const [softA, soft, glowA, glow] = this.blurTargets;
    this.postQuad.material = this.blur;
    this.blurPass(this.renderTarget, softA, 1, 0);
    this.blurPass(softA, soft, 0, 1);
    this.blurPass(soft, glowA, 1, 0, this.renderTarget.texture.type === THREE.HalfFloatType ? 1.05 : 0.82);
    this.blurPass(glowA, glow, 0, 1);
    // A second, wider round on the already-smooth result widens the halo.
    this.blurPass(glow, glowA, 2, 0);
    this.blurPass(glowA, glow, 0, 2);
    this.postQuad.material = this.post;
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.postScene, this.postCamera);
  }
}

try {
  app = new Garden();
  (window.requestIdleCallback || ((load) => setTimeout(load, 1500)))(() => loadSoundLibrary().catch(() => {}), { timeout: 4000 });
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
