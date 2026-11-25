import { bloomProfile } from './expressions.js?v=four-seasons-1';

const MIDI = [50, 53, 55, 57, 60, 62, 65, 67, 69, 72, 74, 77];
const POPPY_MIDI = [45, 48, 50, 52, 55, 57, 60, 62, 64, 67, 69, 72];
const CHRYSANTHEMUM_MIDI = [43, 45, 47, 50, 52, 55, 57, 59, 62, 64, 67, 69];
const scales = { poppy: POPPY_MIDI, chrysanthemum: CHRYSANTHEMUM_MIDI };
const MASTER_GAIN = 2.20;
const seasonalRecordings = {
  // CC0 excerpts from the credited recordings.
  // Spring birds loop by steaq (from hargissssound): https://freesound.org/people/steaq/sounds/548383/
  poppy: { file: './spring-birds.m4a', volume: -39 },
  // Soft Wind in the Trees by Borgory: https://freesound.org/people/Borgory/sounds/751473/
  lily: { file: './summer-wind.m4a', volume: -47 },
  // Light Rain by soundrecorder7: https://freesound.org/people/soundrecorder7/sounds/167034/
  chrysanthemum: { file: './light-rain.m4a', volume: -43 },
  // Quiet Winter Night with Light Snow & Wind by TSP-Talk: https://freesound.org/people/TSP-Talk/sounds/845502/
  snowdrop: { file: './winter-snow.m4a', volume: -43 },
};
const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

const scaleFor = (species) => Object.hasOwn(scales, species) ? scales[species] : MIDI;

// Each season keeps its own pulse, in seconds per sixteenth note. Notes start on
// the next free pulse, so a sweep across the garden lands as a phrase.
const pulses = { poppy: 0.1667, lily: 0.15, chrysanthemum: 0.1579, snowdrop: 0.1875 };
export const pulseFor = (species) => Object.hasOwn(pulses, species) ? pulses[species] : pulses.lily;
const PULSES_PER_CHORD = 64;
const MAX_QUEUED_PULSES = 2;

// The drone walks through four roots, one per chord, and the flowers move with
// it. Each entry is [semitones the drone moves, scale steps the flowers shift].
// Every root and its fifth belong to (or sit a fourth under) the season's
// pentatonic scale, so any flower stays consonant on any chord.
const minorHarmony = [[0, 0], [3, 1], [-2, -1], [5, 2]];
const majorHarmony = [[0, 0], [-3, -1], [5, 1], [-5, 3]];
export const harmonyFor = (species) => species === 'chrysanthemum' ? majorHarmony : minorHarmony;

// A quiet sixteen-step pattern per season: a soft drum machine and a music-box
// line, sparse enough to sit under the garden rather than drive it. Drums are
// 'x' on the steps they sound. The bells are steps of the season's pentatonic
// scale (five to the octave), counted from the scale's root.
const _ = null;
const sequences = {
  lily: {
    kick: 'x.......x.......', clap: '....x.......x...', hat: '..x...x...x...x.',
    bell: [5, _, 8, _, 7, _, 10, _, _, _, 9, _, 8, _, 7, _],
  },
  poppy: {
    kick: 'x.........x.....', clap: '............x...', hat: '....x.x.....x.x.',
    bell: [5, _, _, 8, _, _, 7, _, 10, _, _, _, 8, _, _, _],
  },
  chrysanthemum: {
    kick: 'x......x........', clap: '....x.......x...', hat: '..x.......x...x.',
    bell: [5, _, 7, _, 8, _, _, 10, _, _, 8, _, 7, _, _, _],
  },
  snowdrop: {
    kick: 'x...............', clap: '............x...', hat: '......x.......x.',
    bell: [8, _, _, _, 10, _, _, _, 7, _, _, _, _, _, 5, _],
  },
};
const sequenceFor = (species) => Object.hasOwn(sequences, species) ? sequences[species] : sequences.lily;

// A step of the pentatonic scale as a note in the music-box register: the
// octave above the scale's root is placed at or just above F#4.
function bellNote(species, degree) {
  const scale = scaleFor(species);
  const lift = 12 * Math.ceil((66 - (scale[0] + 12)) / 12);
  return scale[((degree % 5) + 5) % 5] + 12 * Math.floor(degree / 5) + lift;
}

// What the machine plays on one pulse: which drums, and the bell note if any.
// The bells move with the chord by the same scale steps as the flowers.
export function sequenceStep(species, slot) {
  const sequence = sequenceFor(species);
  const step = ((slot % 16) + 16) % 16;
  const chord = harmonyFor(species)[Math.floor(Math.max(0, slot) / PULSES_PER_CHORD) % harmonyFor(species).length];
  const degree = sequence.bell[step];
  return {
    kick: sequence.kick[step] === 'x', clap: sequence.clap[step] === 'x', hat: sequence.hat[step] === 'x',
    bell: degree === null ? null : bellNote(species, degree + chord[1]),
  };
}

