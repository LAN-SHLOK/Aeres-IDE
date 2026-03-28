/**
 * AetherLogo – high-fidelity neon orbital design (Desktop Client)
 * Features overlapping neon orbits, stylized central glyph, and glowing effects.
 */
export default function AetherLogo({ size = 28, className = '' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      fill="none"
      width={size}
      height={size}
      className={className}
    >
      <defs>
        {/* Main Neon Gradient */}
        <linearGradient id="neonGradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#bf5af2" />
          <stop offset="50%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>

        {/* Glow Filter */}
        <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        {/* Subtle Inner Glow */}
        <filter id="innerGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Background radial glow */}
      <circle cx="100" cy="100" r="70" fill="url(#neonGradient)" opacity="0.15" filter="url(#neonGlow)" />

      {/* Orbitals - X-cross style */}
      <ellipse
        cx="100"
        cy="100"
        rx="85"
        ry="30"
        transform="rotate(-45 100 100)"
        stroke="url(#neonGradient)"
        strokeWidth="4"
        strokeLinecap="round"
        filter="url(#neonGlow)"
        opacity="0.9"
      />
      <ellipse
        cx="100"
        cy="100"
        rx="85"
        ry="30"
        transform="rotate(45 100 100)"
        stroke="url(#neonGradient)"
        strokeWidth="4"
        strokeLinecap="round"
        filter="url(#neonGlow)"
        opacity="0.9"
      />

      {/* Stylized "A" Glyph */}
      <g filter="url(#neonGlow)">
        <path
          d="M100 50 L145 140 H55 Z"
          stroke="url(#neonGradient)"
          strokeWidth="6"
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
        />
        {/* Inner stylized bar (the dot) */}
        <circle cx="100" cy="115" r="8" fill="url(#neonGradient)" />
      </g>

      {/* Central Core sphere */}
      <circle cx="100" cy="115" r="4" fill="#ffffff" filter="url(#innerGlow)" />

      {/* Subtle orbital particles */}
      <circle cx="160" cy="60" r="3" fill="#22d3ee" filter="url(#neonGlow)" />
      <circle cx="40" cy="140" r="2.5" fill="#bf5af2" filter="url(#neonGlow)" />
    </svg>
  );
}

