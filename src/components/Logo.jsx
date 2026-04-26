/**
 * Logo
 * Inline SVG version of the Signara mark — two hands, signal bars, soundwaves —
 * using the brand gradient palette. Renders crisply at any size.
 */
export default function Logo({ size = 96, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 220 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Signara logo"
    >
      <defs>
        <linearGradient id="signara-g1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1F40C2" />
          <stop offset="100%" stopColor="#7060A8" />
        </linearGradient>
        <linearGradient id="signara-g2" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#9DCDF7" />
          <stop offset="100%" stopColor="#B5A3D2" />
        </linearGradient>
      </defs>
      <path
        d="M40 130 C 30 100, 60 70, 90 80 C 100 60, 120 70, 110 95 L 105 130 Z"
        fill="url(#signara-g1)"
      />
      <path
        d="M180 130 C 190 100, 160 70, 130 80 C 120 60, 100 70, 110 95 L 115 130 Z"
        fill="url(#signara-g2)"
        opacity="0.95"
      />
      <rect x="100" y="100" width="6" height="22" rx="2" fill="#fff" opacity="0.9" />
      <rect x="110" y="92" width="6" height="32" rx="2" fill="#fff" opacity="0.9" />
      <rect x="120" y="100" width="6" height="22" rx="2" fill="#fff" opacity="0.9" />
      <path d="M30 105 q -10 5 0 25" stroke="#1F40C2" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M22 95  q -16 15 0 45" stroke="#1F40C2" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M190 105 q 10 5 0 25" stroke="#7060A8" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M198 95  q 16 15 0 45" stroke="#7060A8" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  )
}
