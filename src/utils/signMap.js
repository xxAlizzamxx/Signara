/**
 * signMap
 * Mapping of canonical sign tokens (uppercase, no accents) to a video clip URL.
 *
 * Videos live in per-avatar folders under /videos/. Each avatar has its own
 * set of clips (same filenames). The active avatar can be changed at runtime
 * with setCurrentAvatar(id) and getSignSrc() will resolve the video path
 * accordingly.
 *
 *   /videos/videos_avatar/...........  -> Alex      (default)
 *   /videos/videos_avatar_hombre/....  -> Anuar
 *   /videos/videos_avatar_mujer/.....  -> Grace
 *
 * If a sign is missing from SIGN_FILES, AvatarPlayer falls back to its
 * placeholder so the demo never breaks.
 */
<<<<<<< HEAD

export const AVATARS = [
  {
    id: 'alex',
    name: 'Alex',
    folder: '/videos/videos_avatar',
    image: '/avatars/avatar.png'
  },
  {
    id: 'anuar',
    name: 'Anuar',
    folder: '/videos/videos_avatar_hombre',
    image: '/avatars/avatar_hombre.png'
  },
  {
    id: 'grace',
    name: 'Grace',
    folder: '/videos/videos_avatar_mujer',
    image: '/avatars/avatar_mujer.png'
  }
]

// Filenames available for every avatar. New signs go here.
const SIGN_FILES = {
  HOLA: 'hola.mp4',
  COMO_ESTAS: 'como_estas.mp4',
  GRACIAS: 'gracias.mp4',
  POR_FAVOR: 'por_favor.mp4',
  TENGO_SED: 'tengo_sed.mp4',
  TE_AMO: 'te_amo.mp4'
}

let currentAvatarId = 'alex'

/** Returns the active avatar descriptor (id, name, folder, image). */
export function getCurrentAvatar() {
  return AVATARS.find((a) => a.id === currentAvatarId) || AVATARS[0]
}

/** Switch the active avatar by id. Unknown ids are ignored. */
export function setCurrentAvatar(id) {
  if (AVATARS.some((a) => a.id === id)) {
    currentAvatarId = id
  }
=======
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
  COMO_ESTAS: '/videos/como_estas.mp4',
  TENGO_SED: '/videos/tengo_sed.mp4',
  TE_AMO: '/videos/te_amo.mp4'
>>>>>>> 509c165b32aa8eb723ea41f159e12bcb5485fe9e
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
 * Returns the video URL for a sign in the active avatar's folder, or null
 * if the sign isn't mapped (caller can fall back).
 */
<<<<<<< HEAD
export function getSignSrc(sign) {
  const key = normalizeSign(sign)
  const file = SIGN_FILES[key]
  if (!file) return null
  const avatar = getCurrentAvatar()
  return `${avatar.folder}/${file}`
}

/**
 * Back-compat export: the previous signMap object. Kept so any external
 * callers that imported `signMap` directly still work. Resolves against the
 * currently-active avatar at access time via a Proxy.
 */
export const signMap = new Proxy(
  {},
  {
    get(_target, prop) {
      if (typeof prop !== 'string') return undefined
      return getSignSrc(prop)
    },
    has(_target, prop) {
      return typeof prop === 'string' && getSignSrc(prop) !== null
    },
    ownKeys() {
      return Object.keys(SIGN_FILES)
    },
    getOwnPropertyDescriptor(_target, prop) {
      if (typeof prop !== 'string') return undefined
      const value = getSignSrc(prop)
      if (value === null) return undefined
      return { enumerable: true, configurable: true, value }
    }
  }
)
=======
export functi
>>>>>>> 509c165b32aa8eb723ea41f159e12bcb5485fe9e
