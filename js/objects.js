// objects.js
// Classes: Lily, StemLeaf, PollenParticle, Ripple, Fish
// Depends on: colorSettings.js, easing.js, helpers.js

class Lily {
  // Each lily is a single flower on a curved stem, rooted at (x, groundY).
  constructor(x, groundY, options = {}) {
    // --- Position & structure ---
    this.baseX = x;                       // root x (fixed to the ground)
    this.baseY = groundY;                 // root y (the ground/water line)
    this.stemHeight = options.stemHeight || random(130, 220);  // how tall the stem grows (px)
    this.petalSet = options.petalSet || randomFrom(COLORS.petalSets); // [base, highlight, shadow] RGB arrays
    this.petalCount = options.petalCount || (random(1) > 0.4 ? 6 : 5); // 5 or 6 petals
    this.petalSize = options.petalSize || random(28, 46);  // radius of the fully-bloomed flower head

    // --- Wind response ---
    // windPhase offsets each lily's sine wave so they don't all peak at the same moment.
    // windSpeed controls how fast that sine oscillates — wider range = more variety between lilies.
    this.windPhase = random(TWO_PI);      // random start position in the sway cycle
    this.windSpeed = random(0.4, 1.3);    // oscillation rate multiplier (lower = lazier sway)

    // --- Bloom animation ---
    this.bloomT = 0;                      // 0 = tight bud, 1 = fully open; increases each frame
    this.bloomSpeed = random(0.003, 0.007); // how fast this lily opens (varies per flower)

    // --- Sway tuning ---
    // swayAmt: how far (px) the flower head moves when wind is at full strength.
    // idleSway: a small constant sway so lilies gently breathe even in dead calm.
    // windLag: per-lily easing coefficient — smaller = slower to react to gusts.
    // localWind: this lily's own smoothed copy of the global windStrength.
    this.swayAmt = random(10, 22);        // wind-driven sway amplitude (px)
    this.idleSway = random(2, 5);         // calm-air sway amplitude (px)
    this.windLag = random(0.15, 0.45);  // easing rate toward global wind (per frame)
    this.localWind = 0.5;                   // smoothed wind value (starts calm)

    // --- Runtime state ---
    this.headOffsetX = 0;                 // current horizontal displacement of flower head
    this.headOffsetY = 0;                 // current vertical droop (always >= 0)
    this.leaves = this._buildLeaves();    // StemLeaf instances attached along the stem
    this.depth = options.depth || random(0.5, 1.0); // layering: smaller = farther back
  }

  // Returns the (x, y) position of the flower head after wind sway.
  // The 0.85 multiplier on X so the flower doesn't outrun its own stem visually.
  getHeadPosition() {
    return {
      x: this.baseX + this.headOffsetX * 0.85,
      y: this.baseY - this.stemHeight + this.headOffsetY,
    };
  }

  // Collision radius used during layout to prevent lilies from overlapping.
  // Grows as the flower blooms open; floor of 0.45 ensures even buds have spacing.
  getCollisionRadius(bloomOverride) {
    let bloom = bloomOverride === undefined
      ? max(0.45, easeOut(this.bloomT))
      : bloomOverride;
    return this.petalSize * bloom * 0.95 + 14;
  }

  // Creates 2-3 StemLeaf instances scattered along the stem.
  // Each leaf alternates sides (left/right) for a balanced look.
  _buildLeaves() {
    let arr = [];
    let n = floor(random(2, 4));
    for (let i = 0; i < n; i++) {
      let t = random(0.3, 0.75); // 0=stem base, 1=stem tip — leaves sit in the middle zone
      let side = i % 2 === 0 ? 1 : -1;
      arr.push(new StemLeaf(t, side, random(35, 72), random(8, 16)));
    }
    return arr;
  }

  // The motion has two layers:
  //   1. "idle" — a gentle sway that's always present (even with zero wind).
  //   2. "wind" — a larger sway scaled by this lily's smoothed wind value.

