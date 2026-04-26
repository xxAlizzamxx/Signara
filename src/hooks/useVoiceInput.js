import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * useVoiceInput
 * Thin wrapper around the Web Speech API (SpeechRecognition) tuned for
 * Spanish input. Exposes:
 *
 *   - listening         : boolean
 *   - transcript        : current cumulative transcript
 *   - interim           : in-progress partial transcript
 *   - error             : last error (string) or null
 *   - supported         : whether the browser exposes SpeechRecognition
 *   - start(), stop()
 *
 * Falls back gracefully on unsupported browsers (e.g. Firefox) by reporting
 * supported = false; the UI should swap to text input in that case.
 */
export default function useVoiceInput({ lang = 'es-ES', onResult } = {}) {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [error, setError] = useState(null)

  const recognitionRef = useRef(null)
  const onResultRef = useRef(onResult)
  onResultRef.current = onResult

  const SR =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null
  const supported = Boolean(SR)

  useEffect(() => {
    if (!supported) return

    const recognition = new SR()
    recognition.lang = lang
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onresult = (event) => {
      let finalText = ''
      let interimText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i]
        if (r.isFinal) finalText += r[0].transcript
        else interimText += r[0].transcript
      }
      if (interimText) setInterim(interimText)
      if (finalText) {
        setTranscript((prev) => (prev ? `${prev} ${finalText}` : finalText).trim())
        setInterim('')
        if (onResultRef.current) onResultRef.current(finalText.trim())
      }
    }

    recognition.onerror = (e) => {
      setError(e.error || 'speech-error')
      setListening(false)
    }
    recognition.onend = () => setListening(false)

    recognitionRef.current = recognition
    return () => {
      try {
        recognition.abort()
      } catch (_) {}
    }
  }, [SR, supported, lang])

  const start = useCallback(() => {
    setError(null)
    setInterim('')
    if (!recognitionRef.current) return
    try {
      recognitionRef.current.start()
      setListening(true)
    } catch (e) {
      // start() throws if already started — ignore.
    }
  }, [])

  const stop = useCallback(() => {
    if (!recognitionRef.current) return
    try {
      recognitionRef.current.stop()
    } catch (_) {}
    setListening(false)
  }, [])

  const reset = useCallback(() => {
    setTranscript('')
    setInterim('')
    setError(null)
  }, [])

  return { listening, transcript, interim, error, supported, start, stop, reset }
}
