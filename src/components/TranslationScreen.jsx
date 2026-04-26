import { useCallback, useRef, useState } from 'react'
import Logo from './Logo.jsx'
import AvatarPlayer from './AvatarPlayer.jsx'
import TextInputPanel from './TextInputPanel.jsx'
import SignChips from './SignChips.jsx'
import { translateText } from '../utils/translateText.js'
import { getSignSrc, normalizeSign } from '../utils/signMap.js'

/**
 * TranslationScreen
 *
 * Two coexisting playback paths:
 *   - TYPED:  user submits text -> translateText() -> avatarRef.replace(signs)
 *   - VOZ EN VIVO:
 *       1. Each new spoken word fires onLiveWord(word) -> we try to queue
 *          it directly to the avatar (single-word match in signMap).
 *       2. When the phrase finalises, translateText(text) runs and:
 *            a) replaces the chips with the polished sentence translation
 *            b) queues any polished sign that was NOT already streamed live
 *               (multi-word phrases like "como estas" -> "COMO_ESTAS",
 *               sentence rewrites like "necesito ayuda" -> "YO NECESITAR AYUDA")
 *
 *       This way every phrase plays SOMETHING - even "como estas" by itself
 *       (which has no individual word videos) gets caught by the polish step.
 */
export default function TranslationScreen({ initialMode = 'text', onBack, onHome }) {
  const [originalText, setOriginalText] = useState('')
  const [signs, setSigns] = useState([])         // chips display
  const [activeSign, setActiveSign] = useState(null)
  const [busy, setBusy] = useState(false)
  const [liveMode, setLiveMode] = useState(false)

  const avatarRef = useRef(null)
  // Track the signs we successfully queued from live-streaming for the
  // CURRENT phrase. Reset when the phrase finalises (after polish runs).
  const liveQueuedRef = useRef([])

  // --- TYPED path -----------------------------------------------------------
  const handleSubmit = useCallback(async (text) => {
    setBusy(true)
    setOriginalText(text)
    setLiveMode(false)
    liveQueuedRef.current = []
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
  const handleLiveWord = useCallback((rawWord) => {
    const sign = normalizeSign(rawWord)
    if (!sign) return
    setLiveMode(true)
    setSigns((prev) => [...prev, sign])
    setOriginalText((prev) => (prev ? prev + ' ' : '') + rawWord)

    // Only queue if we have a video for this exact sign. Track what we
    // streamed so we can diff against the polished translation later.
    if (getSignSrc(sign) && avatarRef.current) {
      avatarRef.current.queue(sign)
      liveQueuedRef.current.push(sign)
      console.log('[TranslationScreen] live-queued:', sign,
        ' so far:', liveQueuedRef.current)
    } else {
      console.log('[TranslationScreen] live word', sign, 'has no direct video, waiting for polish')
    }
  }, [])

  // Final phrase from voice -> run translateText for full-sentence correction,
  // update chips, and queue any signs the live stream missed.
  const handleVoiceFinal = useCallback(async (text) => {
    if (!text) return
    console.log('[TranslationScreen] voice final, polishing:', text)
    try {
      const polished = await translateText(text)
      if (!polished || polished.length === 0) return

      console.log('[TranslationScreen] polished ->', polished,
        ' liveQueued ->', liveQueuedRef.current)

      // Replace chips with the polished version
      setSigns(polished)

      // Diff: for each polished sign, if it was already queued live (one
      // occurrence), consume it; otherwise queue it now. This catches:
      //  - "como estas" -> no live words queued -> queue COMO_ESTAS
      //  - "hola como estas" -> HOLA queued live -> queue COMO_ESTAS only
      //  - "necesito ayuda" -> AYUDA queued live (NECESITO skipped) ->
      //                         queue YO + NECESITAR
      const liveLeft = [...liveQueuedRef.current]
      for (const sign of polished) {
        const idx = liveLeft.indexOf(sign)
        if (idx !== -1) {
          liveLeft.splice(idx, 1)
          continue
        }
        if (avatarRef.current) {
          console.log('[TranslationScreen] polish-queue:', sign)
          avatarRef.current.queue(sign)
        }
      }
    } catch (e) {
      console.warn('polish translateText failed:', e)
    } finally {
      // Reset live tracking for the next phrase
      liveQueuedRef.current = []
    }
  }, [])

  // The TextInputPanel uses the same onSubmit prop for both flows; we
  // dispatch by whether we're in live mode.
  const handlePanelSubmit = useCallback((text) => {
    if (liveMode) handleVoiceFinal(text)
    else handleSubmit(text)
  }, [liveMode, handleVoiceFinal, handleSubmit])

  // Active chip - LAST occurrence of activeSign so duplicates work
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
        <button onClick={onHome} className="flex items-center gap-2 group" title="Inicio">
          <span className="hidden sm:block text-xl font-extrabold gradient-text bg-white px-3 py-1 rounded-full shadow-soft">Signara</span>
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/95 shadow-soft group-hover:shadow-glow transition">
            <Logo size={28} />
          </span>
        </button>
      </header>

      <div className="animate-fade-up">
        <TextInputPanel
          initialMode={initialMode}
          onSubmit={handlePanelSubmit}
          onLiveWord={handleLiveWord}
          busy={busy}
        />
      </div>

      <div className="flex-1 flex items-center justify-center my-6 animate-fade-up">
        <AvatarPlayer
          ref={avatarRef}
          onSign={setActiveSign}
          onFinish={() => setActiveSign(null)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-up">
        <div className="glass-card p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-signara-purple">Texto original</p>
          <p className="mt-2 text-signara-navy text-lg leading-relaxed min-h-[2.5rem]">
            {originalText ? originalText : <span className="italic text-signara-navy/40">Aun no has traducido nada.</span>}
          </p>
        </div>
        <div className="glass-card p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-signara-purple">Senas traducidas</p>
          <div className="mt-3">
            <SignChips signs={signs} activeIndex={activeIndex} />
          </div>
        </div>
      </div>

      <footer className="mt-6 text-center text-xs text-white/60">
        MVP - Streaming en tiempo real con datos simulados.
      </footer>
    </section>
  )
}