  update(windStrength, t) {
    // Bloom: flower gradually opens from bud to full bloom, then stops at 1.
    this.bloomT = min(1, this.bloomT + this.bloomSpeed);

    // Smooth this lily's wind toward the global windStrength at its own pace.
    // Low windLag (0.015) = slow, dreamy reaction; high (0.045) = quicker response.
    this.localWind += (windStrength - this.localWind) * this.windLag;

    // organicSway returns roughly -1 to 1 using layered sine waves,
    let organic = organicSway(t, this.windPhase, this.windSpeed);

    let idle = organic * this.idleSway;                 // always-on gentle breathing (2-5 px)
    let wind = organic * this.localWind * this.swayAmt; // wind-driven push (up to ~22 px)
    let sway = idle + wind;

    this.headOffsetX = sway;              // horizontal displacement of flower head
    this.headOffsetY = abs(sway) * 0.18;  // vertical droop — the harder the push, the more it bows
  }

  draw(t) {
    let head = this.getHeadPosition();
    let stemTipX = head.x;
    let stemTipY = head.y;

    // Draw stem
    this._drawStem(stemTipX, stemTipY);

    // Draw leaves along stem
    for (let lf of this.leaves) {
      lf.draw(this.baseX, this.baseY, stemTipX, stemTipY,
               this.stemHeight, this.headOffsetX, t);
    }

    // Draw flower head
    this._drawFlower(stemTipX, stemTipY, t);
  }

  _drawStem(tipX, tipY) {
    // Shadow stem
    noFill();
    setStroke(COLORS.stemDark, 40);
    strokeWeight(4);
    beginShape();
    vertex(this.baseX + 2, this.baseY);
    bezierVertex(
      this.baseX + 2, this.baseY - this.stemHeight * 0.4,
      tipX + this.headOffsetX * 0.1 + 2, tipY + this.stemHeight * 0.3,
      tipX + 2, tipY
    );
    endShape();

    // Main stem gradient: two strokes
    setStroke(COLORS.stemLight, 200);
    strokeWeight(3);
    beginShape();
    vertex(this.baseX, this.baseY);
    bezierVertex(
      this.baseX, this.baseY - this.stemHeight * 0.4,
      tipX + this.headOffsetX * 0.1, tipY + this.stemHeight * 0.3,
      tipX, tipY
    );
    endShape();

    setStroke(COLORS.stemDark, 120);
    strokeWeight(1.5);
    beginShape();
    vertex(this.baseX - 1, this.baseY);
    bezierVertex(
      this.baseX - 1, this.baseY - this.stemHeight * 0.4,
      tipX + this.headOffsetX * 0.1 - 1, tipY + this.stemHeight * 0.3,
      tipX - 1, tipY
    );
    endShape();
  }

  _drawFlower(cx, cy, t) {
    let bloom = easeOut(this.bloomT);
    let outerR = this.petalSize * bloom;
    let innerR = outerR * 0.42;
    let angleStep = TWO_PI / this.petalCount;

    // Outer petals
    for (let i = 0; i < this.petalCount; i++) {
      let angle = angleStep * i + t * 0.08 + this.windPhase * 0.05;
      let px = cx + cos(angle) * outerR * 0.55;
      let py = cy + sin(angle) * outerR * 0.55;

      // Petal shadow
      setFill(this.petalSet[2], 60);
      noStroke();
      this._drawPetal(px + 1.5, py + 2, angle, outerR * 0.9, outerR * 0.38);

      // Petal main
      setFill(this.petalSet[0], 230);
      this._drawPetal(px, py, angle, outerR, outerR * 0.4);

      // Petal highlight
      setFill(this.petalSet[1], 140);
      this._drawPetal(px - cos(angle)*2, py - sin(angle)*2, angle, outerR * 0.6, outerR * 0.22);
    }

    // Inner petals (slightly rotated)
    if (bloom > 0.5) {
      let innerBloom = mapClamp(bloom, 0.5, 1, 0, 1);
      for (let i = 0; i < this.petalCount; i++) {
        let angle = angleStep * i + angleStep * 0.5 + t * 0.08 + this.windPhase * 0.05;
        let px = cx + cos(angle) * innerR * 0.6;
        let py = cy + sin(angle) * innerR * 0.6;
        setFill(this.petalSet[1], 180 * innerBloom);
        noStroke();
        this._drawPetal(px, py, angle, innerR * innerBloom, innerR * 0.38 * innerBloom);
      }
    }

    // Center glow
    drawGlow(cx, cy, outerR * 0.32 * bloom, COLORS.stamens[0], 5);

    // Stamens
    if (bloom > 0.6) {
      let stamenBloom = mapClamp(bloom, 0.6, 1, 0, 1);
      for (let i = 0; i < this.petalCount * 2; i++) {
        let a = (TWO_PI / (this.petalCount * 2)) * i + t * 0.12;
        let sr = outerR * 0.22 * stamenBloom;
        let sx = cx + cos(a) * sr;
        let sy = cy + sin(a) * sr;
        setStroke(COLORS.stamens[1], 180 * stamenBloom);
        strokeWeight(1);
        setFill(COLORS.stamens[0], 220 * stamenBloom);
        line(cx, cy, sx, sy);
        noStroke();
        ellipse(sx, sy, 4 * stamenBloom, 4 * stamenBloom);
      }
    }

    // Pistil center
    noStroke();
    setFill(COLORS.pistil, 200 * bloom);
    ellipse(cx, cy, outerR * 0.18 * bloom, outerR * 0.18 * bloom);
  }