// Flowers are soft synth plucks; each keeps its own rounded waveform.
const leadWaves = ['triangle', 'sine', 'square2', 'triangle6'];
export const leadWave = (id) => leadWaves[(id * 7) % 4];

// The pulse a note may start on: the next one, or the one after the last note.
// Returns null when the queue is already as long as a played phrase should be.
export function nextPulse(now, origin, step, lastSlot = -1) {
  const slot = Math.max(Math.ceil((now - origin) / step - 1e-9), lastSlot + 1, 0);
  const when = origin + slot * step;
  return when - now > step * MAX_QUEUED_PULSES + 1e-9 ? null : { slot, when };
}
const midiFrequency = (midi) => 440 * 2 ** ((midi - 69) / 12);

export function flowerNote(id, species = 'lily', shift = 0) {
  const scale = scaleFor(species);
  const degree = ((id * 7 + 5 + shift) % scale.length + scale.length) % scale.length;
  const midi = scale[degree] + (species === 'snowdrop' ? 12 : 0);
  return { midi, frequency: midiFrequency(midi), name: `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}` };
}

// Eight reusable voices. Editing a free voice never recolors a ringing note.
// Sound is opt-in, so the synthesis library stays off the startup path: the
// garden requests it once the first frame is up, and enabling sound waits for
// it only if the visitor gets there first.
let soundLibrary;
export function loadSoundLibrary() {
  if (window.Tone) return Promise.resolve(window.Tone);
  soundLibrary ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL('./vendor/Tone.js', import.meta.url).href;
    script.onload = () => resolve(window.Tone);
    script.onerror = () => {
      soundLibrary = undefined;
      reject(new Error('The sound library did not load. Please refresh and try again.'));
    };
    document.head.append(script);
  });
  return soundLibrary;
}

export class GardenAudio {
  constructor() {
    this.enabled = false;
    this.ready = false;
    this.voices = [];
    this.ambientVoices = [];
    this.ambientActive = false;
    this.recordingPlayers = new Map();
    this.species = 'lily';
    this.lastPlayed = -Infinity;
    this.lastByFlower = new Map();
    this.pulseOrigin = 0;
    this.lastSlot = -1;
    this.harmonyStep = 0;
    this.harmonyTimer = null;
    this.nextSlot = 0;
    this.drums = null;
    this.bells = [];
    this.nextBell = 0;
  }

  // Scale steps the flowers are currently shifted by; zero while sound is off.
  get noteShift() { return this.ambientActive ? harmonyFor(this.species)[this.harmonyStep][1] : 0; }

  // Restart the pulse and the chord cycle, and tune the echo to the pulse.
  resetPulse() {
    if (!this.ready) return;
    this.pulseOrigin = window.Tone.now();
    this.lastSlot = -1;
    this.nextSlot = 0;
    this.harmonyStep = 0;
    this.delay?.delayTime?.rampTo?.(pulseFor(this.species) * 2, 0.2);
  }

  // Move the drone to the chord the clock has reached. Returns true on a change.
  advanceHarmony() {
    if (!this.ready || !this.ambientActive) return false;
    const chord = pulseFor(this.species) * PULSES_PER_CHORD;
    const step = Math.max(0, Math.floor((window.Tone.now() - this.pulseOrigin) / chord)) % harmonyFor(this.species).length;
    if (step === this.harmonyStep) return false;
    this.harmonyStep = step;
    this.tuneAmbient(false);
    return true;
  }

  // Queue the drum machine and bass a short way ahead of the audio clock.
  scheduleAhead() {
    if (!this.ready || !this.ambientActive || !this.drums) return;
    this.advanceHarmony();
    const step = pulseFor(this.species);
    const now = window.Tone.now();
    let slot = Math.max(this.nextSlot, Math.ceil((now - this.pulseOrigin) / step - 1e-9), 0);
    for (; this.pulseOrigin + slot * step < now + 0.35; slot++) {
      const when = this.pulseOrigin + slot * step;
      const { kick, clap, hat, bell } = sequenceStep(this.species, slot);
      if (kick) this.drums.kick.triggerAttackRelease('D1', 0.14, when, slot % 16 ? 0.7 : 1);
      if (clap) this.drums.clap.triggerAttackRelease(0.06, when);
      if (hat) this.drums.hat.triggerAttackRelease(0.025, when, slot % 4 === 2 ? 1 : 0.6);
      if (bell !== null) {
        // Three bells take turns, so each note rings on under the next.
        const voice = this.bells[this.nextBell++ % this.bells.length];
        voice.triggerAttackRelease(midiFrequency(bell), 0.3, when, slot % 8 ? 0.62 : 0.8);
      }
    }
    this.nextSlot = slot;
  }

