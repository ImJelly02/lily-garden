// sketch.js
// Main p5.js entry point. Orchestrates the scene.
// Depends on: colorSettings.js, easing.js, helpers.js, objects.js, drawer.js

let lilies = [];
let pollenParticles = [];
let fish = [];
let ripples = [];

let t = 0;              // global time counter
let windStrength = 0;   // current wind (-1 to 1)
let windTarget = 0;     // wind we're easing toward
let windChangeTimer = 0;

const GROUND_Y_RATIO = 0.72;
const NUM_POLLEN = 68;
const NUM_FISH = 10;
const LILY_OVERLAP_MARGIN = 18;
const FISH_OVERLAP_MARGIN = 14;
const FISH_SURFACE_MARGIN = 28;

// Estimates how much space one lily needs based on petalSize
function lilyLayoutRadius(pos) {
  return pos.petalSize * 0.95 + 14;
}

// Compares distance between two lilies to see if they would visually overlap given their stem height and petal size
function lilyLayoutsOverlap(a, b, groundY) {
  let ay = groundY - a.stemHeight;
  let by = groundY - b.stemHeight;
  let minDist = lilyLayoutRadius(a) + lilyLayoutRadius(b) + LILY_OVERLAP_MARGIN;
  return dist(a.x, ay, b.x, by) < minDist;
}

function isLilyPositionClear(candidate, positions, groundY) {
  for (let existing of positions) {
    if (lilyLayoutsOverlap(candidate, existing, groundY)) return false;
  }
  return true;
}

function fishCollisionRadius(f) {
  return typeof f.getCollisionRadius === 'function' ? f.getCollisionRadius() : f.size * 0.44;
}

function shallowLilyBandY(groundY) {
  return groundY + 52;
}

function isFishPositionClear(candidate, school, lilies, groundY, ignoreFish) {
  let radius = fishCollisionRadius(candidate);

  for (let other of school) {
    if (other === ignoreFish) continue;
    let minDist = radius + fishCollisionRadius(other) + FISH_OVERLAP_MARGIN;
    if (dist(candidate.x, candidate.y, other.x, other.y) < minDist) return false;
  }

  let lilyBandY = shallowLilyBandY(groundY);
  for (let lily of lilies) {
    let minDist = radius + FISH_SURFACE_MARGIN;
    if (dist(candidate.x, candidate.y, lily.baseX, lilyBandY) < minDist) return false;
  }

  return true;
}

function placeFishSafely(f, w, h, groundY, school, lilies, fromEdge) {
  let waterDepth = h - groundY;
  let swimTop = groundY + waterDepth * 0.2;
  let swimBottom = groundY + waterDepth * 0.78;

  for (let attempt = 0; attempt < 40; attempt++) {
    if (fromEdge === 'left') f.x = random(-120, -50);
    else if (fromEdge === 'right') f.x = random(w + 50, w + 120);
    else f.x = random(w * 0.05, w * 0.95);

    f.y = random(swimTop, swimBottom);
    f.targetY = f.y;
    if (isFishPositionClear(f, school, lilies, groundY, f)) return;
  }

  f.x = constrain(f.x, -120, w + 120);
  f.y = constrain(f.y, swimTop, swimBottom);
  f.targetY = f.y;
}

function steerFishAwayFromObstacles(f, school, lilies, groundY, swimTop, swimBottom) {
  let pushX = 0;
  let pushY = 0;
  let radius = fishCollisionRadius(f);

  for (let other of school) {
    if (other === f) continue;
    let dx = f.x - other.x;
    let dy = f.y - other.y;
    let d = sqrt(dx * dx + dy * dy) || 0.0001;
    let minDist = radius + fishCollisionRadius(other) + FISH_OVERLAP_MARGIN;
    if (d >= minDist) continue;

    let strength = (minDist - d) / minDist;
    pushX += (dx / d) * strength * 1.2;
    pushY += (dy / d) * strength * 0.9;
  }

  let lilyBandY = shallowLilyBandY(groundY);
  for (let lily of lilies) {
    let dx = f.x - lily.baseX;
    let dy = f.y - lilyBandY;
    let d = sqrt(dx * dx + dy * dy) || 0.0001;
    let minDist = radius + FISH_SURFACE_MARGIN;
    if (d >= minDist) continue;

    let strength = (minDist - d) / minDist;
    pushX += (dx / d) * strength * 1.4;
    pushY += abs(dy / d) * strength * 1.1;
  }

  if (pushX !== 0 || pushY !== 0) {
    f.x += pushX;
    f.y = constrain(f.y + pushY, swimTop, swimBottom);
    f.targetY = constrain(f.targetY + pushY * 6, swimTop, swimBottom);
  }
}

