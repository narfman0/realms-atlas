// A crude schematic Faerûn used only until data/map.json exists. Our own stylisation; not traced from any map.
// Shape: { polylines: [{kind, closed, points: [[x,y],...]}], labels: [{text, x, y, size, kind}] }
const ell = (cx, cy, rx, ry, n = 14, wob = 0.15, seed = 1) => Array.from({ length: n }, (_, i) => {
  const a = (i / n) * Math.PI * 2;
  const w = 1 + wob * Math.sin(a * 3 + seed) * Math.cos(a * 2 + seed * 2);
  return [cx + Math.cos(a) * rx * w, cy + Math.sin(a) * ry * w];
});

export function stubMap() {
  return {
    polylines: [
      { kind: 'coast', closed: true, points: [
        [0.08, 0.02], [0.5, 0.02], [0.96, 0.03], [0.98, 0.3], [0.97, 0.5], [0.95, 0.66], [0.88, 0.7], [0.82, 0.64],
        [0.78, 0.7], [0.72, 0.8], [0.66, 0.9], [0.57, 0.92], [0.5, 0.88], [0.45, 0.83], [0.4, 0.86], [0.43, 0.94],
        [0.41, 1.0], [0.29, 1.0], [0.27, 0.93], [0.31, 0.89], [0.24, 0.9], [0.18, 0.85], [0.14, 0.79], [0.17, 0.72],
        [0.19, 0.64], [0.17, 0.6], [0.19, 0.55], [0.17, 0.48], [0.16, 0.41], [0.13, 0.33], [0.12, 0.27], [0.1, 0.2],
        [0.09, 0.1],
      ] },
      { kind: 'coast', closed: true, points: [
        [0.46, 0.53], [0.49, 0.5], [0.55, 0.5], [0.62, 0.51], [0.66, 0.46], [0.71, 0.43], [0.75, 0.46], [0.79, 0.51],
        [0.78, 0.55], [0.73, 0.57], [0.69, 0.61], [0.63, 0.62], [0.57, 0.58], [0.5, 0.57], [0.45, 0.56],
      ] },
      { kind: 'coast', closed: true, points: [[0.6, 0.29], [0.64, 0.27], [0.69, 0.27], [0.7, 0.3], [0.66, 0.32], [0.62, 0.32]] },
      { kind: 'coast', closed: true, points: ell(0.3, 0.76, 0.05, 0.035, 12, 0.2, 2) },
      { kind: 'coast', closed: true, points: ell(0.035, 0.45, 0.022, 0.05, 12, 0.2, 3) },
      { kind: 'coast', closed: true, points: ell(0.06, 0.61, 0.025, 0.03, 10, 0.25, 4) },
      { kind: 'coast', closed: true, points: ell(0.43, 0.78, 0.018, 0.012, 9, 0.2, 5) },
      { kind: 'range', closed: false, points: [[0.1, 0.12], [0.18, 0.11], [0.26, 0.13], [0.34, 0.12]] },
      { kind: 'range', closed: false, points: [[0.28, 0.42], [0.33, 0.4], [0.37, 0.43]] },
      { kind: 'range', closed: false, points: [[0.5, 0.42], [0.47, 0.47], [0.49, 0.5]] },
      { kind: 'range', closed: false, points: [[0.22, 0.73], [0.3, 0.71], [0.36, 0.73]] },
      { kind: 'river', closed: false, points: [[0.42, 0.5], [0.36, 0.53], [0.29, 0.54], [0.24, 0.55], [0.19, 0.56]] },
      { kind: 'river', closed: false, points: [[0.33, 0.22], [0.29, 0.25], [0.26, 0.29], [0.22, 0.36], [0.19, 0.45]] },
      { kind: 'forest', closed: true, points: ell(0.27, 0.34, 0.05, 0.04, 14, 0.25, 6) },
      { kind: 'forest', closed: true, points: ell(0.6, 0.39, 0.05, 0.04, 14, 0.25, 7) },
      { kind: 'forest', closed: true, points: ell(0.35, 0.95, 0.05, 0.035, 14, 0.25, 8) },
      { kind: 'desert', closed: true, points: ell(0.45, 0.24, 0.06, 0.1, 14, 0.2, 9) },
      { kind: 'desert', closed: true, points: ell(0.24, 0.84, 0.05, 0.03, 12, 0.2, 10) },
    ],
    labels: [
      { text: 'The Sword Coast', x: 0.1, y: 0.5, size: 1, kind: 'region', angle: -80 },
      { text: 'Sea of Fallen Stars', x: 0.62, y: 0.555, size: 1.2, kind: 'sea' },
      { text: 'Trackless Sea', x: 0.04, y: 0.3, size: 1.2, kind: 'sea', angle: -80 },
      { text: 'Anauroch', x: 0.45, y: 0.2, size: 1, kind: 'region' },
      { text: 'The Shining South', x: 0.6, y: 0.78, size: 1, kind: 'region' },
      { text: 'The North', x: 0.25, y: 0.18, size: 1.1, kind: 'region' },
      { text: 'Unapproachable East', x: 0.86, y: 0.38, size: 0.9, kind: 'region' },
    ],
    places: {},
  };
}
