// drawer.js
// Scene-level drawing routines. Keeps sketch.js clean.
// Depends on: colorSettings.js, helpers.js, easing.js

function drawSky(w, h) {
  // Layered gradient sky using horizontal lines
  let skyBottom = h * GROUND_Y_RATIO;
  for (let y = 0; y < skyBottom; y++) {
    let t = y / skyBottom;
    let col;
    if (t < 0.5) {
      col = lerpRgb(COLORS.skyTop, COLORS.skyMid, t * 2);
    } else {
      col = lerpRgb(COLORS.skyMid, COLORS.skyBot, (t - 0.5) * 2);
    }
    stroke(col[0], col[1], col[2]);
    strokeWeight(1);
    line(0, y, w, y);
  }
}

function drawMoonPhase(w, h, t) {
  // Moon centered in the upper sky with a soft pastel look
  let cx = w * 0.5;
  let cy = h * 0.28;
  let r = min(w, h) * 0.085;
  let moonCol = COLORS.skyMoon;
  let haloCol = lerpRgb(COLORS.skyMoon, COLORS.skyTop, 0.7);
  let grainScale = (typeof TEXTURE_SETTINGS !== 'undefined')
    ? constrain(TEXTURE_SETTINGS.chalkGrain ?? 1, 0.2, 2.5)
    : 1;

  drawGlow(cx, cy, r * 2.6, haloCol, 10);

  // Base moon disc
  setFill(moonCol, 230);
  noStroke();
  ellipse(cx, cy, r * 2, r * 2);

  // Pastel stipple inside the moon so it feels chalky/papered
  strokeWeight(1);
  for (let y = -r; y <= r; y += 2.5) {
    for (let x = -r; x <= r; x += 2.5) {
      if (x * x + y * y <= r * r) {
        let n = noise((cx + x) * 0.07, (cy + y) * 0.07, t * 0.04);
        if (n > (0.5 - grainScale * 0.07)) {
          let a = map(n, 0.35, 1, 6, 34 * grainScale);
          setStroke([245, 240, 232], a);
          point(cx + x, cy + y);
        }
      }
    }
  }

  // Phase cycle by intersecting circles (waxing/waning limb).
  // Push the shadow fully off-disc at the extremes so the cycle includes
  // a true full moon, and center it mid-cycle for a true new moon.
  let phase = (sin(t * 0.5) + 1) * 0.5; // 0..1
  let shadowOffset = map(phase, 0, 1, r * 2.2, -r * 2.2);
  let shadowCol = lerpRgb(COLORS.skyTop, COLORS.skyMid, 0.65);

  if (abs(shadowOffset) < r * 2.05) {
    noStroke();
    setFill(shadowCol, 250);
    ellipse(cx + shadowOffset, cy, r * 2.06, r * 2.06);

    // Slightly emphasize the circle-intersection edge
    setFill(shadowCol, 85);
    ellipse(cx + shadowOffset * 1.02, cy, r * 2.0, r * 2.0);
  }

  // Chalky moon rim texture — border color tinted toward groundFog for atmospheric haze
  let fogBorderCol = lerpRgb(moonCol, COLORS.groundFog, 0.55);
  drawChalkCircleBorder(cx, cy, r, fogBorderCol, 0.6, t);

  // Aura sky reference blends skyTop with groundFog so the moon dissolves into the same mist as the ground
  let fogSkyCol = lerpRgb(COLORS.skyTop, COLORS.groundFog, 0.4);
  drawMoonAura(cx, cy, r, moonCol, fogSkyCol, 1.05, t);
}

function drawGround(w, h, groundY) {
  // Soft ground / water surface
  noStroke();

  // Water base
  for (let y = groundY; y < h; y++) {
    let t = (y - groundY) / (h - groundY);
    let col = lerpRgb(COLORS.groundFog, [195, 215, 210], t);
    stroke(col[0], col[1], col[2], 210);
    strokeWeight(1);
    line(0, y, w, y);
  }

  // Mist layer at horizon
  for (let i = 0; i < 6; i++) {
    let my = groundY - 10 + i * 8;
    let a = mapClamp(i, 0, 6, 80, 0);
    setFill(COLORS.mistLight, a);
    noStroke();
    rect(0, my, w, 12);
  }

  // Ground fog ellipses
  for (let x = 0; x < w; x += 80) {
    setFill(COLORS.mistLight, 30);
    noStroke();
    ellipse(x + 40, groundY + 4, 160, 28);
  }
}

function drawMist(w, h, groundY, t) {
  // Drifting mist wisps
  noStroke();
  let mistPositions = [0.1, 0.3, 0.55, 0.75, 0.9];
  for (let i = 0; i < mistPositions.length; i++) {
    let x = mistPositions[i] * w + sin(t * 0.2 + i) * 18;
    let y = groundY - 5 + cos(t * 0.15 + i * 1.3) * 6;
    let a = 18 + sin(t * 0.3 + i) * 8;
    setFill(COLORS.mistLight, a);
    ellipse(x, y, 180, 22);
    ellipse(x + 30, y + 6, 120, 14);
  }
}

function drawWaterReflections(lilies, w, groundY, t) {
  // Soft blurred reflections in the water
  for (let lily of lilies) {
    let rx = lily.baseX + lily.headOffsetX * 0.3;
    let ry = groundY + (groundY - (lily.baseY - lily.stemHeight)) * 0.25;
    let bloom = easeOut(lily.bloomT);
    let s = lily.petalSize * bloom * 0.5;
    let col = lily.petalSet[0];

    // Wavy reflection distortion
    for (let j = 0; j < 3; j++) {
      let wave = sin(t * 1.2 + j * 1.1 + rx * 0.02) * 3;
      setFill(col, 18 - j * 4);
      noStroke();
      ellipse(rx + wave, ry + j * 4, s * 2.5, s * 0.6);
    }
  }
}

function drawVignette(w, h) {
  // Radial vignette using drawingContext gradient
  let ctx = drawingContext;
  let grad = ctx.createRadialGradient(w/2, h/2, h * 0.15, w/2, h/2, h * 0.85);
  grad.addColorStop(0, 'rgba(255,248,245,0)');
  grad.addColorStop(0.6, 'rgba(240,230,235,0.06)');
  grad.addColorStop(1, 'rgba(200,190,205,0.1)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function drawDreamOverlay(w, h) {
  // Very subtle warm light bleed from top
  let ctx = drawingContext;
  let grad = ctx.createLinearGradient(0, 0, 0, h * 0.35);
  grad.addColorStop(0, 'rgba(255,245,235,0.12)');
  grad.addColorStop(1, 'rgba(255,245,235,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}
