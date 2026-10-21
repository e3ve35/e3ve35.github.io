const MIDI = [50, 53, 55, 57, 60, 62, 65, 67, 69, 72, 74, 77];
const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

export function flowerNote(id) {
  const midi = MIDI[(id * 7 + 5) % MIDI.length];
  return { midi, frequency: 440 * 2 ** ((midi - 69) / 12), name: `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}` };
}

// A few shared voice pools, never an audio graph per flower.
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
      for (const pan of [-0.72, -0.24, 0.24, 0.72]) {
        const panner = new Tone.Panner(pan).connect(delay);
        const synth = new Tone.PolySynth(Tone.FMSynth, {
          volume: -16,
          harmonicity: 2.002,
          modulationIndex: 2.6,
          oscillator: { type: 'sine' },
          envelope: { attack: 0.005, decay: 1.2, sustain: 0, release: 1.5 },
          modulation: { type: 'sine' },
          modulationEnvelope: { attack: 0.002, decay: 0.38, sustain: 0, release: 0.8 },
        }).connect(panner);
        synth.maxPolyphony = 3;
        this.voices.push(synth);
      }
      await reverb.ready;
      this.ready = true;
    }
    this.enabled = true;
    this.master.gain.rampTo(0.65, 0.15);
    this.updateState();
  }

  mute() {
    this.enabled = false;
    this.master?.gain.rampTo(0, 0.06);
    this.voices.forEach((synth) => synth.releaseAll());
    this.updateState();
  }

  setVisibility(visible) {
    if (!this.ready) return;
    this.master.gain.rampTo(visible && this.enabled ? 0.65 : 0, 0.08);
    if (!visible) this.voices.forEach((synth) => synth.releaseAll());
  }

  play(id, screenPosition = 0.5, velocity = 0.55) {
    if (!this.enabled || !this.ready || document.hidden || document.body.dataset.page !== 'garden') return false;
    const now = performance.now();
    if (now - this.lastPlayed < 100 || now - (this.lastByFlower.get(id) ?? -Infinity) < 550) return false;
    if (this.voices.reduce((count, synth) => count + synth.activeVoices, 0) >= 8) return false;
    const channel = Math.min(3, Math.max(0, Math.floor(screenPosition * 4)));
    const synth = this.voices[channel];
    if (synth.activeVoices >= synth.maxPolyphony) return false;
    synth.triggerAttackRelease(flowerNote(id).frequency, 0.16, window.Tone.now(), velocity);
    this.lastPlayed = now;
    this.lastByFlower.set(id, now);
    document.body.dataset.lastNote = flowerNote(id).name;
    this.updateState();
    return true;
  }

  updateState() {
    document.body.dataset.audioState = this.enabled ? window.Tone.getContext().state : 'muted';
  }
}
