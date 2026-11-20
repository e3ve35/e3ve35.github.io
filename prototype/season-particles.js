import * as THREE from './vendor/three.module.min.js';
import { createDriftingParticles, createSnowfall } from './snowfall.js?v=seasonal-weather-1';

function drawPetal(context) {
  const pink = context.createLinearGradient(10, 12, 50, 57);
  pink.addColorStop(0, '#ffe6db');
  pink.addColorStop(0.52, '#ffb2cd');
  pink.addColorStop(1, '#e86a9a');
  context.fillStyle = pink;
  context.beginPath();
  context.moveTo(32, 56);
  context.bezierCurveTo(26, 49, 6, 34, 9, 21);
  context.bezierCurveTo(11, 8, 25, 5, 32, 14);
  context.bezierCurveTo(40, 5, 55, 11, 55, 24);
  context.bezierCurveTo(55, 37, 41, 48, 32, 56);
  context.fill();
}

function drawLeaf(context) {
  const copper = context.createLinearGradient(10, 17, 54, 49);
  copper.addColorStop(0, '#ffce78');
  copper.addColorStop(0.55, '#ee964a');
  copper.addColorStop(1, '#ca5646');
  context.fillStyle = copper;
  context.beginPath();
  context.moveTo(8, 51);
  context.bezierCurveTo(14, 11, 35, 17, 56, 9);
  context.bezierCurveTo(54, 31, 41, 55, 8, 51);
  context.fill();
  context.beginPath();
  context.moveTo(5, 55);
  context.quadraticCurveTo(31, 31, 50, 16);
  context.strokeStyle = '#fff0ae';
  context.lineWidth = 2.5;
  context.stroke();
}

function drawFirefly(context) {
  const glow = context.createRadialGradient(32, 32, 0, 32, 32, 30);
  glow.addColorStop(0, '#f4ffd7');
  glow.addColorStop(0.15, '#d9ffa4');
  glow.addColorStop(0.35, '#b4fd936e');
  glow.addColorStop(1, '#89ed9600');
  context.fillStyle = glow;
  context.fillRect(0, 0, 64, 64);
}

const seasons = {
  Spring: { draw: drawPetal, count: 112, seed: 321, height: 8, speed: [0.22, 0.23], size: [0.12, 0.24], sway: 1.25, spin: 0.42, shimmer: 0 },
  Summer: { draw: drawFirefly, count: 125, seed: 624, height: 5.4, speed: [-0.07, 0.035], size: [0.18, 0.32], sway: 0.8, spin: 0, shimmer: 1 },
  Autumn: { draw: drawLeaf, count: 104, seed: 928, height: 8, speed: [0.28, 0.28], size: [0.17, 0.26], sway: 1.55, spin: 0.6, shimmer: 0 },
};

export function createSeasonParticles(season) {
  if (season === 'Winter') return createSnowfall();
  const { draw, ...profile } = seasons[season];
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  draw(canvas.getContext('2d'));
  return createDriftingParticles({ ...profile, texture: new THREE.CanvasTexture(canvas) });
}
