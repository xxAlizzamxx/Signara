/**
 * gestureDetect
 *
 * Stable 3-gesture classifier with two-step GRACIAS detection.
 *
 *   GRACIAS   hand near face + stable in x/y + forward z motion (NOT z-dominant)
 *   HOLA      horizontal wave, x clearly dominates
 *   AYUDA     vertical movement, y clearly dominates (strict, fallback)
 *
 * The two-step rule for GRACIAS solves the previous failure mode where the
 * gesture rarely fired (z-dominance was too strict because z values are
 * small after smoothing). Now GRACIAS only requires:
 *   - hand high in the frame (near face)
 *   - x and y stable (so we know the user isn't waving or AYUDA-ing)
 *   - any noticeable forward z motion above GRACIAS_DZ_MIN
 *
 * AYUDA gets a higher threshold + larger dominance ratio so it doesn't
 * keep firing on incidental head-bob-style motion.
 *
 * Cascade order: GRACIAS -> HOLA -> AYUDA. First match wins.
 */

export const HISTORY_LEN = 14    // ~470ms at 30fps
export const COOLDOWN_MS  = 2000

// GRACIAS
const NEAR_FACE_Y_MAX  = 0.55   // wrist must be in upper half of frame
const STABLE_XY_MAX    = 0.08   // x/y must vary less than this
const GRACIAS_DZ_MIN   = 0.05   // forward z motion required

// HOLA
const HOLA_DX_MIN      = 0.20
const HOLA_DOMINANCE   = 2.5

// AYUDA - raised to combat false positives
const AYUDA_DY_MIN     = 0.25   // was 0.22
const AYUDA_DOMINANCE  = 3.0    // was 2.5

function avg(arr) {
  let s = 0
  for (const v of arr) s += v
  return s / arr.length
}

function rangeOf(arr) {
  let mn = Infinity, mx = -Infinity
  for (const v of arr) { if (v < mn) mn = v; if (v > mx) mx = v }
  return mx - mn
}

/** 3-point centred moving average. Suppresses single-frame jitter. */
function smooth(arr, k = 3) {
  if (arr.length < 3 || k < 2) return arr.slice()
  const out = new Array(arr.length)
  const half = Math.floor(k / 2)
  for (let i = 0; i < arr.length; i++) {
    let s = 0, n = 0
    for (let j = i - half; j <= i + half; j++) {
      if (j >= 0 && j < arr.length) { s += arr[j]; n++ }
    }
    out[i] = s / n
  }
  return out
}

/** Count direction reversals in a 1-D series, ignoring sub-eps wobble. */
function countReversals(arr, eps) {
  if (arr.length < 3) return 0
  let count = 0
  let prev = 0
  for (let i = 1; i < arr.length; i++) {
    const d = arr[i] - arr[i - 1]
    if (Math.abs(d) < eps) continue
    const dir = d > 0 ? 1 : -1
    if (prev !== 0 && dir !== prev) count++
    prev = dir
  }
  return count
}

function clamp(v) { return Math.min(0.99, Math.max(0.5, v)) }

/**
 * @param {Array<{x:number,y:number,z:number}>} buf
 * @returns {{ sign:string, text:string, confidence:number } | null}
 */
export function detectGesture(buf) {
  if (!buf || buf.length < HISTORY_LEN) return null

  const xs = smooth(buf.map(p => p.x))
  const ys = smooth(buf.map(p => p.y))
  const zs = smooth(buf.map(p => p.z))

  const moveX = rangeOf(xs)
  const moveY = rangeOf(ys)
  const moveZ = rangeOf(zs)
  const meanY = avg(ys)

  // Debug instrumentation - inspect in DevTools console
  console.log('[detectGesture] moveX=', moveX.toFixed(3),
              'moveY=', moveY.toFixed(3),
              'moveZ=', moveZ.toFixed(3),
              'meanY=', meanY.toFixed(3))

  // ---------- 1. GRACIAS (two-step) ----------------------------------------
  // Step 1: hand is near the upper area of the frame AND is stable.
  // Step 2: there is forward motion on the z axis.
  const nearFace = meanY < NEAR_FACE_Y_MAX
  const stable   = moveX < STABLE_XY_MAX && moveY < STABLE_XY_MAX
  if (nearFace && stable && moveZ > GRACIAS_DZ_MIN) {
    return { sign: 'GRACIAS', text: 'Gracias', confidence: clamp(0.6 + moveZ * 2) }
  }

  // ---------- 2. HOLA (x-dominant horizontal wave) -------------------------
  if (
    moveX >= HOLA_DX_MIN &&
    moveX >= moveY * HOLA_DOMINANCE &&
    moveX >= moveZ * HOLA_DOMINANCE &&
    countReversals(xs, 0.010) >= 1
  ) {
    return { sign: 'HOLA', text: 'Hola', confidence: clamp(0.6 + moveX) }
  }

  // ---------- 3. AYUDA (y-dominant vertical, strict) -----------------------
  if (
    moveY >= AYUDA_DY_MIN &&
    moveY >= moveX * AYUDA_DOMINANCE &&
    moveY >= moveZ * AYUDA_DOMINANCE &&
    countReversals(ys, 0.010) >= 1
  ) {
    return { sign: 'AYUDA', text: 'Ayuda', confidence: clamp(0.6 + moveY) }
  }

  return null
}
