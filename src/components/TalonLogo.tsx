/**
 * TalonLogo — logo halisi ya TakeTalon kutoka public/tt-logo.webp
 * Inabadilisha SVG iliyochorwa awali na picha halisi.
 */

import React, { useState } from "react";
import { Zap } from "lucide-react";

interface TalonLogoProps {
  className?: string;
  glow?: boolean;
  theme?: "blue" | "dark" | "light";
}

const PRIMARY_LOGO_URL = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL.replace(/\/+$/, "")}/storage/v1/object/public/esports-images/tt-logo.png`
  : "/tt-logo.png";

export default function TalonLogo({
  className = "w-28 h-28",
  glow = true,
  theme = "blue",
}: TalonLogoProps) {
  const [imgSrc, setImgSrc] = useState(PRIMARY_LOGO_URL);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (imgSrc === PRIMARY_LOGO_URL) {
      setImgSrc("/tt-logo.png");
    } else if (imgSrc === "/tt-logo.png") {
      setImgSrc("/tt-logo.webp");
    } else {
      setHasError(true);
    }
  };

  // Kwenye dark mode: Sehemu nyeupe inakuwa nyeusi, na sehemu nyeusi inakuwa nyeupe (Invert colors)
  // Kwenye blue mode na light mode: Inabaki katika rangi zake asili
  const invertFilter = theme === "dark" ? "invert brightness-110 contrast-125" : "";

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {glow && (
        <div
          className={`absolute inset-0 rounded-full blur-2xl scale-125 animate-pulse pointer-events-none ${
            theme === "dark" ? "bg-white/15" : "bg-blue-500/20"
          }`}
        />
      )}
      {!hasError ? (
        <img
          src={imgSrc}
          alt="TakeTalon Logo"
          onError={handleError}
          className={`relative z-10 w-full h-full object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)] transition-all duration-300 ${invertFilter}`}
          draggable={false}
        />
      ) : (
        /* Fallback SVG Emblem if image files fail to load */
        <div className="relative z-10 flex flex-col items-center justify-center w-full h-full p-2 rounded-2xl bg-gradient-to-br from-blue-900 via-slate-900 to-blue-950 border border-blue-500/30 shadow-xl">
          <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-400/30">
            <Zap className="w-8 h-8 animate-bounce text-amber-400" />
          </div>
          <span className="text-[10px] font-black font-mono tracking-widest text-blue-300 mt-1 uppercase">
            TAKETALON
          </span>
        </div>
      )}
    </div>
  );
}

