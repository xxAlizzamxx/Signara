import { useCallback, useEffect, useRef, useState } from 'react'
import Logo from './Logo.jsx'
import AvatarPlayer from './AvatarPlayer.jsx'
import TextInputPanel from './TextInputPanel.jsx'
import SignChips from './SignChips.jsx'
import { translateText } from '../utils/translateText.js'

/**
 * TranslationScreen
 * The main working screen. Layout follows the spec:
 *   - Top:    input (text + mic)
 *   - Center: avatar (focus)
 *   - Bottom: original text + translated sign chips
 */
export default function TranslationScreen({ initialMode = 'text', onBack, onHome }) {
  const [originalText, setOriginalText] = useState('')
  const [signs, setSigns] = useState([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const [busy, setBusy] = useState(false)

  // Drive the active-chip pointer in sync with the avatar's auto-advance
  // (kept simple — we re-tick on signs change).
  const tickRef = useRef(null)
  useEffect(() => {
    clearInterval(tickRef.current)
    if (signs.length === 0) {
      setActiveIndex(-1)
      return
    }
    setActiveIndex(0)
    let i = 0
    tickRef.current = setInterval(() => {
      i += 1
      if (i >= signs.length) {
        clearInterval(tickRef.current)
        setActiveIndex(signs.length - 1)
      } else {
        setActiveIndex(i)
      }
    }, 1400)
    return () => clearInterval(tickRef.current)
  }, [signs])

  const handleSubmit = useCallback(async (text) => {
    setBusy(true)
    setOriginalText(text)
    try {
      const result = await translateText(text)
      setSigns(result)
    } catch (e) {
      console.error('translateText failed:', e)
      setSigns([])
    } finally {
      setBusy(false)
    }
  }, [])

  return (
    <section className="min-h-screen flex flex-col px-4 sm:px-6 py-6 max-w-6xl mx-auto">
      {/* Top bar */}
      <header className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-white/85 hover:text-white text-sm font-medium"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Cambiar modo
        </button>

        <button
          onClick={onHome}
          className="flex items-center gap-2 group"
          title="Inicio"
        >
          <span className="hidden sm:block text-xl font-extrabold gradient-text bg-white px-3 py-1 rounded-full shadow-soft">
            Signara
          </span>
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/95 shadow-soft group-hover:shadow-glow transition">
            <Logo size={28} />
          </span>
        </button>
      </header>

      {/* INPUT */}
      <div className="animate-fade-up">
        <TextInputPanel
          initialMode={initialMode}
          onSubmit={handleSubmit}
          busy={busy}
        />
      </div>

      {/* AVATAR */}
      <div className="flex-1 flex items-center justify-center my-6 animate-fade-up">
        <AvatarPlayer signs={signs} autoPlay />
      </div>

      {/* BOTTOM: original + chips */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-up">
        <div className="glass-card p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-signara-purple">
            Texto original
          </p>
          <p className="mt-2 text-signara-navy text-lg leading-relaxed min-h-[2.5rem]">
            {originalText || (
              <span className="italic text-signara-navy/40">
                Aún no has traducido nada.
              </span>
            )}
          </p>
        </div>

        <div className="glass-card p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-signara-purple">
            Señas traducidas
          </p>
          <div className="mt-3">
            <SignChips signs={signs} activeIndex={activeIndex} />
          </div>
        </div>
      </div>

      <footer className="mt-6 text-center text-xs text-white/60">
        MVP · Las traducciones se generan localmente con datos simulados — pronto conectado a Claude.
      </footer>
    </section>
  )
}
