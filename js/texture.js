// texture.js
// Pastel chalk & grain texture system.
// Simulates the powdery, fibrous surface of soft pastel on textured paper.
// Depends on: helpers.js, easing.js

let _grainCanvas = null;   // static off-screen grain layer (paper texture)
let _scratchCanvas = null; // reusable scratch buffer for chalk edges

function _grainScale() {
  if (typeof TEXTURE_SETTINGS === 'undefined') return 1;
  return constrain(TEXTURE_SETTINGS.chalkGrain ?? 1, 0.2, 2.5);
}

// ── Initialise ────────────────────────────────────────────────────────────────
// Call once in setup() after createCanvas().
function initTexture(w, h) {
  _grainCanvas  = createGraphics(w, h);
  _scratchCanvas = createGraphics(w, h);
  _buildPaperGrain(w, h);
}

// Builds a static grain layer that mimics cold-press pastel paper.
// Real pastel paper has a "tooth" -- tiny raised fibres that catch pigment.
function _buildPaperGrain(w, h) {
  _grainCanvas.noSmooth();
  _grainCanvas.loadPixels();

  let d = _grainCanvas.pixelDensity();
  let pw = w * d;
  let ph = h * d;

  for (let y = 0; y < ph; y++) {
    for (let x = 0; x < pw; x++) {
      let idx = (x + y * pw) * 4;

      // Multi-frequency noise for paper tooth
      // High-freq = fine grit, low-freq = broad paper texture undulation
      let fine   = _fbmNoise(x * 0.85, y * 0.85, 3) * 2 - 1; // -1 to 1
      let coarse = _fbmNoise(x * 0.12, y * 0.12, 2) * 2 - 1;
      let grain  = fine * 0.72 + coarse * 0.28;

      // Darker grain = pigment caught in valleys; lighter = peaks
      let bright = grain > 0
        ? map(grain,  0,  1, 0,  38)   // highlight peaks lightly
        : map(grain, -1,  0, -52, 0);  // shadow valleys more strongly

      // Occasional single-pixel "fibre" flecks
      let fleck = random() < 0.004 ? random(-30, 30) : 0;

      let val = bright + fleck;
      let alpha = abs(val) * 1.1; // transparency proportional to strength

      if (val > 0) {
        // Light grain (paper peak showing through)
        _grainCanvas.pixels[idx]     = 255;
        _grainCanvas.pixels[idx + 1] = 248;
        _grainCanvas.pixels[idx + 2] = 240;
      } else {
        // Dark grain (pigment shadow / valley)
        _grainCanvas.pixels[idx]     = 60;
        _grainCanvas.pixels[idx + 1] = 45;
        _grainCanvas.pixels[idx + 2] = 55;
      }
      _grainCanvas.pixels[idx + 3] = constrain(alpha, 0, 255);
    }
  }

  _grainCanvas.updatePixels();
}

// ── Fractional Brownian Motion noise (pure JS, no p5 noise dependency) ────────
function _fbmNoise(x, y, octaves) {
  let val = 0, amp = 0.5, freq = 1, max = 0;
  for (let i = 0; i < octaves; i++) {
    val += noise(x * freq, y * freq) * amp;
    max += amp;
    amp  *= 0.5;
    freq *= 2.1;
  }
  return val / max; // normalised 0-1
}

