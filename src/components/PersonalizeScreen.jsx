import { useState } from 'react'
import Logo from './Logo.jsx'

/**
 * PersonalizeScreen
 * Permite al usuario elegir el avatar que se usará en el reproductor:
 *   - 'avatar'  : avatar por defecto (genérico)
 *   - 'hombre'  : avatar masculino
 *   - 'mujer'   : avatar femenino
 *
 * La elección se guarda en localStorage bajo la clave 'signara:avatarChoice'
 * y se notifica al padre mediante onChange/onSave.
 */
const AVATAR_OPTIONS = [
  {
    key: 'avatar',
    label: 'Avatar',
    description: 'El avatar clásico de Signara.',
    src: '/avatar.png',
    accent: 'from-signara-blue to-signara-purple'
  },
  {
    key: 'hombre',
    label: 'Avatar hombre',
    description: 'Personaje masculino para tus traducciones.',
    src: '/avatar_hombre.png',
    accent: 'from-signara-sky to-signara-navy'
  },
  {
    key: 'mujer',
    label: 'Avatar mujer',
    description: 'Personaje femenino para tus traducciones.',
    src: '/avatar_mujer.png',
    accent: 'from-signara-lilac to-signara-purple'
  }
]

export default function PersonalizeScreen({ initialChoice = 'avatar', onBack, onHome, onSave }) {
  const [choice, setChoice] = useState(initialChoice)

  const handleSave = () => {
    try {
      window.localStorage.setItem('signara:avatarChoice', choice)
    } catch (_) {}
    if (onSave) onSave(choice)
  }

  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <button
        onClick={onBack}
        className="absolute top-6 left-6 inline-flex items-center gap-2 text-white/85 hover:text-white text-sm font-medium"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Volver
      </button>

      <button
        onClick={onHome}
        className="absolute top-6 right-6 flex items-center gap-2 group"
        title="Inicio"
      >
        <span className="hidden sm:block text-xl font-extrabold gradient-text bg-white px-3 py-1 rounded-full shadow-soft">Signara</span>
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/95 shadow-soft group-hover:shadow-glow transition">
          <Logo size={28} />
        </span>
      </button>

      <div className="text-center mb-8 animate-fade-up">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/95 shadow-glow">
          <Logo size={64} />
        </div>
        <h2 className="text-4xl md:text-5xl font-bold text-white">
          Personalizar
        </h2>
        <p className="mt-3 text-white/85 text-lg font-light">
          Elige el avatar que prefieres ver al traducir.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full max-w-4xl animate-fade-up">
        {AVATAR_OPTIONS.map((opt) => {
          const selected = choice === opt.key
          return (
            <button
              key={opt.key}
              onClick={() => setChoice(opt.key)}
              className={
                'group glass-card p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-glow focus:outline-none focus:ring-4 focus:ring-signara-purple/30 ' +
                (selected ? 'ring-4 ring-signara-purple/70 shadow-glow -translate-y-1' : '')
              }
            >
              <div className={'mb-4 aspect-square w-full rounded-3xl overflow-hidden bg-gradient-to-br ' + opt.accent + ' flex items-center justify-center shadow-soft'}>
                <img
                  src={opt.src}
                  alt={opt.label}
                  className="h-full w-full object-contain drop-shadow-lg"
                  draggable={false}
                />
              </div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-signara-navy">{opt.label}</h3>
                {selected && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-signara-purple text-white">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    Elegido
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-signara-navy/70 leading-relaxed">{opt.description}</p>
            </button>
          )
        })}
      </div>

      <div className="mt-8 flex items-center gap-3 animate-fade-up">
        <button onClick={onBack} className="btn-ghost py-3 px-6 text-sm">
          Cancelar
        </button>
        <button onClick={handleSave} className="btn-primary py-3 px-7 text-sm">
          Guardar avatar
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </button>
      </div>
    </section>
  )
}