  async enable(species = this.species) {
    // Normally already loaded, so nothing is awaited before Tone.start() below.
    const Tone = window.Tone || await loadSoundLibrary();
    if (!Tone) throw new Error('The sound library did not load. Please refresh and try again.');
    this.species = species;
    // Called directly from a click/keyboard handler, including on iOS.
    await Tone.start();
    if (!this.ready) {
      const limiter = new Tone.Limiter(-3).toDestination();
      this.master = new Tone.Gain(0).connect(limiter);
      const lowpass = new Tone.Filter(6500, 'lowpass').connect(this.master);
      const highpass = new Tone.Filter(130, 'highpass').connect(lowpass);
      const reverb = new Tone.Reverb({ decay: 3.8, preDelay: 0.025, wet: 0.28 }).connect(highpass);
      const delay = new Tone.FeedbackDelay({ delayTime: 0.31, feedback: 0.23, wet: 0.16 }).connect(reverb);
      this.delay = delay;
      for (let i = 0; i < 8; i++) {
        const panner = new Tone.Panner(0).connect(delay);
        const filter = new Tone.Filter(5200, 'lowpass').connect(panner);
        const synth = new Tone.MonoSynth({
          volume: -11,
          oscillator: { type: 'triangle' },
          filter: { Q: 0.7, type: 'lowpass', rolloff: -12 },
          envelope: { attack: 0.012, decay: 0.8, sustain: 0, release: 1 },
          filterEnvelope: { attack: 0.01, decay: 0.5, sustain: 0.3, release: 1, baseFrequency: 600, octaves: 2 },
        }).connect(filter);
        this.voices.push({ synth, filter, panner, busyUntil: 0 });
      }
      // The machine is a soft heartbeat and a brushed tick under a music box.
      // The drums keep their low end by skipping the garden's high-pass
      // filter; the bells share the flowers' echo and reverb.
      const machine = new Tone.Gain(1).connect(this.master);
      const machineAir = new Tone.Gain(0.22).connect(reverb);
      const kick = new Tone.MembraneSynth({
        volume: -23, pitchDecay: 0.05, octaves: 2.5,
        envelope: { attack: 0.004, decay: 0.32, sustain: 0, release: 0.08 },
      }).connect(machine);
      const clapBand = new Tone.Filter(2300, 'bandpass').connect(machine);
      clapBand.connect(machineAir);
      const clap = new Tone.NoiseSynth({
        volume: -37, noise: { type: 'pink' }, envelope: { attack: 0.004, decay: 0.06, sustain: 0, release: 0.03 },
      }).connect(clapBand);
      const hatBand = new Tone.Filter(8000, 'highpass').connect(machine);
      const hat = new Tone.NoiseSynth({
        volume: -42, noise: { type: 'white' }, envelope: { attack: 0.002, decay: 0.022, sustain: 0, release: 0.01 },
      }).connect(hatBand);
      this.drums = { kick, clap, hat };
      // A music-box tine: a pure tone with a brief bright strike that fades
      // into a long, quiet ring.
      const bellPan = [-0.3, 0.3, 0];
      this.bells = bellPan.map((pan) => new Tone.FMSynth({
        volume: -20,
        harmonicity: 4.01,
        modulationIndex: 1.5,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.002, decay: 1.5, sustain: 0, release: 1.4 },
        modulation: { type: 'sine' },
        modulationEnvelope: { attack: 0.001, decay: 0.11, sustain: 0, release: 0.1 },
      }).connect(new Tone.Panner(pan).connect(delay)));
      await reverb.ready;
      this.ambientVoices = [
        { interval: 0, type: 'triangle', volume: -65 },
        { interval: 7, type: 'sine', volume: -71 },
      ].map(({ interval, type, volume }) => ({
        interval,
        synth: new Tone.Synth({
          volume, portamento: 0.65, oscillator: { type },
          envelope: { attack: 1.8, decay: 1.2, sustain: 0.75, release: 1.2 },
        }).connect(reverb),
      }));
      this.ready = true;
    }
    this.enabled = true;
    this.resetPulse();
    const audible = !document.hidden && document.body.dataset.page === 'garden';
    this.master.gain.rampTo(audible ? MASTER_GAIN : 0, 0.15);
    this.setAmbientActive(audible);
    this.updateState();
  }

  mute() {
    this.enabled = false;
    this.master?.gain.rampTo(0, 0.06);
    this.setAmbientActive(false);
    this.releaseVoices();
    this.updateState();
  }

  setVisibility(visible) {
    if (!this.ready) return;
    const audible = visible && this.enabled;
    this.master.gain.rampTo(audible ? MASTER_GAIN : 0, 0.08);
    this.setAmbientActive(audible);
    if (!visible) this.releaseVoices();
  }

  setAmbientActive(active) {
    if (!this.ambientVoices.length || active === this.ambientActive) return;
    this.ambientActive = active;
    clearInterval(this.harmonyTimer);
    this.harmonyTimer = null;
    if (active) {
      this.tuneAmbient(true);
      this.scheduleAhead();
      this.harmonyTimer = setInterval(() => this.scheduleAhead(), 100);
      this.harmonyTimer.unref?.();
    } else {
      const when = window.Tone.now();
      for (const { synth } of this.ambientVoices) synth.triggerRelease(when);
    }
    this.syncRecording();
  }

  tuneAmbient(attack) {
    const root = 48 + scaleFor(this.species)[0] % 12 + harmonyFor(this.species)[this.harmonyStep][0];
    const when = window.Tone.now();
    for (const { synth, interval } of this.ambientVoices) {
      const frequency = midiFrequency(root + interval);
      if (attack) synth.triggerAttack(frequency, when);
      else synth.setNote(frequency, when);
    }
  }

  syncRecording() {
    const species = this.ambientActive ? this.species : null;
    for (const [playingSpecies, player] of this.recordingPlayers) {
      if (playingSpecies !== species && player.state === 'started') player.stop();
    }
    const recording = seasonalRecordings[species];
    if (!recording) return;
    const current = this.recordingPlayers.get(species);
    if (current) {
      if (current.loaded && current.state === 'stopped') current.start();
      return;
    }
    const player = new window.Tone.Player({
      loop: true, volume: recording.volume, fadeIn: 0.85, fadeOut: 0.35,
    }).connect(this.master);
    this.recordingPlayers.set(species, player);
    player.load(new URL(recording.file, import.meta.url).href).then(() => this.syncRecording()).catch((error) => {
      player.dispose();
      this.recordingPlayers.delete(species);
      console.warn(`The garden ambience could not load for ${species}.`, error);
    });
  }

  releaseVoices() {
    for (const voice of this.voices) {
      voice.synth.triggerRelease();
      voice.busyUntil = 0;
    }
    document.body.dataset.voicesInUse = '0';
  }

  changeStudy(species) {
    this.releaseVoices();
    this.lastByFlower.clear();
    this.lastPlayed = -Infinity;
    this.species = species;
    this.resetPulse();
    if (this.ambientActive) this.tuneAmbient(false);
    this.syncRecording();
  }

  play(id, screenPosition = 0.5, strength = 0.45, species = 'lily') {
    if (!this.enabled || !this.ready || document.hidden || document.body.dataset.page !== 'garden') return null;
    const now = performance.now();
    if (now - this.lastPlayed < 100 || now - (this.lastByFlower.get(id) ?? -Infinity) < 550) return null;
    const immediate = window.Tone.immediate();
    const voice = this.voices.find((candidate) => candidate.busyUntil <= immediate);
    if (!voice) return null;
    const pulse = nextPulse(window.Tone.now(), this.pulseOrigin, pulseFor(species), this.lastSlot);
    if (!pulse) return null;
    const { when } = pulse;
    this.lastSlot = pulse.slot;
    const profile = bloomProfile(id, strength, species);
    const note = flowerNote(id, species, this.noteShift);
    // A soft pluck that rings for most of the season's own decay and release,
    // and opens a little more with a faster gesture.
    const decay = profile.decay * 0.8;
    const release = profile.release * 0.7;
    const gate = profile.gate;
    voice.synth.set({
      oscillator: { type: leadWave(id) },
      detune: (profile.character.color - 0.5) * 6,
      envelope: { attack: profile.attack + 0.006, decay, sustain: 0, release },
      filterEnvelope: {
        attack: 0.01, decay: decay * 0.7, sustain: 0.3, release,
        baseFrequency: profile.brightness * 0.3, octaves: 1.2 + profile.strength,
      },
    });
    voice.panner.pan.setValueAtTime(Math.max(-0.78, Math.min(0.78, (screenPosition - 0.5) * 1.56)), when);
    voice.filter.frequency.setValueAtTime(profile.brightness, when);
    voice.synth.triggerAttackRelease(note.frequency, gate, when, profile.velocity);
    voice.busyUntil = when + gate + release + 0.05;
    this.lastPlayed = now;
    this.lastByFlower.set(id, now);
    document.body.dataset.lastNote = note.name;
    document.body.dataset.gestureStrength = profile.strength.toFixed(2);
    document.body.dataset.voiceCharacter = profile.character.name;
    document.body.dataset.voicesInUse = String(this.voices.filter((candidate) => candidate.busyUntil > immediate).length);
    this.updateState();
    return { ...profile, startedAt: now / 1000 + Math.max(0, when - immediate) };
  }

  updateState() {
    document.body.dataset.audioState = this.enabled ? window.Tone.getContext().state : 'muted';
  }
}
