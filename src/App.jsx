import { useState } from 'react'
import LandingScreen from './components/LandingScreen.jsx'
import ModeSelection from './components/ModeSelection.jsx'
import TranslationScreen from './components/TranslationScreen.jsx'

/**
 * App
 * Top-level state machine for the three demo screens:
 *   landing → mode → translate
 */
export default function App() {
  const [screen, setScreen] = useState('landing') // 'landing' | 'mode' | 'translate'
  const [mode, setMode] = useState('text') // 'text' | 'voice'

  return (
    <div className="min-h-screen w-full bg-signara-gradient text-white relative overflow-hidden">
      {/* Decorative blurred orbs to add depth without clutter */}
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
            onSelect={(m) => {
              setMode(m)
              setScreen('translate')
            }}
          />
        )}

        {screen === 'translate' && (
          <TranslationScreen
            initialMode={mode}
            onBack={() => setScreen('mode')}
            onHome={() => setScreen('landing')}
          />
        )}
      </div>
    </div>
  )
}
