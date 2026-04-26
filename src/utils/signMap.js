/**
 * signMap
 * Mapping of canonical sign tokens (uppercase, no accents) to a video URL.
 * Paths stay relative to the site root - getSignSrc() resolves them to
 * absolute URLs at call time so they work under any deployment.
 *
 * If a sign is missing from the map, AvatarPlayer falls back to a
 * fingerspelling placeholder so the demo never breaks.
 */
export const signMap = {
  HOLA: '/videos/hola.mp4',
  ADIOS: '/videos/adios.mp4',
  GRACIAS: '/videos/gracias.mp4',
  POR_FAVOR: '/videos/por_favor.mp4',
  YO: '/videos/yo.mp4',
  TU: '/videos/tu.mp4',
  NECESITAR: '/videos/necesitar.mp4',
  AYUDA: '/videos/ayuda.mp4',
  URGENTE: '/videos/urgente.mp4',
  AGUA: '/videos/agua.mp4',
  COMIDA: '/videos/comida.mp4',
  CASA: '/videos/casa.mp4',
  AMIGO: '/videos/amigo.mp4',
  FAMILIA: '/videos/familia.mp4',
  AMOR: '/videos/amor.mp4',
  FELIZ: '/videos/feliz.mp4',
  TRISTE: '/videos/triste.mp4',
  SI: '/videos/si.mp4',
  NO: '/videos/no.mp4',
  BIEN: '/videos/bien.mp4',
  MAL: '/videos/mal.mp4',
  HOY: '/videos/hoy.mp4',
  MANANA: '/videos/manana.mp4',
  NOMBRE: '/videos/nombre.mp4',
  COMO_ESTAS: '/videos/como_estas.mp4'
}

/**
 * normalizeSign
 * Convert a free-form word to the canonical sign key:
 *  - uppercase
 *  - strip accents
 *  - replace spaces with underscores
 */
export function normalizeSign(word) {
  return String(word)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, '_')
    .trim()
}

/**
 * getSignSrc
 * Returns the absolute video URL for a sign, or null if unmapped.
 *
 * Resolves relative paths against window.location.origin so deployments
 * at sub-paths (Vercel preview URLs, embedded iframes, etc.) still load
 * the right asset.
 */
export function getSignSrc(sign) {
  const path = signMap[normalizeSign(sign)]
  if (!path) return null
  try {
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      return new URL(path, window.location.origin).href
    }
  } catch (_) {}
  return path
}
