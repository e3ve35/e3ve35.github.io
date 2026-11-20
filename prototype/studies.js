// A Northern Hemisphere art calendar; flower choices are creative presets.
const studies = {
  lily: {
    id: 'lily', index: '01', season: 'Summer', name: 'Lilies', genus: 'Lilium',
    noteLabel: 'D PENTATONIC',
    sound: 'A clear, ringing bloom', pollenMode: 0,
    keyLight: '#f061c9', fillLight: '#cbff94',
    sky: { night: '#251c30', horizon: '#612e76', glow: '#783065', accent: '#253f2e', fog: '#24152f', ground: '#19121f' },
  },
  poppy: {
    id: 'poppy', index: '02', season: 'Spring', name: 'Poppies', genus: 'Papaver',
    noteLabel: 'A PENTATONIC',
    sound: 'A soft, floating bloom', pollenMode: 1,
    keyLight: '#ffa8c6', fillLight: '#daffb1',
    sky: { night: '#2d1a2b', horizon: '#813a59', glow: '#8a475d', accent: '#2c493b', fog: '#342034', ground: '#261822' },
  },
  snowdrop: {
    id: 'snowdrop', index: '03', season: 'Winter', name: 'Snowdrops', genus: 'Galanthus',
    noteLabel: 'D GLASS TONES',
    sound: 'A quiet, glassy bloom', pollenMode: 2,
    keyLight: '#b8ccff', fillLight: '#cdf7f1',
    sky: { night: '#131f32', horizon: '#345982', glow: '#366b82', accent: '#364463', fog: '#1a3048', ground: '#121d2c' },
  },
  chrysanthemum: {
    id: 'chrysanthemum', index: '04', season: 'Autumn', name: 'Chrysanthemums', genus: 'Chrysanthemum',
    noteLabel: 'G PENTATONIC',
    sound: 'A warm, coppery pluck', pollenMode: 0,
    keyLight: '#ffab6c', fillLight: '#ffcaa3',
    sky: { night: '#301b24', horizon: '#87432a', glow: '#884126', accent: '#503044', fog: '#39242b', ground: '#26191b' },
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
    mode, automatic, study, month: months[monthIndex], season: study.season,
    monthKey: `${date.getFullYear()}-${monthIndex}`,
    keyLight: study.keyLight,
    fillLight: study.fillLight,
    caption: `${automatic ? study.season : `${study.season} preview`} · ${study.name}`,
  };
}
