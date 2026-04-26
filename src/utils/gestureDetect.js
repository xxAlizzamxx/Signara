/**
 * gestureDetect
 *
 * Simple, stable 3-gesture classifier.
 *
 *   GRACIAS   z-dominant + hand near face + x/y stable
 *   HOLA      x-dominant + minimum amplitude
 *   AYUDA     y-dominant + minimum amplitude
 *
 * Per spec: dominance ratio 1.3 (much more lenient than before so AYUDA
 * actually fires), amplitude threshold 0.18, plus a noise gate.
 *
 * Cascade order: GRACIAS -> HOLA -> AYUDA.
 */

export const HISTORY_LEN = 12    // ~400ms at 30fps
export const COOLDOWN_MS  = 2000

const NOISE_MAX = 0.05

const NEAR_FACE_Y_MAX = 0.55
const STABLE_XY_MAX   = 0.08
const GRACIAS_DZ_MIN  = 0.05

const HOLA_DX_MIN     = 0.18
const AYUDA_DY_MIN    = 0.18
const DOMINANCE_RATIO = 1.3

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

function clamp(v) { return Math.min(0.99, Math.max(0.5, v)) }

/**
 * @param {Array<{x:number,y:number,z:number}>} buf
 * @returns {{ sign:string, text:string, confidence:number } | null}
 */
export function detectGesture(buf) {
  if (!buf || buf.length < HISTORY_LEN) return null

  const xs = buf.map(p => p.x)
  const ys = buf.map(p => p.y)
  const zs = buf.map(p => p.z)

  const moveX = rangeOf(xs)
  const moveY = rangeOf(ys)
  const moveZ = rangeOf(zs)
  const meanY = avg(ys)

  console.log('moveX:', moveX.toFixed(3),
              'moveY:', moveY.toFixed(3),
              'moveZ:', moveZ.toFixed(3),
              'meanY:', meanY.toFixed(3))

  // Noise gate
  if (moveX < NOISE_MAX && moveY < NOISE_MAX && moveZ < NOISE_MAX) {
    return null
  }

  // 1. GRACIAS - z dominant + face area + x/y stable
  if (
    moveZ > moveX && moveZ > moveY &&
    moveZ > GRACIAS_DZ_MIN &&
    meanY < NEAR_FACE_Y_MAX &&
    moveX < STABLE_XY_MAX &&
    moveY < STABLE_XY_MAX
  ) {
    return { sign: 'GRACIAS', text: 'Gracias', confidence: clamp(0.6 + moveZ * 2) }
  }

  // 2. HOLA - x dominant
  if (
    moveX > moveY &&
    moveX > HOLA_DX_MIN &&
    moveX > moveY * DOMINANCE_RATIO
  ) {
    return { sign: 'HOLA', text: 'Hola', confidence: clamp(0.6 + moveX) }
  }

  // 3. AYUDA - y dominant
  if (
    moveY > moveX &&
    moveY > AYUDA_DY_MIN &&
    moveY > moveX * DOMINANCE_RATIO
  ) {
    return { sign: 'AYUDA', text: 'Ayuda', confidence: clamp(0.6 + moveY) }
  }

  return null
}
