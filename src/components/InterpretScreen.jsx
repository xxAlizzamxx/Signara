import { useEffect, useRef, useState, useCallback } from 'react'
import Logo from './Logo.jsx'

/**
 * InterpretScreen
 *
 * Real-time hand-wave detection using MediaPipe Hands.
 * Detected gesture -> "HOLA"  (kept short, no full sentence)
 *
 * Includes a LIMPIAR button that resets:
 *   - latest detection (clear card)
 *   - history list
 *   - X-position ring buffer
 *   - cooldown timer
 *   - cancels any pending speech synthesis
 *   - DOES NOT stop the camera or hands solution
 */

const MEDIAPIPE_HANDS_VER = '0.4.1675469240'
const MEDIAPIPE_CAM_VER   = '0.3.1675466862'
const MEDIAPIPE_DRAW_VER  = '0.3.1675466124'

const MP_SCRIPTS = [
  `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${MEDIAPIPE_HANDS_VER}/hands.js`,
  `https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@${MEDIAPIPE_CAM_VER}/camera_utils.js`,
  `https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@${MEDIAPIPE_DRAW_VER}/drawing_utils.js`
]

const HISTORY_LEN = 18
const WAVE_THRESHOLD = 0.18
const COOLDOWN_MS = 2000

function loadScript(url) {
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[data-signara="' + url + '"]')) return resolve()
    const s = document.createElement('script')
    s.src = url
    s.async = true
    s.crossOrigin = 'anonymous'
    s.dataset.signara = url
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Failed to load ' + url))
    document.head.appendChild(s)
  })
}
async function loadMediaPipe() {
  for (const url of MP_SCRIPTS) await loadScript(url)
}