function _pointInPoly(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    let xi = points[i][0], yi = points[i][1];
    let xj = points[j][0], yj = points[j][1];
    let intersects = ((yi > y) !== (yj > y))
      && (x < (xj - xi) * (y - yi) / ((yj - yi) || 0.00001) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}

// ── Global paper grain overlay ────────────────────────────────────────────────
// Call at the very end of draw() to lay the paper texture over everything.
// intensity: 0-1, where 0.45-0.65 gives a medium pastel feel.
function applyGlobalTexture(w, h, intensity) {
  if (!_grainCanvas) return;
  let alpha = map(intensity * _grainScale(), 0, 1, 0, 255);
  tint(255, alpha);
  image(_grainCanvas, 0, 0, w, h);
  noTint();
}

// ── Chalk petal edge ──────────────────────────────────────────────────────────
// Draws a crumbling, powdery edge around a petal shape.
// Call inside push()/pop() right after drawing the petal fill.
// cx, cy: petal tip anchor (already translated/rotated in petal context)
// len, wid: petal dimensions  col: [r,g,b]  strength: 0-1
function drawChalkEdge(len, wid, col, strength) {
  let s = strength * _grainScale();
  if (s <= 0) return;

  let steps = 28;
  noFill();

  // Outer crumble: scattered dots along petal silhouette
  for (let i = 0; i <= steps; i++) {
    let tVal = i / steps;
    let side = tVal < 0.5 ? 1 : -1;
    let t2   = tVal < 0.5 ? tVal * 2 : (tVal - 0.5) * 2;

    // Approximate petal edge using cubic bezier evaluation
    let ex =  side * wid * sin(t2 * PI) * 0.9;
    let ey = -len * (3 * t2 * t2 - 2 * t2 * t2 * t2); // smoothstep curve

    // Scatter: real pastel crumbles at edges
    let scatter = noise(ex * 0.3, ey * 0.3, tVal * 4) * 6 * s;
    let ox = ex + random(-scatter, scatter);
    let oy = ey + random(-scatter, scatter);

    // Vary opacity: heavier where pigment builds up (mid-petal edge)
    let edgeWeight = sin(t2 * PI);
    let a = edgeWeight * s * 80;

    setStroke(col, a);
    strokeWeight(random(0.4, 1.8));
    point(ox, oy);
  }

  // Inner soft bleed: pastel smears slightly inward
  for (let i = 0; i < 14; i++) {
    let tVal = random();
    let side = random() < 0.5 ? 1 : -1;
    let ex   =  side * wid * sin(tVal * PI) * random(0.5, 1.0);
    let ey   = -len  * (3 * tVal * tVal - 2 * tVal * tVal * tVal);

    let inset = random(2, 8) * s;
    let ix = ex * (1 - inset / (wid + 1));
    let iy = ey + inset * 0.5;

    let a = s * random(15, 45);
    setFill(col, a);
    noStroke();
    ellipse(ix, iy, random(1, 3.5), random(1, 3.5));
  }
}

// ── Leaf chalk grain ──────────────────────────────────────────────────────────
// Stipples a pastel grain over a leaf shape.
// Call inside the leaf's push()/pop() after drawing the leaf body.
function drawLeafGrain(len, wid, col, strength) {
  let s = strength * _grainScale();
  if (s <= 0) return;
  noStroke();
  let dots = floor(30 * s);
  for (let i = 0; i < dots; i++) {
    // Random point inside rough leaf bounds
    let t   = random(0.05, 0.95);
    let hw  = wid * sin(t * PI) * random(0.1, 0.9);
    let lx  = random(-hw, hw);
    let ly  = -len * t;
    let a   = noise(lx * 0.4, ly * 0.4) * s * 60;
    setFill(col, a);
    ellipse(lx, ly, random(1, 3), random(1, 3));
  }
}

// Geometric fish fill with pastel grain.
// Call inside the fish push()/pop() after drawing the base body color.
function drawFishChalkFill(cx, cy, hw, hh, col, strength, seed) {
  let s = strength * _grainScale();
  if (s <= 0) return;

  noStroke();
  let dots = floor(hw * hh * 0.22 * s);
  for (let i = 0; i < dots; i++) {
    let ax = random(-hw, hw);
    let ay = random(-hh, hh);
    if ((ax * ax) / (hw * hw) + (ay * ay) / (hh * hh) > 1) continue;
    let n = noise((cx + ax) * 0.08 + seed, (cy + ay) * 0.08, 140);
    if (n < 0.32) continue;
    let a = map(n, 0.32, 1, 10, 42) * s;
    setFill(col, a);
    ellipse(cx + ax + random(-0.35, 0.35), cy + ay + random(-0.35, 0.35), random(1.0, 2.6), random(1.0, 2.6));
  }
}

// Powdery contour used on fish polygons and short edges.
function drawFishChalkContour(points, col, strength, seed) {
  let s = strength * _grainScale();
  if (s <= 0 || points.length < 2) return;

  noFill();
  for (let i = 0; i < points.length; i++) {
    let p1 = points[i];
    let p2 = points[(i + 1) % points.length];
    let steps = max(6, floor(dist(p1[0], p1[1], p2[0], p2[1]) / 3));
    for (let j = 0; j <= steps; j++) {
      let t = j / steps;
      let x = lerp(p1[0], p2[0], t);
      let y = lerp(p1[1], p2[1], t);
      let n = noise(x * 0.12 + seed, y * 0.12, 260);
      if (n < 0.34) continue;
      setStroke(col, map(n, 0.34, 1, 12, 42) * s);
      strokeWeight(random(0.7, 1.8));
      point(x + random(-0.45, 0.45), y + random(-0.45, 0.45));
    }
  }
}

// Dusty fish band texture so stripes feel chalked in, not flat fills.
function drawFishBandTexture(points, col, strength, seed) {
  let s = strength * _grainScale();
  if (s <= 0) return;

  noStroke();
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let p of points) {
    minX = min(minX, p[0]);
    maxX = max(maxX, p[0]);
    minY = min(minY, p[1]);
    maxY = max(maxY, p[1]);
  }

  let dots = floor((maxX - minX) * (maxY - minY) * 0.11 * s);
  for (let i = 0; i < dots; i++) {
    let x = random(minX, maxX);
    let y = random(minY, maxY);
    if (!_pointInPoly(x, y, points)) continue;
    let n = noise(x * 0.1 + seed, y * 0.1, 320);
    if (n < 0.35) continue;
    setFill(col, map(n, 0.35, 1, 8, 32) * s);
    ellipse(x + random(-0.3, 0.3), y + random(-0.3, 0.3), random(0.8, 2.2), random(0.8, 2.2));
  }
}

