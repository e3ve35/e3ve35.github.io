// A Northern Hemisphere art calendar; flower choices are creative presets.
const bloomLights = { keyLight: '#b8ccff', fillLight: '#cdf7f1' };

const studies = {
  lily: {
    id: 'lily', index: '01', season: 'Summer', name: 'Lilies', genus: 'Lilium',
    noteLabel: 'D PENTATONIC',
    sound: 'A clear, ringing bloom', pollenMode: 0,
    ...bloomLights,
    grass: ['#3a744d', '#85a951'],
    sky: { night: '#251c30', horizon: '#612e76', glow: '#783065', accent: '#253f2e', fog: '#24152f', ground: '#19121f' },
  },
  poppy: {
    id: 'poppy', index: '02', season: 'Spring', name: 'Poppies', genus: 'Papaver',
    noteLabel: 'A PENTATONIC',
    sound: 'A soft, floating bloom', pollenMode: 1,
    ...bloomLights,
    grass: ['#428b31', '#b6ea55'],
    sky: { night: '#352a47', horizon: '#8b76a7', glow: '#c28eb9', accent: '#554c7c', fog: '#4d405e', ground: '#251e33' },
  },
  snowdrop: {
    id: 'snowdrop', index: '03', season: 'Winter', name: 'Snowdrops', genus: 'Galanthus',
    noteLabel: 'D GLASS TONES',
    sound: 'A quiet, glassy bloom', pollenMode: 2,
    ...bloomLights,
    // A cold blue-violet dusk; the peach glow is the only warm note. Frost
    // whitens the grass tips and dusts the ground, and a gentler bloom keeps
    // the white petals' ridges and jade marks.
    grass: ['#6f84a0', '#dfe9f6'],
    signals: [[0.55, 0.95, 1.1], [0.68, 0.5, 1.05]],
    frost: 1, bloom: 0.68,
    sky: { night: '#222a4c', horizon: '#6c78ac', glow: '#f2b08a', accent: '#3d4a80', fog: '#3b4369', ground: '#1b2038' },
  },
  chrysanthemum: {
    id: 'chrysanthemum', index: '04', season: 'Autumn', name: 'Chrysanthemums', genus: 'Chrysanthemum',
    noteLabel: 'G PENTATONIC',
    sound: 'A warm, coppery pluck', pollenMode: 0,
    // Light pink over plum, in the site's lilac family. A pink key and lilac
    // fill tint the pearl petals so sky, grass, and blooms share one range.
    ...bloomLights, keyLight: '#ffd3e2', fillLight: '#d8c6ff',
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
    caption: `${automatic ? study.season : `${study.season} preview`} · ${study.name}`,
  };
}