  _drawPetal(cx, cy, angle, len, wid) {
    push();
    translate(cx, cy);
    rotate(angle);
    beginShape();
    vertex(0, 0);
    bezierVertex(wid, -len * 0.3, wid * 0.8, -len * 0.8, 0, -len);
    bezierVertex(-wid * 0.8, -len * 0.8, -wid, -len * 0.3, 0, 0);
    endShape(CLOSE);
    // Chalk edge: powdery crumble along petal boundary
    drawChalkEdge(len, wid, [255, 255, 255], 0.55);
    pop();
  }
}

class StemLeaf {
  constructor(stemT, side, len, wid) {
    this.stemT = stemT;   // 0=base, 1=tip
    this.side = side;     // 1=right, -1=left
    this.len = len;
    this.wid = wid;
    this.windPhase = random(TWO_PI);
  }

  draw(baseX, baseY, tipX, tipY, stemH, headOffsetX, t) {
    // Position along the bezier approximation
    let tx = lerp(baseX, tipX, this.stemT);
    let ty = lerp(baseY, tipY, this.stemT);

    // Leaf sway follows stem but less
    let sway = organicSway(t, this.windPhase, 0.9) * headOffsetX * 0.3;
    // Angle leaf upward along the stem with a slight outward tilt
    let leafAngle = this.side * 0.45 + sway * 0.015; // radians, with sway influence

    push();
    translate(tx, ty);
    rotate(leafAngle);

    // Leaf shadow
    setFill(COLORS.leafDark, 40);
    noStroke();
    this._drawLeafShape(2, 2, this.len, this.wid);

    // Leaf body
    setFill(COLORS.leafLight, 200);
    this._drawLeafShape(0, 0, this.len, this.wid);

    // Leaf vein
    setStroke(COLORS.leafVein, 80);
    strokeWeight(0.8);
    noFill();
    line(0, 0, 0, -this.len * 0.85);

    // Chalk grain stippled over leaf surface
    drawLeafGrain(this.len, this.wid, COLORS.leafLight, 0.6);

    pop();
  }

  _drawLeafShape(ox, oy, len, wid) {
    beginShape();
    vertex(ox, oy);
    bezierVertex(ox + wid, oy - len * 0.3, ox + wid * 0.6, oy - len * 0.8, ox, oy - len);
    bezierVertex(ox - wid * 0.6, oy - len * 0.8, ox - wid, oy - len * 0.3, ox, oy);
    endShape(CLOSE);
  }
}


class PollenParticle {
  constructor(canvasW, canvasH) {
    this.w = canvasW;
    this.h = canvasH;
    this.reset(true);
  }

  reset(initial) {
    this.x = random(this.w);
    this.y = initial ? random(this.h) : random(-20, -5);
    this.size = random(2, 5);
    this.vy = random(0.15, 0.6);
    this.vx = random(-0.3, 0.3);
    this.wobblePhase = random(TWO_PI);
    this.wobbleSpeed = random(0.01, 0.03);
    this.alpha = random(60, 160);
    this.col = random(1) > 0.5 ? COLORS.pollen : COLORS.dustLight;
  }

