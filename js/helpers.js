// helpers.js
// Small utility functions that use p5 globals. Depends on: nothing.

// Pick a random element from an array
function randomFrom(arr) {
  return arr[Math.floor(random(arr.length))];
}

// Set fill from a color array [r,g,b] or [r,g,b,a]
function setFill(col, alpha) {
  if (alpha !== undefined) fill(col[0], col[1], col[2], alpha);
  else if (col.length === 4) fill(col[0], col[1], col[2], col[3]);
  else fill(col[0], col[1], col[2]);
}

// Set stroke from a color array
function setStroke(col, alpha) {
  if (alpha !== undefined) stroke(col[0], col[1], col[2], alpha);
  else if (col.length === 4) stroke(col[0], col[1], col[2], col[3]);
  else stroke(col[0], col[1], col[2]);
}

// Draw a soft glow circle (layered transparent ellipses)
function drawGlow(x, y, radius, col, layers) {
  noStroke();
  for (let i = layers; i > 0; i--) {
    let r = radius * (i / layers);
    let a = mapClamp(i, layers, 1, 6, 62);
    setFill(col, a);
    ellipse(x, y, r * 2, r * 2);
  }
}

// Rotate around a pivot point
function rotateAround(px, py, fn) {
  push();
  translate(px, py);
  fn();
  pop();
}
