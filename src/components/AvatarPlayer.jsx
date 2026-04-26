import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { getSignSrc, normalizeSign } from '../utils/signMap.js'

/**
 * AvatarPlayer
 *
 * Queue-based sign-language video player with DOUBLE-BUFFERED video.
 *
 * Two <video> elements are stacked (A and B). At any moment one is "active"
 * (visible, opacity 1) and the other is "buffered" (hidden, opacity 0).
 *
 *   playNext() -> picks the next sign, loads its mp4 into the BUFFER element,
 *                 waits for `canplay`, then plays it AND crossfades the
 *                 active/buffer opacities. After the swap, the previous
 *                 active element becomes the new buffer for the sign after.
 *
 * This eliminates the black frame / flicker the single-<video> approach
 * shows when changing `src`, because the next clip is already decoded by
 * the time we make it visible.
 *
 * Public API (forwardRef):
 *   queue(sign), replace(signs), clear(), isPlaying(), queueLength()
 */
const AvatarPlayer = forwardRef(function AvatarPlayer(
  { signs = [], onSign, onFinish },
  ref
) {
  // Two persistent <video> elements
  const videoARef = useRef(null)
  const videoBRef = useRef(null)
  // Which one is currently visible: 'A' or 'B'
  const activeRef = useRef('A')

  // Queue logic
  const queueRef = useRef([])
  const isPlayingRef = useRef(false)
  const lastSignsRef = useRef([])

  // Per-sign retry guard for the underscore<->space filename fallback
  const triedFallbackRef = useRef(false)

  // UI state
  const [currentLabel, setCurrentLabel] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [queueLen, setQueueLen] = useState(0)
  const [hasShownAny, setHasShownAny] = useState(false)

  // -------- helpers --------------------------------------------------------
  function getActiveVideo() {
    return activeRef.current === 'A' ? videoARef.current : videoBRef.current
  }
  function getNextVideo() {
    return activeRef.current === 'A' ? videoBRef.current : videoARef.current
  }
  function toggleActive() {
    activeRef.current = activeRef.current === 'A' ? 'B' : 'A'
  }
  function setPlaying(v) {
    isPlayingRef.current = v
    setIsPlaying(v)
  }
  function refreshQueueLen() {
    setQueueLen(queueRef.current.length)
  }
  function altUrl(src) {
    if (!src) return null
    if (src.includes('%20')) return src.replace(/%20/g, '_')
    if (src.includes(' '))   return src.replace(/ /g, '_')
    if (src.includes('_'))   return src.replace(/_/g, '%20')
    return null
  }
  function clearVideoListeners(v) {
    if (!v) return
    v.oncanplay = null
    v.onerror = null
  }

  // -------- core playback --------------------------------------------------
  function playNext() {
    refreshQueueLen()
    if (queueRef.current.length === 0) {
      console.log('QUEUE: empty - stopping')
      setPlaying(false)
      setCurrentLabel(null)
      if (onFinish) onFinish()
      return
    }
    const sign = queueRef.current.shift()
    refreshQueueLen()
    const src = getSignSrc(sign)
    console.log('QUEUE:', queueRef.current)
    console.log('Playing sign:', sign, 'src:', src)

    if (!src) {
      // No video for this sign - skip to the next entry
      setTimeout(playNext, 50)
      return
    }

    setPlaying(true)
    triedFallbackRef.current = false
    preloadAndSwap(sign, src)
  }

  /**
   * Load `src` into the inactive (buffer) <video>, wait for canplay, then
   * play() it and crossfade opacities to swap which one is visible.
   */
  function preloadAndSwap(sign, src) {
    const next = getNextVideo()
    const active = getActiveVideo()
    if (!next) return

    console.log('Preloading:', src)

    // Clean up any prior listeners on the buffer to avoid leaks / double-fires
    clearVideoListeners(next)

    next.muted = true
    next.playsInline = true
    next.preload = 'auto'

    next.oncanplay = async () => {
      // One-shot: detach so a buffered sign that becomes ready later
      // doesn't accidentally re-fire.
      clearVideoListeners(next)
      console.log('Switching video to:', sign)

      try {
        await next.play()
      } catch (err) {
        console.warn('play() rejected for', sign, err)
      }

      // Crossfade
      next.style.opacity = '1'
      if (active && active !== next) {
        active.style.opacity = '0'
        try { active.pause() } catch (_) {}
      }

      toggleActive()
      setCurrentLabel(sign)
      setHasShownAny(true)
      if (onSign) onSign(sign)
    }

    next.onerror = (e) => {
      // Production diagnostics - shows the exact URL that failed (helps
      // spot Vercel case-sensitivity issues, missing assets, etc.)
      console.error('VIDEO ERROR:', next.src, 'sign:', sign,
        'mediaError:', next.error && next.error.code, e)
      // Try the underscore<->space variant once before skipping
      if (!triedFallbackRef.current) {
        const alt = altUrl(src)
        if (alt && alt !== src) {
          console.warn('Retrying with alt URL:', alt)
          triedFallbackRef.current = true
          preloadAndSwap(sign, alt)
          return
        }
      }
      console.warn('Preload error for', sign, '- skipping')
      clearVideoListeners(next)
      setTimeout(playNext, 100)
    }

    console.log('Playing:', src)
    next.src = src
    next.load()
  }

  // Fired when EITHER video reaches the natural end. Only react if it was
  // the active one (the buffered one shouldn't be playing).
  function handleVideoEnded(e) {
    if (!isPlayingRef.current) return
    const which = e.target === videoARef.current ? 'A' : 'B'
    if (which !== activeRef.current) return  // ignore the (paused) buffer
    console.log('Video ended:', currentLabel)
    playNext()
  }

  // -------- imperative API -------------------------------------------------
  function queueAnimation(rawSign) {
    if (!rawSign) return
    const sign = normalizeSign(rawSign)
    const src = getSignSrc(sign)
    if (!src) {
      console.log('LIVE WORD:', sign, '-> no video, skipped')
      return
    }
    queueRef.current.push(sign)
    refreshQueueLen()
    console.log('LIVE WORD:', sign, '-> queued')
    console.log('QUEUE:', queueRef.current)
    if (!isPlayingRef.current) playNext()
  }

  function clearQueue() {
    queueRef.current = []
    refreshQueueLen()
    setPlaying(false)
    setCurrentLabel(null)
    // Hide both videos, pause both
    for (const v of [videoARef.current, videoBRef.current]) {
      if (!v) continue
      try { v.pause() } catch (_) {}
      v.style.opacity = '0'
      clearVideoListeners(v)
    }
    setHasShownAny(false)
  }

  function replaceQueue(newSigns) {
    queueRef.current = (newSigns || [])
      .map(normalizeSign)
      .filter((s) => Boolean(getSignSrc(s)))
    refreshQueueLen()
    setPlaying(false)
    setCurrentLabel(null)
    if (queueRef.current.length > 0) playNext()
  }

  useImperativeHandle(ref, () => ({
    queue: queueAnimation,
    clear: clearQueue,
    replace: replaceQueue,
    isPlaying: () => isPlayingRef.current,
    queueLength: () => queueRef.current.length
  }))

  // Backward-compat: when `signs` prop changes (typed-text flow), replace queue.
  useEffect(() => {
    if (!signs) return
    if (signs === lastSignsRef.current) return
    const sameLength = signs.length === lastSignsRef.current.length
    const same = sameLength && signs.every((s, i) => s === lastSignsRef.current[i])
    if (same) return
    lastSignsRef.current = signs
    if (signs.length > 0) replaceQueue(signs)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signs])

  // On unmount: clean listeners
  useEffect(() => {
    return () => {
      clearVideoListeners(videoARef.current)
      clearVideoListeners(videoBRef.current)
    }
  }, [])

  return (
    <div className="relative w-full">
      <div className="relative mx-auto aspect-[4/5] max-h-[58vh] w-full max-w-md rounded-4xl overflow-hidden shadow-glow border border-white/30 bg-gradient-to-br from-signara-blue/20 via-signara-purple/15 to-signara-lilac/25 backdrop-blur-sm">
        {/* DOUBLE-BUFFER: two stacked <video> elements that crossfade.
            Initial inline opacity 0; we drive opacity imperatively from
            preloadAndSwap() so React never re-applies stale styles. */}
        <video
          ref={videoARef}
          muted
          playsInline
          preload="auto"
          onEnded={handleVideoEnded}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ease-out"
          style={{ opacity: 0 }}
        />
        <video
          ref={videoBRef}
          muted
          playsInline
          preload="auto"
          onEnded={handleVideoEnded}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ease-out"
          style={{ opacity: 0 }}
        />

        {/* Fallback avatar - underneath the videos. Hidden once we've
            successfully crossfaded any clip in. */}
        {!hasShownAny && <FallbackAvatar active={isPlaying} />}

        {/* Sign label */}
        {currentLabel && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full bg-white/90 backdrop-blur text-signara-navy font-bold tracking-wide shadow-soft text-sm">
            {normalizeSign(currentLabel).replace(/_/g, ' ')}
          </div>
        )}

        {queueLen > 0 && (
          <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-signara-text text-white text-[11px] font-bold shadow-soft">
            +{queueLen} en cola
          </div>
        )}

        {isPlaying && (
          <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur text-white text-[11px] font-bold">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
            VIVO
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-center gap-3">
        <button
          className="btn-ghost py-2 px-5 text-sm"
          onClick={clearQueue}
          disabled={!isPlaying && queueLen === 0}
        >
          Limpiar
        </button>
      </div>
    </div>
  )
})

export default AvatarPlayer

function FallbackAvatar({ active }) {
  const [imgFailed, setImgFailed] = useState(false)
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
      <div className="relative flex items-center justify-center">
        {!imgFailed ? (
          <img
            src="/avatar.png"
            alt="Avatar Signara"
            onError={() => setImgFailed(true)}
            className={'relative h-72 w-72 sm:h-80 sm:w-80 object-contain drop-shadow-2xl ' + (active ? 'animate-float' : '')}
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
