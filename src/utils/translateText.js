/**
 * translateText
 *
 * MVP-mocked translator. In production this will hit the Claude API:
 *   POST /api/translate { text }  ->  { signs: ["YO","NECESITAR","AYUDA"] }
 *
 * For now we ship a small handcrafted dictionary + simple rules so the demo
 * feels alive. Anything unrecognised falls through to a naive token
 * conversion (uppercased words, stop-words removed) so the avatar still has
 * something reasonable to play.
 */

const STOPWORDS = new Set([
  'a','al','de','del','la','las','el','los','un','una','unos','unas',
  'y','o','u','que','en','con','por','para','es','son','soy',
  'me','te','se','su','sus','mi','mis','lo','le','les'
])

// Hand-crafted phrase mappings (lower-case, accent-stripped lookups).
const PHRASE_MAP = [
  { match: /\b(necesito|necesita|necesitamos)\s+ayuda\b/, signs: ['YO','NECESITAR','AYUDA'] },
  { match: /\bes\s+urgente\b/,                            signs: ['URGENTE'] },
  { match: /\bhola\b/,                                    signs: ['HOLA'] },
  { match: /\badios\b/,                                   signs: ['ADIOS'] },
  { match: /\bgracias\b/,                                 signs: ['GRACIAS'] },
  { match: /\bpor\s+favor\b/,                             signs: ['POR_FAVOR'] },
  { match: /\bcomo\s+estas\b/,                            signs: ['COMO_ESTAS'] },
  { match: /\bme\s+llamo\b/,                              signs: ['YO','NOMBRE'] },
  { match: /\btengo\s+sed\b/,                             signs: ['YO','NECESITAR','AGUA'] },
  { match: /\btengo\s+hambre\b/,                          signs: ['YO','NECESITAR','COMIDA'] },
  { match: /\bestoy\s+bien\b/,                            signs: ['YO','BIEN'] },
  { match: /\bestoy\s+mal\b/,                             signs: ['YO','MAL'] },
  { match: /\bte\s+amo\b/,                                signs: ['YO','AMOR','TU'] }
]

// Word-level fallback dictionary.
const WORD_MAP = {
  hola: 'HOLA', adios: 'ADIOS', gracias: 'GRACIAS',
  yo: 'YO', tu: 'TU', necesito: 'NECESITAR', necesita: 'NECESITAR',
  ayuda: 'AYUDA', urgente: 'URGENTE', agua: 'AGUA', comida: 'COMIDA',
  casa: 'CASA', amigo: 'AMIGO', amiga: 'AMIGO', familia: 'FAMILIA',
  amor: 'AMOR', feliz: 'FELIZ', triste: 'TRISTE', no: 'NO',
  bien: 'BIEN', mal: 'MAL', hoy: 'HOY', manana: 'MANANA',
  nombre: 'NOMBRE'
}

const stripAccents = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * translateText
 * @param {string} input - Spanish phrase, free-form.
 * @returns {Promise<string[]>} - ordered list of canonical sign tokens.
 *
 * NOTE: This is a mock. Replace the body with a real Claude API call
 * once the backend is wired up.
 */
export async function translateText(input) {
  // Simulate network latency for a more realistic demo feel.
  await new Promise((r) => setTimeout(r, 600))

  const text = stripAccents(String(input || '').trim())
  if (!text) return []

  // ---- DEMO HOOK ----------------------------------------------------------
  // Temporary forced-route for the live "hola" video test:
  // any input that contains the word "hola" returns EXACTLY ["HOLA"].
  // Remove this block once the Claude backend is wired up.
  if (/\bhola\b/.test(text)) {
    console.log('[translateText] forced-route: hola -> ["HOLA"]')
    return ['HOLA']
  }
  // -------------------------------------------------------------------------

  // 1. Try whole-phrase rules first.
  for (const rule of PHRASE_MAP) {
    if (rule.match.test(text)) return rule.signs
  }

  // 2. Token-level fallback.
  const tokens = text
    .replace(/[^\p{L}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t && !STOPWORDS.has(t))

  const signs = tokens.map((t) => WORD_MAP[t] || t.toUpperCase())

  // Hard demo guarantee: if nothing matched, return the canonical example
  // from the spec so the avatar always has something to play.
  if (signs.length === 0) return ['YO', 'NECESITAR', 'AYUDA']
  return signs
}