function buildFishSchool(count, w, h, groundY, lilies) {
  let arr = [];
  for (let i = 0; i < count; i++) {
    let swimmer = new Fish(w, h, groundY);
    placeFishSafely(swimmer, w, h, groundY, arr, lilies, null);
    arr.push(swimmer);
  }
  return arr;
}

function updateFishMotion(f, school, lilies, windStrength, t, groundY, w, h) {
  let waterDepth = h - groundY;
  let swimTop = groundY + waterDepth * 0.2;
  let swimBottom = groundY + waterDepth * 0.78;

  f.wobblePhase += f.wobbleSpeed;
  f.tailPhase += 0.08;
  f.x += f.vx + windStrength * 0.15;

  if (f.targetY === undefined) f.targetY = f.y;
  if (abs(f.y - f.targetY) < 3) {
    f.targetY = random(swimTop, swimBottom);
  }
  f.y = approach(f.y, f.targetY, 0.012) + smoothWave(t, 1, f.wobblePhase) * 0.18;
  f.y = constrain(f.y, swimTop, swimBottom);
  steerFishAwayFromObstacles(f, school, lilies, groundY, swimTop, swimBottom);

  if (f.dir > 0 && f.x > w + 120) {
    placeFishSafely(f, w, h, groundY, school, lilies, 'left');
  } else if (f.dir < 0 && f.x < -120) {
    placeFishSafely(f, w, h, groundY, school, lilies, 'right');
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  colorMode(RGB);
  noSmooth();

  initTexture(width, height); // build static paper grain

  let groundY = height * GROUND_Y_RATIO;

  // Place lilies at varied positions and depths
  let positions = buildLilyPositions(width, groundY);
  for (let pos of positions) {
    lilies.push(new Lily(pos.x, groundY, {
      stemHeight: pos.stemHeight,
      petalSet: randomFrom(COLORS.petalSets),
      petalSize: pos.petalSize,
      depth: pos.depth,
    }));
  }

  // Sort by depth so far lilies draw behind near lilies
  lilies.sort((a, b) => a.depth - b.depth);

  // Pollen
  for (let i = 0; i < NUM_POLLEN; i++) {
    pollenParticles.push(new PollenParticle(width, height));
  }

  // Fish
  fish = buildFishSchool(NUM_FISH, width, height, groundY, lilies);
}

function buildLilyPositions(w, groundY) {
  // Creates a natural, non-uniform arrangement of lilies clusters
  let positions = [];
  let clusters = [
    // a cluster on the left side of the canvas, around 18% across the width
    // e.g., cx = 1000 * 0.18 = 180, spread = 80, 
    // then each lily in this cluster can appear between x = 100 and x = 260
    { cx: w * 0.18, spread: 80, count: 5 },
    { cx: w * 0.30, spread: 40, count: 2 },
    { cx: w * 0.42, spread: 60, count: 2 },
    { cx: w * 0.50, spread: 90, count: 2 },
    { cx: w * 0.62, spread: 70, count: 2 },
    { cx: w * 0.82, spread: 70, count: 2 }
  ];

  for (let cl of clusters) {
    for (let i = 0; i < cl.count; i++) {
      let candidate = null;

      for (let attempt = 0; attempt < 36; attempt++) {
        let depth = random(0.4, 1.0);
        let proposal = {
          x: constrain(cl.cx + random(-cl.spread, cl.spread), w * 0.08, w * 0.92),
          stemHeight: random(110, 230) * depth,
          petalSize: random(24, 48) * depth,
          depth: depth,
        };

        if (isLilyPositionClear(proposal, positions, groundY)) {
          candidate = proposal;
          break;
        }
      }

      if (!candidate) {
        let fallbackDepth = random(0.45, 0.95);
        candidate = {
          x: constrain(map(positions.length + 1, 0, 12, w * 0.12, w * 0.88), w * 0.08, w * 0.92),
          stemHeight: random(110, 230) * fallbackDepth,
          petalSize: random(24, 48) * fallbackDepth,
          depth: fallbackDepth,
        };
      }

      positions.push(candidate);
    }
  }
  return positions;
}

function draw() {
  t += 0.016;

  // Update wind
  windChangeTimer -= deltaTime;
  if (windChangeTimer <= 0) {
    windTarget = random(-1, 1) * random(0.4, 1.0);
    windChangeTimer = random(2000, 5000);
  }
  windStrength += (windTarget - windStrength) * 0.02;

  let groundY = height * GROUND_Y_RATIO;

  // --- Draw scene layers ---
  drawSky(width, height);
  drawMoonPhase(width, height, t);
  drawGround(width, height, groundY);
  drawWaterReflections(lilies, width, groundY, t);

  // Fish in the water
  for (let f of fish) {
    updateFishMotion(f, fish, lilies, windStrength, t, groundY, width, height);
    f.draw();
  }

  drawMist(width, height, groundY, t);

  // Update & draw lilies (back to front via depth sort)
  for (let lily of lilies) {
    lily.update(windStrength, t);
    lily.draw(t);
  }

  // Ripples on water surface
  updateAndDrawRipples();

  // Pollen
  for (let p of pollenParticles) {
    p.update(windStrength, t);
    p.draw();
  }

  // Post-processing overlays
  drawSkyChalk(width, height, 0.55);  // soft chalk strokes in sky
  drawDreamOverlay(width, height);
  drawVignette(width, height);
  applyGlobalTexture(width, height, 0.52); // paper grain over everything

  // Occasionally spawn ripples
  if (frameCount % 90 === 0) {
    ripples.push(new Ripple(random(width * 0.1, width * 0.9), groundY + random(5, 30)));
  }
}

function updateAndDrawRipples() {
  for (let i = ripples.length - 1; i >= 0; i--) {
    let r = ripples[i];
    r.update();
    if (r.isDead()) {
      ripples.splice(i, 1);
      continue;
    }
    r.draw();
  }
}

// Click spawns extra ripples and a gust of wind
function mousePressed() {
  let groundY = height * GROUND_Y_RATIO;

  // Only spawn ripples when clicking on or near the water surface
  if (mouseY > groundY - 10) {
    // Main ripple cluster right where the user clicked
    for (let i = 0; i < 4; i++) {
      ripples.push(new Ripple(
        mouseX + random(-12, 12),
        max(mouseY, groundY) + random(-5, 15),
        true // click ripple — larger & more visible
      ));
    }
    // A couple of ambient ripples nearby for a spreading effect
    for (let i = 0; i < 2; i++) {
      ripples.push(new Ripple(
        mouseX + random(-80, 80),
        groundY + random(5, 40)
      ));
    }
  }

  windTarget = random(1) > 0.5 ? random(0.6, 1.2) : random(-1.2, -0.6);
  windStrength = windTarget * 0.5; // instant gust on click
  windChangeTimer = 3000;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  // Rebuild the scene for new dimensions
  lilies = [];
  ripples = [];
  fish = [];
  let groundY = height * GROUND_Y_RATIO;
  let positions = buildLilyPositions(width, groundY);
  for (let pos of positions) {
    lilies.push(new Lily(pos.x, groundY, {
      stemHeight: pos.stemHeight,
      petalSet: randomFrom(COLORS.petalSets),
      petalSize: pos.petalSize,
      depth: pos.depth,
    }));
  }
  lilies.sort((a, b) => a.depth - b.depth);

  fish = buildFishSchool(NUM_FISH, width, height, groundY, lilies);
}
