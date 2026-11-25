// A Northern Hemisphere art calendar; flower choices are creative presets.
// Each season lights the blooms from where its sky is brightest and sends
// soft shafts of light down from that side.

const studies = {
  lily: {
    id: 'lily', index: '01', season: 'Summer', name: 'Lilies', genus: 'Lilium',
    noteLabel: 'D PENTATONIC',
    sound: 'A clear, ringing bloom', pollenMode: 0,
    // Moonlight from the upper left, with thin blue-violet shafts.
    keyLight: '#b9c4ff', fillLight: '#a6e6d0', keyFrom: [-5, 6, -9],
    beams: { color: '#aebcff', strength: 0.1, angle: 0.34 },
    // A clear indigo night: stars and moonlit grass tips.
    grass: ['#3a744d', '#85a951'],
    tips: ['#b4e0d4', 0.32], stars: 1,
    sky: { night: '#1d1a37', horizon: '#63308a', glow: '#8a3470', accent: '#22463d', fog: '#231838', ground: '#17122a' },
  },
  poppy: {
    id: 'poppy', index: '02', season: 'Spring', name: 'Poppies', genus: 'Papaver',
    noteLabel: 'A PENTATONIC',
    sound: 'A soft, floating bloom', pollenMode: 1,
    // Warm morning sun from the right, with a fresh green bounce.
    keyLight: '#ffe4d0', fillLight: '#d4f5c6', keyFrom: [6, 5, -4],
    beams: { color: '#ffe2d2', strength: 0.15, angle: -0.5 },
    // A pale lavender morning: new growth on the grass tips, dew on the
    // ground, and a gentler bloom so the wide white petals keep their folds.
    grass: ['#428b31', '#b6ea55'],
    tips: ['#eaffb6', 0.6], dew: 0.9, glint: [0.8, 1.15, 0.55], bloom: 0.8,
    sky: { night: '#3b3463', horizon: '#a493d4', glow: '#f1c3da', accent: '#4d7f78', fog: '#5c5288', ground: '#262040' },
  },
  snowdrop: {
    id: 'snowdrop', index: '03', season: 'Winter', name: 'Snowdrops', genus: 'Galanthus',
    noteLabel: 'D GLASS TONES',
    sound: 'A quiet, glassy bloom', pollenMode: 2,
    // A low peach sun against a cold blue fill.
    keyLight: '#ffd6b8', fillLight: '#b6cbff', keyFrom: [6, 3, -6],
    beams: { color: '#ffd0ae', strength: 0.13, angle: -0.82 },
    // A cold blue-violet dusk; the peach glow is the only warm note. Frost
    // whitens the grass tips and dusts the ground, and a gentler bloom keeps
    // the white petals' ridges and jade marks.
    grass: ['#6f84a0', '#dfe9f6'],
    signals: [[0.55, 0.95, 1.1], [0.68, 0.5, 1.05]],
    frost: 1, tips: ['#f6faff', 0.8], glint: [0.75, 0.9, 1.2], bloom: 0.68,
    sky: { night: '#222a4c', horizon: '#6c78ac', glow: '#f2b08a', accent: '#3d4a80', fog: '#3b4369', ground: '#1b2038' },
  },
  chrysanthemum: {
    id: 'chrysanthemum', index: '04', season: 'Autumn', name: 'Chrysanthemums', genus: 'Chrysanthemum',
    noteLabel: 'G PENTATONIC',
    sound: 'A warm, coppery pluck', pollenMode: 0,
    // Light pink over plum, in the site's lilac family. A pink key and lilac
    // fill tint the pearl petals so sky, grass, and blooms share one range.
    keyLight: '#ffd3e2', fillLight: '#d8c6ff', keyFrom: [7, 2.6, -5],
    // A low pink dusk sun, so the shafts lie nearly flat.
    beams: { color: '#ffc6dc', strength: 0.12, angle: -0.95 },
    grass: ['#6b5566', '#bba4b4'],
    // Gold and rose traces, and a gentler bloom so the white tiers keep their shading.
    signals: [[1.15, 0.78, 0.3], [0.95, 0.42, 0.8]],
    bloom: 0.72,
    sky: { night: '#3a2b45', horizon: '#b78aa8', glow: '#e3a9c6', accent: '#6f5689', fog: '#5e4a66', ground: '#2a2031' },
  },
};

export function gardenStudy(id) { return Object.hasOwn(studies, id) ? studies[id] : studies.lily; }

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const seasons = ['snowdrop', 'poppy', 'lily', 'chrysanthemum'];

export function gardenSelection(mode = 'calendar', date = new Date()) {
  mode = mode === 'calendar' || Object.hasOwn(studies, mode) ? mode : 'calendar';
  const monthIndex = date.getMonth();
  const automatic = mode === 'calendar';
  const study = gardenStudy(automatic ? seasons[Math.floor(((monthIndex + 1) % 12) / 3)] : mode);
  return {
    mode, automatic, study, monthIndex, month: months[monthIndex], season: study.season,
    monthKey: `${date.getFullYear()}-${monthIndex}`,
    keyLight: study.keyLight,
    fillLight: study.fillLight,
  };
}
