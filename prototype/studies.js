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
    grass: ['#576c70', '#afc0b9'],
    sky: { night: '#3d354a', horizon: '#ae929e', glow: '#dfa98d', accent: '#68637d', fog: '#594f65', ground: '#292634' },
  },
  chrysanthemum: {
    id: 'chrysanthemum', index: '04', season: 'Autumn', name: 'Chrysanthemums', genus: 'Chrysanthemum',
    noteLabel: 'G PENTATONIC',
    sound: 'A warm, coppery pluck', pollenMode: 0,
    ...bloomLights, keyLight: '#ffd0a2',
    grass: ['#755335', '#c59b55'],
    sky: { night: '#392839', horizon: '#98677b', glow: '#c78983', accent: '#624968', fog: '#513d50', ground: '#291f2b' },
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
