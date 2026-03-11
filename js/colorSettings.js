// colorSettings.js
// All color data and palette definitions. No dependencies.

const COLORS = {
  // Sky & atmosphere
  skyTop:    [210, 225, 245],
  skyMid:    [230, 215, 235],
  skyBot:    [245, 230, 220],
  skyMoon:   [255, 243, 197],


  // Ground & water
  groundFog: [220, 235, 225],
  mistLight: [255, 252, 248],

  // Lily petals — soft blush/lavender/cream
  petalSets: [
    [[255, 210, 220], [255, 190, 205], [245, 170, 195]],  // blush rose
    [[230, 210, 250], [215, 195, 245], [200, 180, 240]],  // soft lavender
    [[255, 235, 210], [250, 220, 195], [240, 205, 180]],  // warm peach
    [[210, 240, 230], [195, 230, 220], [180, 215, 210]],  // pale jade
  ],

  // Lily center
  stamens:   [[255, 230, 120], [245, 215, 100], [240, 200, 90]],
  pistil:    [220, 180, 80],

  // Stems & leaves
  stemDark:  [100, 140, 110],
  stemLight: [140, 185, 145],
  leafDark:  [90,  130, 100],
  leafLight: [150, 195, 155],
  leafVein:  [120, 165, 130],

  // Pollen / floating particles
  pollen:    [255, 240, 160],
  dustLight: [255, 250, 235],

  // Fish
  fishBody:    [246, 198, 28],
  fishBand:    [239, 128, 32],
  fishLight:   [255, 228, 120],
  fishFin:     [250, 206, 42],
  fishOutline: [95, 58, 26],
  fishEye:     [44, 34, 28],

  // Ripple on water
  ripple:    [180, 210, 230],
};

// Global texture controls
// chalkGrain: ~0.7 subtler, 1.0 balanced, ~1.35 stronger
const TEXTURE_SETTINGS = {
  chalkGrain: 1.35,
};

// Helper: get a color with alpha as a p5 array [r,g,b,a]
function withAlpha(col, alpha) {
  return [col[0], col[1], col[2], alpha];
}

// Helper: lerp between two RGB arrays
function lerpRgb(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}
