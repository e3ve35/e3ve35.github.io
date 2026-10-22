// Art studies, ready for a future calendar mapping. No automatic date changes yet.
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
