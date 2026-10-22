// A Northern Hemisphere art calendar; flower choices are creative presets.
const studies = {
  lily: {
    id: 'lily', index: '01', name: 'Lilies', genus: 'Lilium',
    noteLabel: 'D PENTATONIC', caption: 'Bell tones · rising pollen',
    sound: 'A clear, ringing bloom', pollenMode: 0,
    keyLight: '#f061c9', fillLight: '#cbff94',
  },
  poppy: {
    id: 'poppy', index: '02', name: 'Poppies', genus: 'Papaver',
    noteLabel: 'A PENTATONIC', caption: 'Soft tones · drifting seeds',
    sound: 'A soft, floating bloom', pollenMode: 1,
    keyLight: '#ff91b0', fillLight: '#ead0a2',
  },
};

export function gardenStudy(id) { return studies[id] || studies.lily; }

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const seasons = [
  { name: 'Winter', study: 'lily', keyLight: '#b79bff', fillLight: '#b8d9ff' },
  { name: 'Spring', study: 'poppy', keyLight: '#ffa8c6', fillLight: '#daffb1' },
  { name: 'Summer', study: 'lily', keyLight: '#f061c9', fillLight: '#cbff94' },
  { name: 'Autumn', study: 'poppy', keyLight: '#ff9475', fillLight: '#ffd39b' },
];

export function gardenSelection(mode = 'calendar', date = new Date()) {
  mode = ['calendar', 'lily', 'poppy'].includes(mode) ? mode : 'calendar';
  const monthIndex = date.getMonth();
  const season = seasons[Math.floor(((monthIndex + 1) % 12) / 3)];
  const automatic = mode === 'calendar';
  const study = gardenStudy(automatic ? season.study : mode);
  return {
    mode, automatic, study, month: months[monthIndex], season: season.name,
    monthKey: `${date.getFullYear()}-${monthIndex}`,
    keyLight: automatic ? season.keyLight : study.keyLight,
    fillLight: automatic ? season.fillLight : study.fillLight,
    caption: automatic ? `${season.name} · ${study.caption.toLowerCase()}` : study.caption,
  };
}
