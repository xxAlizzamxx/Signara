import { useEffect, useState } from 'react'
import LandingScreen from './components/LandingScreen.jsx'
import ModeSelection from './components/ModeSelection.jsx'
import TranslationScreen from './components/TranslationScreen.jsx'
import InterpretScreen from './components/InterpretScreen.jsx'

/**
 * App
 * Top-level state machine for the demo screens:
 *
 *   landing  -> mode  -> translate
 *                     -> interpret
 *
 * 'translate'  : entrada texto/voz -> avatar de señas. Incluye un sub-modo
 *                interno para personalizar el avatar (avatar / hombre / mujer).
 * 'interpret'  : cámara -> reconocimiento de señas -> texto / audio
 *
 * El avatar elegido se persiste en localStorage. App lo carga al iniciar y
 * lo recibe de vuelta vía onAvatarChange cuando el usuario lo cambia desde
 * dentro de Traducir.
 */

const AVATAR_KEY = 'signara:avatarChoice'

function readStoredAvatar() {
  try {
    const v = window.localStorage.getItem(AVATAR_KEY)
    if (v === 'avatar' || v === 'hombre' || v === 'mujer') return v
  } catch (_) {}
  return 'avatar'
}

function saveStoredAvatar(choice) {
  try {
    window.localStorage.setItem(AVATAR_KEY, choice)
  } catch (_) {}
}

export default function App() {
  const [screen, setScreen] = useState('landing')
  const [avatarChoice, setAvatarChoice] = useState('avatar')

  useEffect(() => {
    setAvatarChoice(readStoredAvatar())
  }, [])

  const handleAvatarChange = (choice) => {
    setAvatarChoice(choice)
    saveStoredAvatar(choice)
  }

  return (
    <div className="min-h-screen w-full bg-signara-gradient text-white relative overflow-hidden">
      {/* Decorative blurred orbs */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-signara-sky/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 w-[520px] h-[520px] rounded-full bg-signara-lilac/40 blur-3xl" />
  