  update(windStrength, t) {
    this.wobblePhase += this.wobbleSpeed;
    this.x += this.vx + sin(this.wobblePhase) * 0.4 + windStrength * 0.8;
    this.y += this.vy - abs(sin(this.wobblePhase * 0.5)) * 0.15;
    if (this.y > this.h + 10 || this.x < -10 || this.x > this.w + 10) this.reset(false);
  }

  draw() {
    noStroke();
    // soft glow
    setFill(this.col, this.alpha * 0.3);
    ellipse(this.x, this.y, this.size * 2.2, this.size * 2.2);
    setFill(this.col, this.alpha);
    ellipse(this.x, this.y, this.size * 0.8, this.size * 0.8);
  }
}


class Fish {
  constructor(canvasW, canvasH, groundY) {
    this.w = canvasW;
    this.h = canvasH;
    this.groundY = groundY;
    this.size = random(30, 52);
    this.dir = random(1) > 0.5 ? 1 : -1;
    this.x = random(this.w * 0.05, this.w * 0.95);
    this.y = groundY + random((canvasH - groundY) * 0.24, (canvasH - groundY) * 0.72);
    this.vx = random(0.25, 0.65) * this.dir;
    this.targetY = this.y;
    this.wobblePhase = random(TWO_PI);
    this.wobbleSpeed = random(0.02, 0.04);
    this.tailPhase = random(TWO_PI);
    this.alpha = random(120, 190);
    this.wobbleSeed = random(1000);
  }

  getCollisionRadius() {
    return this.size * 0.44;
  }