export default function InterpretScreen({ onBack, onHome }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const handsRef = useRef(null)
  const cameraRef = useRef(null)

  // Refs that callbacks read - always up to date without re-subscribing
  const xHistoryRef = useRef([])
  const lastDetectionRef = useRef(0)
  const runningRef = useRef(false)
  const audioRef = useRef(true)

  const [scriptsLoaded, setScriptsLoaded] = useState(false)
  const [scriptsError, setScriptsError] = useState(null)
  const [cameraOk, setCameraOk] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [running, setRunning] = useState(false)
  const [handVisible, setHandVisible] = useState(false)
  const [latest, setLatest] = useState(null)
  const [history, setHistory] = useState([])
  const [audioOn, setAudioOn] = useState(true)

  useEffect(() => { runningRef.current = running }, [running])
  useEffect(() => { audioRef.current = audioOn }, [audioOn])

  // ---- Load MediaPipe -----------------------------------------------------
  useEffect(() => {
    let cancelled = false
    loadMediaPipe()
      .then(() => { if (!cancelled) setScriptsLoaded(true) })
      .catch((e) => {
        console.error('[InterpretScreen] MediaPipe load failed:', e)
        if (!cancelled) setScriptsError(String(e.message || e))
      })
    return () => { cancelled = true }
  }, [])

  // ---- Init Hands + Camera once scripts ready -----------------------------
  useEffect(() => {
    if (!scriptsLoaded) return
    const HandsCtor = window.Hands
    const CameraCtor = window.Camera
    if (!HandsCtor || !CameraCtor) {
      setScriptsError('MediaPipe no se cargó correctamente.')
      return
    }
    const videoEl = videoRef.current
    if (!videoEl) return

    const hands = new HandsCtor({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${MEDIAPIPE_HANDS_VER}/${file}`
    })
    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 0,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.5
    })
    hands.onResults(handleResults)
    handsRef.current = hands

    const camera = new CameraCtor(videoEl, {
      onFrame: async () => {
        if (handsRef.current && videoEl.readyState >= 2) {
          try { await handsRef.current.send({ image: videoEl }) } catch (_) {}
        }
      },
      width: 640,
      height: 480
    })
    cameraRef.current = camera

    camera.start()
      .then(() => setCameraOk(true))
      .catch((e) => {
        console.error('[InterpretScreen] camera start failed:', e)
        setCameraError(
          e && e.name === 'NotAllowedError'
            ? 'Permiso de cámara denegado. Habilítalo en tu navegador.'
            : 'No se pudo acceder a la cámara.'
        )
      })

    return () => {
      try { camera.stop() } catch (_) {}
      try { hands.close() } catch (_) {}
      handsRef.current = null
      cameraRef.current = null
    }
  }, [scriptsLoaded])

  // ---- Per-frame -----------------------------------------------------------
  function handleResults(results) {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return

    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    ctx.save()
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const lms = results.multiHandLandmarks
    const has = Array.isArray(lms) && lms.length > 0

    if (has) {
      const landmarks = lms[0]

      if (window.drawConnectors && window.drawLandmarks && window.HAND_CONNECTIONS) {
        window.drawConnectors(ctx, landmarks, window.HAND_CONNECTIONS, {
          color: 'rgba(112,96,168,0.85)', lineWidth: 3
        })
        window.drawLandmarks(ctx, landmarks, {
          color: 'rgba(31,64,194,0.95)', lineWidth: 1, radius: 4
        })
      }

      const wristX = landmarks[0].x
      const buf = xHistoryRef.current
      buf.push(wristX)
      if (buf.length > HISTORY_LEN) buf.shift()

      if (runningRef.current && buf.length >= 10) {
        let mn = buf[0], mx = buf[0]
        for (let i = 1; i < buf.length; i++) {
          const v = buf[i]
          if (v < mn) mn = v
          if (v > mx) mx = v
        }
        const delta = mx - mn
        const now = Date.now()
        if (delta > WAVE_THRESHOLD && now - lastDetectionRef.current > COOLDOWN_MS) {
          // Cooldown stamp + buffer reset BEFORE emitting so we never re-fire
          // on the same gesture even if the next frame still shows wide motion.
          lastDetectionRef.current = now
          xHistoryRef.current = []

          const detection = {
            sign: 'HOLA',
            text: 'HOLA',
            confidence: Math.min(0.99, 0.6 + delta)
          }
          console.log('[InterpretScreen] WAVE detected, delta=', delta.toFixed(3))
          setLatest(detection)
          setHistory((h) => [detection, ...h].slice(0, 8))
          speak(detection.text)
        }
      }
    } else {
      xHistoryRef.current = []
    }

    setHandVisible(has)
    ctx.restore()
  }

  function speak(text) {
    if (!audioRef.current || !text) return
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    try {
      window.speechSynthesis.cancel()
      const utter = new window.SpeechSynthesisUtterance(text)
      utter.lang = 'es-ES'
      utter.rate = 1
      utter.pitch = 1
      window.speechSynthesis.speak(utter)
    } catch (e) { console.warn(e) }
  }

  function startDetect() {
    xHistoryRef.current = []
    lastDetectionRef.current = 0
    setRunning(true)
  }
  function stopDetect() {
    setRunning(false)
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel()
  }

  // ---- LIMPIAR -------------------------------------------------------------
  // Resets detection state, leaves the camera running.
  const handleReset = useCallback(() => {
    console.log('[InterpretScreen] handleReset()')
    setLatest(null)
    setHistory([])
    xHistoryRef.current = []
    lastDetectionRef.current = 0
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    // camera + hands stay alive intentionally
  }, [])

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
          <button onClick={onHome} className="flex items-center gap-2 group" title="Inicio">
            <span className="hidden sm:block text-xl font-extrabold gradient-text bg-white px-3 py-1 rounded-full shadow-soft">Signara</span>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/95 shadow-soft group-hover:shadow-glow transition">
              <Logo size={28} />
            </span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 flex-1 animate-fade-up">
        <div className="lg:col-span-3">
          <div className="relative rounded-4xl overflow-hidden shadow-glow border border-white/70 bg-black aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 h-full w-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 h-full w-full pointer-events-none"
              style={{ transform: 'scaleX(-1)' }}
            />

            {!scriptsLoaded && !scriptsError && (
              <div className="absolute inset-0 flex items-center justify-center text-white/80 text-sm">
                Cargando MediaPipe…
              </div>
            )}
            {scriptsError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white p-6">
                <p className="font-semibold text-lg">No se pudo cargar MediaPipe</p>
                <p className="mt-2 text-sm text-white/80">{scriptsError}</p>
              </div>
            )}
            {scriptsLoaded && !cameraOk && !cameraError && (
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

            <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/55 backdrop-blur text-white text-xs">
              <span className={'inline-block h-2 w-2 rounded-full ' +
                (running ? 'bg-red-400 animate-pulse'
                  : cameraOk ? 'bg-green-400'
                  : 'bg-white/60')} />
              {running
                ? handVisible ? 'Detectando movimiento…' : 'Esperando mano…'
                : cameraOk ? 'Listo' : 'En espera'}
            </div>

            {latest && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full bg-white/95 backdrop-blur text-signara-navy font-bold tracking-wide shadow-soft text-sm">
                {latest.sign} · {Math.round((latest.confidence || 0) * 100)}%
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {!running ? (
              <button
                onClick={startDetect}
                disabled={!cameraOk}
                className="btn-primary py-2.5 px-5 text-sm disabled:opacity-50"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Empezar a interpretar
              </button>
            ) : (
              <button onClick={stopDetect} className="btn-primary py-2.5 px-5 text-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
                Detener
              </button>
            )}
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

        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="glass-card p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-signara-purple">
              Última detección
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
                Pulsa <strong>Empezar a interpretar</strong> y saluda con la mano.
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
        MVP · Reconocimiento de gesto "saludar" con MediaPipe Hands.
      </footer>
    </section>
  )
}

function ResetButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 border border-white/30 text-white text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-white/40"
      title="Reiniciar todo"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 3v5h5" />
      </svg>
      LIMPIAR
    </button>
  )
}
