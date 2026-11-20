import { createAsciiParticles, createSnowfall } from './snowfall.js?v=ascii-weather-1';

const seasons = {
  Spring: {
    glyphs: ['v', 'y', 'o', '+'], colors: ['#ffc1d3', '#ff9cc6', '#ffd4dc', '#f4bbeb'],
    count: 112, seed: 321, height: 8, speed: [0.22, 0.23], size: [0.14, 0.24],
    sway: 1.25, spin: 0.42, shimmer: 0,
  },
  Summer: {
    glyphs: ['.', '+', ':', '*'], colors: ['#c5ff83', '#dfffb0', '#b8f6a3', '#e9ff9e'],
    count: 125, seed: 624, height: 5.4, speed: [-0.07, 0.035], size: [0.19, 0.28],
    sway: 0.8, spin: 0, shimmer: 1,
  },
  Autumn: {
    glyphs: ['<', '/', '>', 'v'], colors: ['#ffc175', '#f6a067', '#ffc98f', '#e88b5e'],
    count: 104, seed: 928, height: 8, speed: [0.28, 0.28], size: [0.16, 0.26],
    sway: 1.55, spin: 0.6, shimmer: 0,
  },
};

export function createSeasonParticles(season) {
  return season === 'Winter' ? createSnowfall() : createAsciiParticles(seasons[season]);
}
