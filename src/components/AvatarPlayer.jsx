import { useEffect, useRef, useState } from 'react'
import { getSignSrc, normalizeSign } from '../utils/signMap.js'

/**
 * AvatarPlayer
 * Plays a sequence of sign-language video clips one after another.
 *
 *   - Renders a single <video ref={videoRef}> bound to the current sign URL.
 *   - On each new sign we explicitly call play() (with muted + playsInline so
 *     browsers allow autoplay).
 *   - Advances on the real `ended` event - we only fall back to a timer if
 *     the sign has no mapped video, or the video errors / autoplay rejects.
 *   - Surfaces the active index to the parent via onIndexChange so chips
 *     highlight in real time with the actual playback.
 */
export default function AvatarPlayer({
  signs = [],
  autoPlay = true,
  onFinish,
  onIndexChange
}) {
  const videoRef = useRef(null)
  const fallbackTimerRef = useRef(null)
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [videoReady, setVideoReady] = useState(false)

  const currentSign = signs[index]
  const currentSrc = currentSign ? getSignSrc(currentSign) : null

  // Restart sequence when input changes
  useEffect(() => {
    clearTimeout(fallbackTimerRef.current)
    setIndex(0)
    setVideoReady(false)
    setPlaying(autoPlay && signs.length > 0)
  }, [signs, autoPlay])

  // Tell the parent which chip is active
  useEffect(() => {
    if (onIndexChange) onIndexChange(playing ? index : -1)
  }, [index, playing, onIndexChange])

  // Per-sign effect: try to play the real video, fall back to timer if needed
  useEffect(() => {
    setVideoReady(false)
    if (!playing) return

    if (index >= signs.length) {
      setPlaying(false)
      if (onFinish) onFinish()
      return
    }

    const sign = signs[index]
    const src = sign ? getSignSrc(sign) : null

    console.log('Playing sign:', sign)
    console.log('Video src:', src)

    clearTimeout(fallbackTimerRef.current)

    if (!src) {
      fallbackTimerRef.current = setTimeout(function () {
        setIndex(function (i) { return i + 1 })
      }, 1400)
      return
    }

    const video = videoRef.current
    if (video) {
      video.muted = true
      const p = video.play()
      if (p && typeof p.catch === 'function') {
        p.catch(function (err) {
          console.warn('Initial play() rejected, will retry on loadeddata:', err)
        })
      }
    }

    return function () { clearTimeout(fallbackTimerRef.current) }
  }, [playing, index, signs, onFinish])

  function handleEnded() {
    console.log('Video ended:', currentSign)
    setIndex(function (i) { return i + 1 })
  }

  function handleLoadedData() {
    console.log('Video loaded:', currentSrc)
    setVideoReady(true)
    const v = videoRef.current
    if (!v) return
    v.muted = true
    const p = v.play()
    if (p && typeof p.catch === 'function') {
      p.catch(function (err) {
        console.warn('play() after loadeddata rejected:', err)
        clearTimeout(fallbackTimerRef.current)
        fallbackTimerRef.current = setTimeout(function () {
          setIndex(function (i) { return i + 1 })
        }, 2000)
      })
    }
  }

  function handleError(e) {
    console.warn('Video error for', currentSrc, e)
    setVideoReady(false)
    clearTimeout(fallbackTimerRef.current)
    fallbackTimerRef.current = setTimeout(function () {
      setIndex(function (i) { return i + 1 })
    }, 1400)
  }

  function replay() {
    setIndex(0)
    setVideoReady(false)
    setPlaying(true)
  }

  function togglePlay() {
    if (!signs.length) return
    if (playing) {
      if (videoRef.current) videoRef.current.pause()
      setPlaying(false)
    } else {
      setPlaying(true)
      if (videoRef.current) {
        const p = videoRef.current.play()
        if (p && typeof p.catch === 'function') p.catch(function () {})
      }
    }
  }

  return (
    <div className="relative w-full">
      <div className="relative mx-auto aspect-[4/5] max-h-[58vh] w-full max-w-md rounded-4xl overflow-hidden shadow-glow bg-gradient-to-br from-signara-sky/40 via-white to-signara-lilac/40 border border-white/70">
        {currentSrc ? (
          <video
            ref={videoRef}
            key={index + '-' + currentSrc}
            src={currentSrc}
            autoPlay
            muted
            playsInline
            preload="auto"
            onEnded={handleEnded}
            onLoadedData={handleLoadedData}
            onError={handleError}
            className={'absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ' + (videoReady ? 'opacity-100' : 'opacity-0')}
          />
        ) : null}

        {!videoReady ? <FallbackAvatar sign={currentSign} active={playing} /> : null}

        {currentSign ? (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full bg-white/90 backdrop-blur text-signara-navy font-bold tracking-wide shadow-soft text-sm">
            {normalizeSign(currentSign).replace(/_/g, ' ')}
          </div>
        ) : null}

        {signs.length > 0 ? (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1.5">
            {signs.map(function (_, i) {
              const cls = 'h-1.5 rounded-full transition-all duration-300 ' + (i < index ? 'w-3 bg-signara-purple' : i === index ? 'w-6 bg-signara-blue' : 'w-3 bg-white/70')
              return <span key={i} className={cls} />
            })}
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex items-center justify-center gap-3">
        <button className="btn-ghost py-2 px-5 text-sm" onClick={replay} disabled={signs.length === 0}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          Repetir
        </button>
        <button className="btn-ghost py-2 px-5 text-sm" onClick={togglePlay} disabled={signs.length === 0}>
          {playing ? 'Pausar' : 'Reproducir'}
        </button>
      </div>
    </div>
  )
}

function FallbackAvatar({ sign, active }) {
  const [imgFailed, setImgFailed] = useState(false)
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-signara-navy">
      <div className="relative flex items-center justify-center">
        <div className={'absolute inset-0 rounded-full bg-signara-purple/20 ' + (active ? 'animate-pulse-ring' : '')} />
        {!imgFailed ? (
          <img
            src="/avatar.png"
            alt="Avatar Signara"
            onError={() => setImgFailed(true)}
            className={'relative h-72 w-72 sm:h-80 sm:w-80 object-contain drop-shadow-xl ' + (active ? 'animate-float' : '')}
            draggable={false}
          />
        ) : (
          <div className={'relative h-44 w-44 rounded-full bg-gradient-to-br from-signara-blue to-signara-purple shadow-glow flex items-center justify-center ' + (active ? 'animate-float' : '')}>
            <svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11V5a1.5 1.5 0 1 1 3 0v5" />
              <path d="M12 10V4a1.5 1.5 0 1 1 3 0v6" />
              <path d="M15 10V6a1.5 1.5 0 1 1 3 0v6" />
              <path d="M9 11V8a1.5 1.5 0 0 0-3 0v6c0 3.3 2.7 6 6 6h1a6 6 0 0 0 6-6v-2" />
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}
