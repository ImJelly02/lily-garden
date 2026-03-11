// easing.js
// Pure math functions for smooth animation. No dependencies.

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeIn(t) {
  return t * t * t;
}

// Smooth sine-based oscillation, returns -1 to 1
function smoothWave(t, freq, phase) {
  return Math.sin(t * freq + phase);
}

// Layered noise-like sway: combines two sine waves for organic feel
function organicSway(t, phase, speed) {
  return (
    Math.sin(t * speed + phase) * 0.6 +
    Math.sin(t * speed * 1.7 + phase * 1.3) * 0.3 +
    Math.sin(t * speed * 0.4 + phase * 0.7) * 0.1
  );
}

// Maps a value from [inLo, inHi] to [outLo, outHi], clamped
function mapClamp(val, inLo, inHi, outLo, outHi) {
  let t = Math.max(0, Math.min(1, (val - inLo) / (inHi - inLo)));
  return outLo + t * (outHi - outLo);
}

// Exponential catch-up toward a target value.
function approach(current, target, ease) {
  return current + (target - current) * ease;
}

// Smooth 0-1-0 oscillation from a sine wave.
function softPulse(t, freq, phase) {
  return (Math.sin(t * freq + phase) + 1) * 0.5;
}
