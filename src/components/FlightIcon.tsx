import React from "react";

interface FlightIconProps {
  size?: number;
}

const FlightIcon: React.FC<FlightIconProps> = ({ size = 80 }) => {
  return (
    <div
      className="relative flex items-center justify-center pointer-events-none select-none"
      style={{
        width: size,
        height: size,
        filter:
          "drop-shadow(0 0 12px rgba(239,68,68,0.85)) drop-shadow(0 0 24px rgba(249,115,22,0.4))",
      }}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full transform">
        <defs>
          {/* Shading gradients for 3D curved surfaces */}
          <linearGradient id="fuselage-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" /> {/* Bright red top */}
            <stop offset="50%" stopColor="#dc2626" /> {/* Classic solid red */}
            <stop offset="100%" stopColor="#991b1b" /> {/* Deep shadow red */}
          </linearGradient>

          <linearGradient id="wing-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="50%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#b91c1c" />
          </linearGradient>

          <linearGradient id="shadow-wing-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#b91c1c" />
            <stop offset="100%" stopColor="#7f1d1d" />
          </linearGradient>

          <linearGradient id="chrome-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" /> {/* Yellow/gold highlights */}
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>

          <linearGradient id="glass-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#c5f2ff" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#0891b2" />
          </linearGradient>
        </defs>

        <style>
          {`
            @keyframes spin-propeller {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            .propeller-blade {
              animation: spin-propeller 0.04s linear infinite;
              transform-origin: 80px 50px;
            }
            @keyframes smoke-puff {
              0% { transform: scale(0.6) translate(0, 0); opacity: 0; }
              50% { transform: scale(1.1) translate(-10px, 3px); opacity: 0.7; }
              100% { transform: scale(1.4) translate(-22px, 6px); opacity: 0; }
            }
            .smoke-trail-1 {
              animation: smoke-puff 1.2s ease-out infinite;
              transform-origin: 65px 55px;
            }
            .smoke-trail-2 {
              animation: smoke-puff 1.2s ease-out infinite;
              animation-delay: 0.6s;
              transform-origin: 65px 55px;
            }
          `}
        </style>

        {/* Ambient smoke puffs from retro exhaust pipes */}
        <circle
          className="smoke-trail-1"
          cx="62"
          cy="56"
          r="3"
          fill="rgba(244,63,94,0.4)"
          filter="blur(1px)"
        />
        <circle
          className="smoke-trail-2"
          cx="62"
          cy="56"
          r="4"
          fill="rgba(251,146,60,0.3)"
          filter="blur(1.5px) drop-shadow(0 0 4px #ef4444)"
        />

        {/* Fuselage (Main Red Cigar Body) */}
        <path
          d="M 16,50 C 24,33 54,33 76,43 C 78,44 80,47 80,50 C 80,53 78,56 76,57 C 54,67 24,67 16,50 Z"
          fill="url(#fuselage-grad)"
          stroke="#7f1d1d"
          strokeWidth="1"
        />

        {/* Sleek metallic white/gold accent stripe along the side */}
        <path
          d="M 22,50 Q 46,45 74,48 Q 74,52 46,55 Q 22,50 22,50 Z"
          fill="#ffffff"
          opacity="0.95"
        />

        {/* Star Decal / Emblem on the side (Classic Military Retro Badge) */}
        <circle cx="44" cy="50" r="7" fill="#1d4ed8" stroke="white" strokeWidth="1" />
        <polygon
          points="44,45 45.6,49.2 49.8,49.5 46.5,52.2 47.5,56.4 44,54 40.5,56.4 41.5,52.2 38.2,49.5 42.4,49.2"
          fill="white"
        />

        {/* Glass Canopy (Cockpit) with cyan/blue gradient */}
        <path
          d="M 46,47 C 46,35 56,34 64,44 Q 65.5,46 63.5,47.5 C 57.5,50 46,50 46,47 Z"
          fill="url(#glass-grad)"
          stroke="#0891b2"
          strokeWidth="0.5"
        />
        {/* Cockpit reflection glint */}
        <path
          d="M 50,41 Q 56,38 60,43"
          stroke="#ffffff"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="transparent"
          opacity="0.75"
        />

        {/* Small metal exhaust pipe details */}
        <path
          d="M 64,54 L 60,57 L 58,55 L 62,53 Z"
          fill="#475569"
          stroke="#1e293b"
          strokeWidth="0.5"
        />
        <path
          d="M 67,53.5 L 63,56.5 L 61,54.5 L 65,52.5 Z"
          fill="#475569"
          stroke="#1e293b"
          strokeWidth="0.5"
        />

        {/* Propeller Spinner (Golden-yellow chrome dome nose) */}
        <path
          d="M 80,44 C 86,44 86,56 80,56 Z"
          fill="url(#chrome-grad)"
          stroke="#d97706"
          strokeWidth="0.75"
        />

        {/* Propeller Blur Circle (simulating ultra-high speed rotation) */}
        <ellipse
          cx="80"
          cy="50"
          rx="2"
          ry="18"
          fill="rgba(255,255,255,0.06)"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="0.5"
        />

        {/* Animated Propeller Blades */}
        <g
          className="propeller-blade"
          transform="translate(80, 50) scale(0.55) translate(-80, -50)"
        >
          {/* Blade 1 (pointing up) */}
          <path
            d="M 80,50 C 79,40 76,21 80,18 C 84,21 81,40 80,50 Z"
            fill="#e2e8f0"
            stroke="#94a3b8"
            strokeWidth="0.5"
            opacity="0.85"
          />
          <path d="M 78.5,21.5 C 78,20 82,20 81.5,21.5 L 80,18 Z" fill="#eab308" />{" "}
          {/* Yellow tip */}
          {/* Blade 2 (pointing down) */}
          <path
            d="M 80,50 C 81,60 84,79 80,82 C 76,79 79,60 80,50 Z"
            fill="#e2e8f0"
            stroke="#94a3b8"
            strokeWidth="0.5"
            opacity="0.85"
          />
          <path d="M 81.5,78.5 C 82,80 78,80 78.5,78.5 L 80,82 Z" fill="#eab308" />{" "}
          {/* Yellow tip */}
          {/* Central Propeller Hub cap (Silver/Chrome) */}
          <circle cx="80" cy="50" r="4" fill="#f1f5f9" stroke="#64748b" strokeWidth="0.75" />
          <circle cx="80" cy="50" r="1.5" fill="#94a3b8" />
        </g>
      </svg>
    </div>
  );
};

export default FlightIcon;
