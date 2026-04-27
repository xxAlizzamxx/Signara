import { useState } from 'react'
import LandingScreen from './components/LandingScreen.jsx'
import ModeSelection from './components/ModeSelection.jsx'
import TranslationScreen from './components/TranslationScreen.jsx'
import InterpretScreen from './components/InterpretScreen.jsx'

/**
 * App
 * Top-level state machine for the four demo screens:
 *
 *   landing  -> mode  -> translate
 *                     -> interpret
 *
 * 'translate'  : entrada texto/voz -> avatar de señas
 * 'interpret'  : cámara -> reconocimiento de señas -> texto / audio
 */
export default function App() {
  const [screen, setScreen] = useState('landing')

  return (
    <div className="min-h-screen w-full bg-signara-gradient text-white relative overflow-hidden">
      {/* Decorative blurred orbs */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-signara-sky/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 w-[520px] h-[520px] rounded-full bg-signara-lilac/40 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 right-1/4 w-[300px] h-[300px] rounded-full bg-signara-purple/30 blur-3xl" />

      <div className="relative z-10">
        {screen === 'landing' && (
          <LandingScreen onStart={() => setScreen('mode')} />
        )}

        {screen === 'mode' && (
          <ModeSelection
            onBack={() => setScreen('landing')}
            onSelect={(m) => setScreen(m)}
          />
        )}

        {screen === 'translate' && (
          <TranslationScreen
            initialMode="text"
            onBack={() => setScreen('mode')}
            onHome={() => setScreen('landing')}
          />
        )}

        {screen === 'interpret' && (
          <InterpretScreen
            onBack={() => setScreen('mode')}
            onHome={() => setScreen('landing')}
          />
        )}
      </div>
    </div>
  )
}
