import { useEffect, useRef, useState } from 'react'
import { getSignSrc, normalizeSign } from '../utils/signMap.js'

/**
 * AvatarPlayer
 * Plays a sequence of sign-language video clips one after another inside a
 * polished avatar container. While videos load (or in their absence, since
 * the placeholder mp4s don't exist on disk in the MVP) we render a
 * branded fallback "card" that mimics the avatar so the demo remains
 * visually convincing.
 *
 * Props:
 *   - signs: string[]        canonical sign tokens, e.g. ["YO","NECESITAR","AYUDA"]
 *   - autoPlay: boolean      start playing as soon as `signs` changes (default true)
 *   - onFinish: () => void   called when the whole sequence finished
 */
export default function AvatarPlayer({ signs = [], autoPlay = true, onFinish }) {
  const videoRef = useRef(null)
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  // Tracks whether the current clip's <video> was able to load its source.
  const [hasVideo, setHasVideo] = useState(false)

  // Restart sequence whenever the input list changes.
  useEffect(() => {
    setIndex(0)
    setPlaying(autoPlay && signs.length > 0)
  }, [signs, autoPlay])

  // Advance through the sequence as each clip ends.
  useEffect(() => {
    if (!playing) return
    if (index >= signs.length) {
      setPlaying(false)
      onFinish?.()
      return
    }
    setHasVideo(false)

    // Soft auto-advance for fallback (no video available) so the demo flows.
    const fallbackTimer = setTimeout(() => {
      setIndex((i) => i + 1)
    }, 1400)

    return () => clearTimeout(fallbackTimer)
  }, [playing, index, signs.length, onFinish])

  const currentSign = signs[index]
  const src = currentSign ? getSignSrc(currentSign) : null

  const handleEnded = () => setIndex((i) => i + 1)
  const handleLoaded = () => setHasVideo(true)
  const handleError = () => setHasVideo(false)

  const replay = () => {
    setIndex(0)
    setPlaying(true)
  }

  return (
    <div className="relative w-full">
      <div
        className="relative mx-auto aspect-[4/5] max-h-[58vh] w-full max-w-md
                   rounded-4xl overflow-hidden shadow-glow
                   bg-gradient-to-br from-signara-sky/40 via-white to-signara-lilac/40
                   border border-white/70"
      >
        {/* Video layer — invisible until loaded successfully */}
        {src && (
          <video
            ref={videoRef}
            src={src}
            autoPlay
            playsInline
            muted
            onEnded={handleEnded}
            onLoadedData={handleLoaded}
            onError={handleError}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
              hasVideo ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}

        {/* Branded fallback avatar */}
        {!hasVideo && <FallbackAvatar sign={currentSign} active={playing} />}

        {/* Sign label overlay */}
        {currentSign && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full
                          bg-white/90 backdrop-blur text-signara-navy font-bold tracking-wide
                          shadow-soft text-sm">
            {normalizeSign(currentSign).replace(/_/g, ' ')}
          </div>
        )}

        {/* Progress dots */}
        {signs.length > 0 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1.5">
            {signs.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i < index
                    ? 'w-3 bg-signara-purple'
                    : i === index
                    ? 'w-6 bg-signara-blue'
                    : 'w-3 bg-white/70'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-5 flex items-center justify-center gap-3">
        <button
          className="btn-ghost py-2 px-5 text-sm"
          onClick={replay}
          disabled={signs.length === 0}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          Repetir
        </button>
        <button
          className="btn-ghost py-2 px-5 text-sm"
          onClick={() => setPlaying((p) => !p)}
          disabled={signs.length === 0}
        >
          {playing ? 'Pausar' : 'Reproducir'}
        </button>
      </div>
    </div>
  )
}

/**
 * FallbackAvatar
 * Animated stand-in shown when no clip is available — keeps the demo lively
 * even though placeholder /videos/*.mp4 files are not bundled.
 */
function FallbackAvatar({ sign, active }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-signara-navy">
      <div className="relative">
        <div
          className={`absolute inset-0 rounded-full bg-signara-purple/30 ${
            active ? 'animate-pulse-ring' : ''
          }`}
        />
        <div
          className={`relative h-40 w-40 rounded-full bg-gradient-to-br
                      from-signara-blue to-signara-purple shadow-glow
                      flex items-center justify-center ${active ? 'animate-float' : ''}`}
        >
          <svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            {/* Stylised hand */}
            <path d="M9 11V5a1.5 1.5 0 1 1 3 0v5" />
            <path d="M12 10V4a1.5 1.5 0 1 1 3 0v6" />
            <path d="M15 10V6a1.5 1.5 0 1 1 3 0v6" />
            <path d="M9 11V8a1.5 1.5 0 0 0-3 0v6c0 3.3 2.7 6 6 6h1a6 6 0 0 0 6-6v-2" />
          </svg>
        </div>
      </div>
      <p className="mt-6 text-xs uppercase tracking-[0.4em] text-signara-navy/60">
        Avatar Signara
      </p>
      {sign && (
        <p className="mt-2 text-2xl font-extrabold gradient-text">
          {normalizeSign(sign).replace(/_/g, ' ')}
        </p>
      )}
    </div>
  )
}
