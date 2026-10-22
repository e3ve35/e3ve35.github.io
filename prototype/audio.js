import { bloomProfile } from './expressions.js?v=seasonal-study-1';

const MIDI = [50, 53, 55, 57, 60, 62, 65, 67, 69, 72, 74, 77];
const POPPY_MIDI = [45, 48, 50, 52, 55, 57, 60, 62, 64, 67, 69, 72];
const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

export function flowerNote(id, species = 'lily') {
  const scale = species === 'poppy' ? POPPY_MIDI : MIDI;
  const midi = scale[(id * 7 + 5) % scale.length];
  return { midi, frequency: 440 * 2 ** ((midi - 69) / 12), name: `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}` };
}

// Eight reusable voices. Editing a free voice never recolors a ringing note.
export class GardenAudio {
  constructor() {
    this.enabled = false;
    this.ready = false;
    this.voices = [];
    this.lastPlayed = -Infinity;
    this.lastByFlower = new Map();
  }

  async enable() {
    const Tone = window.Tone;
    if (!Tone) throw new Error('The sound library did not load. Please refresh and try again.');
    // Called directly from a click/keyboard handler, including on iOS.
    await Tone.start();
    if (!this.ready) {
      const limiter = new Tone.Limiter(-3).toDestination();
      this.master = new Tone.Gain(0).connect(limiter);
      const lowpass = new Tone.Filter(6500, 'lowpass').connect(this.master);
      const highpass = new Tone.Filter(130, 'highpass').connect(lowpass);
      const reverb = new Tone.Reverb({ decay: 3.8, preDelay: 0.025, wet: 0.28 }).connect(highpass);
      const delay = new Tone.FeedbackDelay({ delayTime: 0.31, feedback: 0.23, wet: 0.16 }).connect(reverb);
      for (let i = 0; i < 8; i++) {
        const panner = new Tone.Panner(0).connect(delay);
        const filter = new Tone.Filter(5200, 'lowpass').connect(panner);
        const synth = new Tone.FMSynth({
          volume: -16,
          harmonicity: 2.002,
          modulationIndex: 2.6,
          oscillator: { type: 'sine' },
          envelope: { attack: 0.005, decay: 1.2, sustain: 0, release: 1.5 },
          modulation: { type: 'sine' },
          modulationEnvelope: { attack: 0.002, decay: 0.38, sustain: 0, release: 0.8 },
        }).connect(filter);
        this.voices.push({ synth, filter, panner, busyUntil: 0 });
      }
      await reverb.ready;
      this.ready = true;
    }
    this.enabled = true;
    this.master.gain.rampTo(0.62, 0.15);
    this.updateState();
  }

  mute() {
    this.enabled = false;
    this.master?.gain.rampTo(0, 0.06);
    this.releaseVoices();
    this.updateState();
  }

  setVisibility(visible) {
    if (!this.ready) return;
    this.master.gain.rampTo(visible && this.enabled ? 0.62 : 0, 0.08);
    if (!visible) this.releaseVoices();
  }

  releaseVoices() {
    for (const voice of this.voices) {
      voice.synth.triggerRelease();
      voice.busyUntil = 0;
    }
    document.body.dataset.voicesInUse = '0';
  }

  changeStudy() {
    this.releaseVoices();
    this.lastByFlower.clear();
    this.lastPlayed = -Infinity;
  }

  play(id, screenPosition = 0.5, strength = 0.45, species = 'lily') {
    if (!this.enabled || !this.ready || document.hidden || document.body.dataset.page !== 'garden') return null;
    const now = performance.now();
    if (now - this.lastPlayed < 100 || now - (this.lastByFlower.get(id) ?? -Infinity) < 550) return null;
    const immediate = window.Tone.immediate();
    const voice = this.voices.find((candidate) => candidate.busyUntil <= immediate);
    if (!voice) return null;
    const profile = bloomProfile(id, strength, species);
    const when = window.Tone.now();
    voice.synth.set({
      harmonicity: profile.character.harmonicity,
      modulationIndex: profile.modulation,
      detune: (profile.character.color - 0.5) * 4,
      envelope: { attack: profile.attack, decay: profile.decay, sustain: 0, release: profile.release },
      modulationEnvelope: { attack: 0.002, decay: profile.decay * 0.42, sustain: 0, release: profile.release * 0.65 },
    });
    voice.panner.pan.setValueAtTime(Math.max(-0.78, Math.min(0.78, (screenPosition - 0.5) * 1.56)), when);
    voice.filter.frequency.setValueAtTime(profile.brightness, when);
    voice.synth.triggerAttackRelease(flowerNote(id, species).frequency, profile.gate, when, profile.velocity);
    voice.busyUntil = when + profile.gate + profile.release + 0.05;
    this.lastPlayed = now;
    this.lastByFlower.set(id, now);
    document.body.dataset.lastNote = flowerNote(id, species).name;
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