// ── Sky chalk wash ────────────────────────────────────────────────────────────
// Adds horizontal pastel stroke marks to the sky, like soft side-strokes.
function drawSkyChalk(w, h, strength) {
  let s = strength * _grainScale();
  if (s <= 0) return;
  let lines = 18;
  noFill();
  for (let i = 0; i < lines; i++) {
    let y    = random(h * 0.02, h * 0.65);
    let xOff = random(-30, 30);
    let ww   = random(w * 0.3, w * 0.9);
    let x0   = random(-20, w - ww + 20);
    let a    = random(4, 16) * s;
    let col  = random() < 0.5 ? [230, 220, 240] : [245, 235, 225];
    setStroke(col, a);
    strokeWeight(random(8, 28));
    line(x0 + xOff, y, x0 + xOff + ww, y + random(-3, 3));
  }
}


// ── Chalky circular border ──────────────────────────────────────────────────────────── 
// cx, cy: center, r: radius, col: [r,g,b], strength: 0-1
// Soft halo around the moon to break the hard silhouette into the sky.
// Uses dense, low-alpha dust points with slight temporal drift.
function drawMoonAura(cx, cy, r, moonCol, skyCol, strength, t) {
  let s = strength * _grainScale();
  if (s <= 0) return;

  let points = floor(1800 * s);
  let auraCol = lerpRgb(moonCol, skyCol, 0.58);

  noStroke();
  for (let i = 0; i < points; i++) {
    let a = random(TWO_PI);
    let band = random();
    let dist = r + map(Math.pow(band, 1.5), 0, 1, -3.5, r * 0.9);

    let x = cx + cos(a) * dist;
    let y = cy + sin(a) * dist;

    // Position-based noise — creates particle clusters instead of smooth bands
    let n = noise(x * 0.06, y * 0.06, t * 0.04);

    // Threshold gate (like petal stipple): skip points in quiet noise zones
    let radialFade = 1 - constrain((dist - r) / (r * 0.85), 0, 1);
    let threshold = 0.38 + (1 - radialFade) * 0.25;
    if (n < threshold) continue;

    // Drift from position-based noise
    let driftX = map(noise(x * 0.03 + 90, y * 0.03 + 90, t * 0.08), 0, 1, -1.5, 1.5);
    let driftY = map(noise(x * 0.03 + 140, y * 0.03 + 140, t * 0.08), 0, 1, -1.5, 1.5);
    x += driftX;
    y += driftY;

    let alpha = radialFade * map(n, threshold, 1, 10, 48) * s;
    let size = random(0.8, 2.2) + radialFade * 1.2;
    let tintCol = lerpRgb(auraCol, moonCol, random(0.12, 0.38));

    setFill(tintCol, alpha);
    circle(x, y, size);
  }
}

function drawChalkCircleBorder(cx, cy, r, col, strength, t) {
  let s = strength * _grainScale();
  if (s <= 0) return;

  noFill();

  // Outer dusty scatter (denser + higher radial jitter for chalky broken rim)
  for (let a = 0; a < TWO_PI; a += 0.03) {
    let nx = cos(a) * 2.4;
    let ny = sin(a) * 2.4;
    let n = noise(nx + t * 0.24, ny + t * 0.24, 600);
    let rr = r + map(n, 0, 1, -4.2, 5.2) * s;
    let fade = map(noise(nx * 0.55 + 80, ny * 0.55 + 80, t * 0.12), 0, 1, 0.05, 1);
    let x = cx + cos(a) * rr;
    let y = cy + sin(a) * rr;
    setStroke(col, random(14, 46) * s * fade);
    strokeWeight(random(0.8, 1.8));
    point(x, y);

    // Occasional larger pigment crumbs, similar to dotted chalk deposits
    if (random() < 0.16 * fade) {
      noStroke();
      setFill(col, random(10, 28) * s * fade);
      circle(x + random(-0.8, 0.8), y + random(-0.8, 0.8), random(1.0, 2.8));
    }
  }

  // Inner soft bleed — powdery like petal chalk edge (filled ellipses, not hard points)
  noStroke();
  for (let a = 0; a < TWO_PI; a += 0.085) {
    let inset = random(0.6, 3.5) * s;
    let rr = r - inset;
    let fade = map(noise(cos(a) * 1.1 + 160, sin(a) * 1.1 + 160, t * 0.1), 0, 1, 0.3, 1);
    let x = cx + cos(a) * rr;
    let y = cy + sin(a) * rr;
    setFill([245, 240, 232], random(12, 32) * s * fade);
    ellipse(x, y, random(1, 3.5), random(1, 3.5));
  }
}
