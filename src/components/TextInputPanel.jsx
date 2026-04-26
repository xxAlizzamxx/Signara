import { useEffect, useRef, useState } from 'react'
import useVoiceInput from '../hooks/useVoiceInput.js'

/**
 * TextInputPanel
 * Combined text + microphone input. The mic button uses the Web Speech API
 * (Spanish locale) and pushes its transcript straight into the text field
 * so the user can review/edit before submitting.
 *
 * Props:
 *   - initialMode: 'text' | 'voice'  which control gets initial focus
 *   - onSubmit: (text: string) => void
 *   - busy: boolean (disables submit while translating)
 */
export default function TextInputPanel({ initialMode = 'text', onSubmit, busy = false }) {
  const [value, setValue] = useState('')
  const inputRef = useRef(null)

  const { listening, interim, error, supported, start, stop } = useVoiceInput({
    lang: 'es-ES',
    onResult: (text) => {
      setValue((prev) => (prev ? `${prev} ${text}` : text).trim())
    }
  })

  useEffect(() => {
    if (initialMode === 'voice' && supported && !listening) {
      // Tiny delay so the user sees the screen before recording starts.
      const t = setTimeout(() => start(), 350)
      return () => clearTimeout(t)
    }
    if (initialMode === 'text') {
      inputRef.current?.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMode, supported])

  const submit = (e) => {
    e?.preventDefault?.()
    const text = value.trim()
    if (!text || busy) return
    onSubmit?.(text)
  }

  const toggleMic = () => {
    if (!supported) return
    if (listening) stop()
    else start()
  }

  const examples = ['Hola, ¿cómo estás?', 'Necesito ayuda, es urgente', 'Tengo sed', 'Te amo']

  return (
    <form onSubmit={submit} className="w-full">
      <div className="glass-card flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-3">
        <button
          type="button"
          onClick={toggleMic}
          disabled={!supported}
          title={
            supported
              ? listening
                ? 'Detener grabación'
                : 'Hablar'
              : 'Tu navegador no soporta reconocimiento de voz'
          }
          className={`relative flex-shrink-0 inline-flex h-11 w-11 items-center justify-center rounded-full
            transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-signara-purple/30
            ${listening
              ? 'bg-signara-text text-white shadow-glow'
              : 'bg-white text-signara-navy border border-signara-lilac/60 hover:border-signara-purple'}
            ${!supported ? 'opacity-40 cursor-not-allowed' : ''}`}
          aria-pressed={listening}
        >
          {listening && (
            <span className="absolute inset-0 rounded-full bg-signara-purple/40 animate-pulse-ring" />
          )}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="3" width="6" height="12" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
          </svg>
        </button>

        <input
          ref={inputRef}
          type="text"
          value={value + (interim ? ` ${interim}` : '')}
          onChange={(e) => setValue(e.target.value)}
          placeholder={
            listening
              ? 'Escuchando…'
              : 'Escribe en español o pulsa el micrófono…'
          }
          className="flex-1 bg-transparent outline-none text-signara-navy placeholder:text-signara-navy/40
                     text-base sm:text-lg px-2 py-2"
          disabled={busy}
        />

        <button
          type="submit"
          disabled={busy || !value.trim()}
          className="btn-primary py-2.5 px-5 text-sm flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? (
            <Spinner />
          ) : (
            <>
              Traducir
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      </div>

      {/* Helper row: examples + voice/error info */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/80">
        <span className="opacity-70">Prueba:</span>
        {examples.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => setValue(ex)}
            className="px-3 py-1 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 transition"
          >
            {ex}
          </button>
        ))}
        {!supported && (
          <span className="ml-auto text-yellow-100/90">
            Voz no disponible en este navegador.
          </span>
        )}
        {error && (
          <span className="ml-auto text-red-100">Error de voz: {error}</span>
        )}
      </div>
    </form>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="white" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
