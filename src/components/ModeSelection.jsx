import Logo from './Logo.jsx'

/**
 * ModeSelection
 * Lets the user choose between text and voice translation modes.
 */
export default function ModeSelection({ onSelect, onBack }) {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <button
        onClick={onBack}
        className="absolute top-6 left-6 inline-flex items-center gap-2 text-white/80 hover:text-white text-sm font-medium"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Volver
      </button>

      <div className="text-center mb-10 animate-fade-up">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/95 shadow-glow">
          <Logo size={64} />
        </div>
        <h2 className="text-4xl md:text-5xl font-bold text-white">
          ¿Cómo quieres traducir?
        </h2>
        <p className="mt-3 text-white/80 text-lg font-light">
          Elige el modo de entrada para empezar.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl animate-fade-up">
        <ModeCard
          title="Traducir texto"
          description="Escribe una frase en español y mira las señas."
          accent="from-signara-blue to-signara-navy"
          icon={<TextIcon />}
          onClick={() => onSelect('text')}
        />
        <ModeCard
          title="Traducir voz"
          description="Habla y deja que Signara haga el resto."
          accent="from-signara-purple to-signara-lilac"
          icon={<MicIcon />}
          onClick={() => onSelect('voice')}
        />
      </div>
    </section>
  )
}

function ModeCard({ title, description, accent, icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group glass-card p-8 text-left transition-all duration-300
                 hover:-translate-y-1 hover:shadow-glow focus:outline-none
                 focus:ring-4 focus:ring-signara-purple/30"
    >
      <div
        className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl
                    bg-gradient-to-br ${accent} text-white shadow-soft
                    group-hover:scale-110 transition-transform`}
      >
        {icon}
      </div>
      <h3 className="text-2xl font-bold text-signara-navy">{title}</h3>
      <p className="mt-2 text-signara-navy/70 leading-relaxed">{description}</p>
      <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold gradient-text">
        Empezar
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  )
}

function TextIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16M4 12h10M4 18h16" />
    </svg>
  )
}

function MicIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  )
}
