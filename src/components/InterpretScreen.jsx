import { useEffect, useRef, useState } from 'react'
import Logo from './Logo.jsx'
import { interpretSign } from '../utils/interpretSign.js'

/**
 * InterpretScreen
 * Cámara -> identifica seña -> traduce a texto y/o audio.
 *
 * Flow:
 *   1. Pedir permiso a la cámara via getUserMedia
 *   2. Mostrar el feed en vivo
 *   3. Cada N segundos llamar a interpretSign() (mock por ahora)
 *      que devuelve { sign, confidence, text }
 *   4. Mostrar la palabra reconocida + el texto traducido
 *   5. Si "Audio" está activo, leer el texto con SpeechSynthesis (es-ES)
 */
export default function InterpretScreen({ onBack, onHome }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const intervalRef = useRef(null)

  const [cameraOk, setCameraOk] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [running, setRunning] = useState(false)
  const [history, setHistory] = useState([])
  const [latest, setLatest] = useState(null)
  const [audioOn, setAudioOn] = useState(true)
  const [busy, setBusy] = useState(false)

  // Pedir cámara al montar
  useEffect(() => {
    let cancelled = false
    async function start() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Tu navegador no soporta cámara (getUserMedia).')
        return
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
        setCameraOk(true)
      } catch (e) {
        console.error('Camera error:', e)
        setCameraError(
          e && e.name === 'NotAllowedError'
            ? 'Permiso de cámara denegado. Habilítalo en tu navegador.'
            : 'No se pudo acceder a la cámara.'
        )
      }
    }
    start()
    return () => {
      cancelled = true
      stopStream()
      clearInterval(intervalRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }

  function speak(text) {
    if (!audioOn || !text) return
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    try {
      window.speechSynthesis.cancel()
      const utter = new window.SpeechSynthesisUtterance(text)
      utter.lang = 'es-ES'
      utter.rate = 1
      utter.pitch = 1
      window.speechSynthesis.speak(utter)
    } catch (e) {
      console.warn('SpeechSynthesis failed:', e)
    }
  }

  async function captureFrame() {
    if (!videoRef.current || busy) return
    setBusy(true)
    try {
      // En el futuro: sacar un frame del video y mandarlo a Claude.
      // Por ahora usamos el mock que devuelve una seña cualquiera.
      const result = await interpretSign(videoRef.current)
      console.log('[InterpretScreen] interpretSign ->', result)
      setLatest(result)
      setHistory((h) => [result, ...h].slice(0, 8))
      speak(result.text)
    } catch (e) {
      console.error('interpretSign failed:', e)
    } finally {
      setBusy(false)
    }
  }

  function startLoop() {
    if (running) return
    setRunning(true)
    captureFrame() // disparo inmediato
    intervalRef.current = setInterval(captureFrame, 3000)
  }

  function stopLoop() {
    setRunning(false)
    clearInterval(intervalRef.current)
    intervalRef.current = null
    if (window.speechSynthesis) window.speechSynthesis.cancel()
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

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 flex-1 animate-fade-up">
        {/* Cámara */}
        <div className="lg:col-span-3">
          <div className="relative rounded-4xl overflow-hidden shadow-glow border border-white/70 bg-black aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 h-full w-full object-cover"
            />
            {!cameraOk && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center text-white/80 text-sm">
                Solicitando cámara…
              </div>
            )}
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white p-6">
                <p className="font-semibold text-lg">No se pudo iniciar la cámara</p>
                <p className="mt-2 text-sm text-white/80 max-w-sm">{cameraError}</p>
              </div>
            )}
            {/* Overlay de estado */}
            <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur text-white text-xs">
              <span className={'inline-block h-2 w-2 rounded-full ' + (running ? 'bg-red-400 animate-pulse' : 'bg-white/60')} />
              {running ? 'Interpretando…' : 'En espera'}
            </div>
            {/* Última seña en grande */}
            {latest && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full bg-white/90 backdrop-blur text-signara-navy font-bold tracking-wide shadow-soft text-sm">
                {latest.sign} · {Math.round((latest.confidence || 0) * 100)}%
              </div>
            )}
          </div>

          {/* Controles */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {!running ? (
              <button onClick={startLoop} disabled={!cameraOk} className="btn-primary py-2.5 px-5 text-sm disabled:opacity-50">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Empezar a interpretar
              </button>
            ) : (
              <button onClick={stopLoop} className="btn-primary py-2.5 px-5 text-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
                Detener
              </button>
            )}
            <button onClick={captureFrame} disabled={!cameraOk || busy} className="btn-ghost py-2.5 px-5 text-sm disabled:opacity-50">
              Capturar ahora
            </button>
            <label className="ml-auto inline-flex items-center gap-2 text-sm text-white/90 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={audioOn}
                onChange={(e) => setAudioOn(e.target.checked)}
                className="h-4 w-4 accent-signara-purple"
              />
              Leer en voz alta
            </label>
          </div>
        </div>

        {/* Resultados */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="glass-card p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-signara-purple">
              Última traducción
            </p>
            {latest ? (
              <div className="mt-2">
                <p className="text-3xl font-extrabold gradient-text">{latest.sign}</p>
                <p className="mt-1 text-signara-navy text-lg leading-relaxed">{latest.text}</p>
                <p className="mt-2 text-xs text-signara-navy/60">
                  Confianza: {Math.round((latest.confidence || 0) * 100)}%
                </p>
              </div>
            ) : (
              <p className="mt-2 italic text-signara-navy/40">
                Pulsa <strong>Empezar a interpretar</strong> y muestra una seña a la cámara.
              </p>
            )}
          </div>

          <div className="glass-card p-5 flex-1 min-h-[200px]">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-signara-purple">
              Historial
            </p>
            {history.length === 0 ? (
              <p className="mt-2 italic text-signara-navy/40">
                Aquí verás cada seña reconocida.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {history.map((h, i) => (
                  <li key={i} className="flex items-baseline gap-3">
                    <span className="chip">{h.sign}</span>
                    <span className="text-signara-navy/80 text-sm flex-1">{h.text}</span>
                    <span className="text-[11px] text-signara-navy/50">
                      {Math.round((h.confidence || 0) * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <footer className="mt-6 text-center text-xs text-white/60">
        MVP · El reconocimiento usa datos simulados — pronto conectado a Claude Vision.
      </footer>
    </section>
  )
}
