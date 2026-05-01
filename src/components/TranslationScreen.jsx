import { useCallback, useRef, useState } from 'react'
import Logo from './Logo.jsx'
import AvatarPlayer from './AvatarPlayer.jsx'
import TextInputPanel from './TextInputPanel.jsx'
import SignChips from './SignChips.jsx'
import PersonalizeScreen from './PersonalizeScreen.jsx'
import { translateText } from '../utils/translateText.js'
import { getSignSrc, normalizeSign } from '../utils/signMap.js'

/**
 * TranslationScreen
 *
 * Coexisting playback paths:
 *   TYPED:  user submits text -> translateText() -> avatarRef.replace(signs)
 *   VOZ EN VIVO:
 *     interim word -> avatarRef.queue(word) (instant)
 *     final phrase -> translateText() polish + diff-queue any missing signs
 *
 * Includes a global "Limpiar" button that resets:
 *   - avatar (clear queue, stop video, hide both buffers)
 *   - voice  (stop mic, clear input, reset word tracker)
 *   - state  (chips, original text, active sign, busy, liveMode)
 */
export default function TranslationScreen({
  initialMode = 'text',
  avatarChoice: initialAvatarChoice = 'avatar',
  onAvatarChange,
  onBack,
  onHome
}) {
  const [originalText, setOriginalText] = useState('')
  const [signs, setSigns] = useState([])
  const [activeSign, setActiveSign] = useState(null)
  const [busy, setBusy] = useState(false)
  const [liveMode, setLiveMode] = useState(false)
  const [avatarChoice, setAvatarChoice] = useState(initialAvatarChoice)
  const [showPersonalize, setShowPersonalize] = useState(false)

  const avatarRef = useRef(null)
  const inputRef = useRef(null)
  const liveQueuedRef = useRef([])
  // Buffer for the previous live word so we can detect 2-word compound signs
  // in real time (p.ej. "tengo sed" -> TENGO_SED, "por favor" -> POR_FAVOR,
  // "te amo" -> TE_AMO, "como estas" -> COMO_ESTAS).
  const pendingWordRef = useRef('')

  // --- Reset helpers --------------------------------------------------------
  const resetVoice = useCallback(() => {
    if (inputRef.current) inputRef.current.clear()
  }, [])

  const resetAvatar = useCallback(() => {
    if (avatarRef.current) avatarRef.current.clear()
  }, [])

  const resetState = useCallback(() => {
    setOriginalText('')
    setSigns([])
    setActiveSign(null)
    setBusy(false)
    setLiveMode(false)
    liveQueuedRef.current = []
    pendingWordRef.current = ''
  }, [])

  const handleReset = useCallback(() => {
    console.log('[TranslationScreen] handleReset()')
    resetVoice()
    resetAvatar()
    resetState()
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
  }, [resetVoice, resetAvatar, resetState])

  // --- TYPED path -----------------------------------------------------------
  const handleSubmit = useCallback(async (text) => {
    setBusy(true)
    setOriginalText(text)
    setLiveMode(false)
    liveQueuedRef.current = []
    pendingWordRef.current = ''
    try {
      const result = await translateText(text)
      console.log('[TranslationScreen] translateText ->', result)
      setSigns(result)
      if (avatarRef.current) avatarRef.current.replace(result)
    } catch (e) {
      console.error('translateText failed:', e)
      setSigns([])
    } finally {
      setBusy(false)
    }
  }, [])

  // --- LIVE VOICE path ------------------------------------------------------
  // Para frases compuestas mantenemos pendingWordRef. Cuando llega una nueva
  // palabra:
  //   1. Probamos pendingWord + nueva  (ej: "tengo" + "sed" -> TENGO_SED).
  //      Si hay video, lo encolamos y limpiamos pending.
  //   2. Si no hay compuesto, probamos la palabra sola (ej: "hola" -> HOLA,
  //      "gracias" -> GRACIAS).
  //   3. Si no hay nada, guardamos la palabra como pending por si forma
  //      un compuesto con la siguiente.
  const handleLiveWord = useCallback((rawWord) => {
    const cleaned = String(rawWord || '').trim()
    if (!cleaned) return

    setLiveMode(true)
    setOriginalText((prev) => (prev ? prev + ' ' : '') + cleaned)

    const queueSign = (sign) => {
      setSigns((prev) => [...prev, sign])
      if (avatarRef.current) {
        avatarRef.current.queue(sign)
        liveQueuedRef.current.push(sign)
      }
    }

    // 1) Intento de seña compuesta con la palabra pendiente.
    if (pendingWordRef.current) {
      const compoundSign = normalizeSign(pendingWordRef.current + ' ' + cleaned)
      if (getSignSrc(compoundSign)) {
        console.log('LIVE WORD compound:', compoundSign)
        queueSign(compoundSign)
        pendingWordRef.current = ''
        return
      }
    }

    // 2) Intento de seña individual.
    const singleSign = normalizeSign(cleaned)
    if (getSignSrc(singleSign)) {
      console.log('LIVE WORD single:', singleSign)
      queueSign(singleSign)
      // La palabra actual también podría iniciar un compuesto, pero como ya
      // se reprodujo dejamos el buffer limpio para evitar duplicaciones.
      pendingWordRef.current = ''
      return
    }

    // 3) Sin coincidencia: guardamos la palabra por si forma un compuesto
    //    con la siguiente (ej: "tengo" -> espera "sed").
    pendingWordRef.current = cleaned
  }, [])

  const handleVoiceFinal = useCallback(async (text) => {
    if (!text) return
    try {
      const polished = await translateText(text)
      if (!polished || polished.length === 0) return
      setSigns(polished)

      const liveLeft = [...liveQueuedRef.current]
      for (const sign of polished) {
        const idx = liveLeft.indexOf(sign)
        if (idx !== -1) {
          liveLeft.splice(idx, 1)
          continue
        }
        if (avatarRef.current) avatarRef.current.queue(sign)
      }
    } catch (e) {
      console.warn('polish translateText failed:', e)
    } finally {
      liveQueuedRef.current = []
      pendingWordRef.current = ''
    }
  }, [])

  const handlePanelSubmit = useCallback((text) => {
    if (liveMode) handleVoiceFinal(text)
    else handleSubmit(text)
  }, [liveMode, handleVoiceFinal, handleSubmit])

  // --- Personalizar (vista interna del flujo Traducir) --------------------
  const handleOpenPersonalize = useCallback(() => {
    setShowPersonalize(true)
  }, [])

  const handleSavePersonalize = useCallback((choice) => {
    setAvatarChoice(choice)
    setShowPersonalize(false)
    if (onAvatarChange) onAvatarChange(choice)
  }, [onAvatarChange])

  if (showPersonalize) {
    return (
      <PersonalizeScreen
        initialChoice={avatarChoice}
        onBack={() => setShowPersonalize(false)}
        onHome={onHome}
        onSave={handleSavePersonalize}
      />
    )
  }

  let activeIndex = -1
  if (activeSign) {
    for (let i = signs.length - 1; i >= 0; i--) {
      if (signs[i] === activeSign) { activeIndex = i; break }
    }
  }

  return (
    <section className="min-h-screen flex flex-col px-4 sm:px-6 py-6 max-w-6xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="inline-flex items-center gap-2 text-white/85 hover:text-white text-sm font-medium">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Cambiar modo
        </button>

        <div className="flex items-center gap-2">
          <ResetButton onClick={handleReset} />
          <button onClick={onHome} className="flex item