  draw() {
    let bodyLen = this.size;
    let bodyWid = this.size * 0.42;
    let tailSwing = sin(this.tailPhase) * 4.5;

    let bodyPts = [
      [bodyLen * 0.64, 0],            // nose (right-most point)
      [bodyLen * 0.28, -bodyWid * 0.96],  // top-front curve
      [-bodyLen * 0.34, -bodyWid * 0.58], // top-rear curve
      [-bodyLen * 0.42, 0],               // tail junction (left-most point)
      [-bodyLen * 0.34, bodyWid * 0.58],  // bottom-rear curve
      [bodyLen * 0.28, bodyWid * 0.96],   // bottom-front curve
    ];

    let tailPts = [
      [-bodyLen * 0.3, 0],                          // base where tail meets body
      [-bodyLen * 0.7, -bodyWid * 0.95 + tailSwing], // top fork tip
      [-bodyLen * 0.86, 0],                           // tail center notch
      [-bodyLen * 0.7, bodyWid * 0.95 + tailSwing],  // bottom fork tip
    ];

    let topFinPts = [
      // x for fin width and y for fin length, with some asymmetry for a more dynamic shape
      [-bodyLen * 0.04, -bodyWid * 0.78], // left base of fin
      [bodyLen * 0.14, -bodyWid * 1.25], // top tip of fin
      [bodyLen * 0.26, -bodyWid * 0.74], // right base of fin
    ];

    let botFinPts = [
      [-bodyLen * 0.02, bodyWid * 0.74], // left base of fin
      [bodyLen * 0.14, bodyWid * 1.08], // bottom tip of fin
      [bodyLen * 0.26, bodyWid * 0.72], // right base of fin
    ];

    let bandA = [                              // front stripe (nearest head)
      [bodyLen * 0.14, -bodyWid * 0.9],        // top-left corner
      [bodyLen * 0.26, -bodyWid * 0.72],        // top-right corner
      [bodyLen * 0.18, bodyWid * 0.72],         // bottom-right corner
      [bodyLen * 0.06, bodyWid * 0.9],          // bottom-left corner
    ];

    let bandB = [                              // middle stripe
      [-bodyLen * 0.1, -bodyWid * 0.78],        // top-left corner
      [bodyLen * 0.02, -bodyWid * 0.62],        // top-right corner
      [-bodyLen * 0.08, bodyWid * 0.62],        // bottom-right corner
      [-bodyLen * 0.2, bodyWid * 0.78],         // bottom-left corner
    ];

    let bandC = [                              // rear stripe (nearest tail)
      [-bodyLen * 0.28, -bodyWid * 0.56],       // top-left corner
      [-bodyLen * 0.17, -bodyWid * 0.44],       // top-right corner
      [-bodyLen * 0.28, bodyWid * 0.44],        // bottom-right corner
      [-bodyLen * 0.38, bodyWid * 0.56],        // bottom-left corner
    ];

    let gillPts = [                            // gill arc (open path, not closed)
      [bodyLen * 0.1, -bodyWid * 0.54],         // top of gill curve
      [bodyLen * 0.03, -bodyWid * 0.16],        // mid-point near center
      [bodyLen * 0.08, bodyWid * 0.4],          // bottom of gill curve
    ];

    push();
    translate(this.x, this.y);
    scale(this.dir, 1);

    noStroke();
    setFill(COLORS.fishBody, this.alpha * 0.9);
    beginShape();
    for (let p of bodyPts) vertex(p[0], p[1]);
    endShape(CLOSE);
    drawFishChalkFill(bodyLen * 0.04, 0, bodyLen * 0.52, bodyWid * 0.74, COLORS.fishLight, 0.85, this.wobbleSeed);

    setFill(COLORS.fishBand, this.alpha * 0.86);
    beginShape();
    for (let p of bandA) vertex(p[0], p[1]);
    endShape(CLOSE);
    beginShape();
    for (let p of bandB) vertex(p[0], p[1]);
    endShape(CLOSE);
    beginShape();
    for (let p of bandC) vertex(p[0], p[1]);
    endShape(CLOSE);
    drawFishBandTexture(bandA, COLORS.fishBand, 0.7, this.wobbleSeed + 40);
    drawFishBandTexture(bandB, COLORS.fishBand, 0.7, this.wobbleSeed + 80);
    drawFishBandTexture(bandC, COLORS.fishBand, 0.7, this.wobbleSeed + 120);

    setFill(COLORS.fishFin, this.alpha * 0.88);
    beginShape();
    for (let p of tailPts) vertex(p[0], p[1]);
    endShape(CLOSE);
    beginShape();
    for (let p of topFinPts) vertex(p[0], p[1]);
    endShape(CLOSE);
    beginShape();
    for (let p of botFinPts) vertex(p[0], p[1]);
    endShape(CLOSE);

    drawFishChalkContour(bodyPts, COLORS.fishOutline, 0.75, this.wobbleSeed);
    drawFishChalkContour(tailPts, COLORS.fishOutline, 0.7, this.wobbleSeed + 140);
    drawFishChalkContour(topFinPts, COLORS.fishOutline, 0.65, this.wobbleSeed + 180);
    drawFishChalkContour(botFinPts, COLORS.fishOutline, 0.65, this.wobbleSeed + 220);
    drawFishChalkContour(gillPts, COLORS.fishOutline, 0.55, this.wobbleSeed + 260);

    noStroke();
    setFill(COLORS.fishEye, this.alpha * 0.88);
    ellipse(bodyLen * 0.34, -bodyWid * 0.12, this.size * 0.12, this.size * 0.12);
    setFill([255, 255, 255], this.alpha * 0.72);
    ellipse(bodyLen * 0.37, -bodyWid * 0.15, this.size * 0.035, this.size * 0.035);

    pop();
  }
}

class Ripple {
  constructor(x, y, isClick) {
    this.x = x;
    this.y = y;
    this.isClick = !!isClick;
    this.r = isClick ? random(3, 6) : 2;
    this.maxR = isClick ? random(50, 110) : random(20, 50);
    this.life = 1;
    this.speed = isClick ? random(0.004, 0.009) : random(0.006, 0.014);
    this.weight = isClick ? random(1.2, 2.0) : 0.8;
  }

  update() {
    this.r += this.isClick ? 0.9 : 0.6;
    this.life -= this.speed;
  }

  draw() {
    let a = this.life * (this.isClick ? 120 : 60);
    setStroke(COLORS.ripple, a);
    strokeWeight(this.weight * this.life);
    noFill();
    ellipse(this.x, this.y, this.r * 2, this.r * 0.45);
    // Click ripples get a subtle inner ring for more depth
    if (this.isClick && this.r > 12) {
      setStroke(COLORS.ripple, a * 0.4);
      strokeWeight(this.weight * this.life * 0.5);
      ellipse(this.x, this.y, this.r * 1.2, this.r * 0.28);
    }
  }

  isDead() { return this.life <= 0 || this.r > this.maxR; }
}
