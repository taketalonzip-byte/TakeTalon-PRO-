/**
 * TalonLogo — local-first TakeTalon mark with a network-safe fallback chain.
 */

import React, { useState } from "react";

interface TalonLogoProps {
  className?: string;
  glow?: boolean;
  theme?: "blue" | "dark" | "light";
  /** Use bundled assets first for critical UI that must render offline. */
  localFirst?: boolean;
}

const PRIMARY_LOGO_URL = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL.replace(/\/+$/, "")}/storage/v1/object/public/esports-images/tt-logo.png`
  : "/tt-logo.png";

const LOCAL_LOGO_URLS = [
  "/icon-512.png",
  "/tt-logo.png",
  "/tt-logo.webp",
  "/icon.svg",
] as const;

function InlineTalonMark() {
  return (
    <svg
      viewBox="0 0 512 512"
      role="img"
      aria-label="TakeTalon Logo"
      className="relative z-10 h-full w-full drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)]"
    >
      <rect width="512" height="512" rx="112" fill="#090e1a" />
      <circle
        cx="256"
        cy="256"
        r="210"
        fill="none"
        stroke="#38bdf8"
        strokeWidth="4"
        strokeOpacity="0.25"
        strokeDasharray="8 8"
      />
      <circle
        cx="256"
        cy="256"
        r="230"
        fill="none"
        stroke="#0369a1"
        strokeWidth="2"
        strokeOpacity="0.35"
      />
      <g fill="#f8fafc" stroke="#000000" strokeWidth="2.5" strokeLinejoin="miter">
        <polygon points="115.6,170 289.4,170 289.4,196.4 269.6,196.4 269.6,346 230,297.6 230,196.4 197,196.4" />
        <polygon points="436.4,170 262.6,170 262.6,196.4 282.4,196.4 282.4,346 322,297.6 322,196.4 355,196.4" />
      </g>
      <polygon points="256,134 266,144 256,154 246,144" fill="#38bdf8" />
    </svg>
  );
}

export default function TalonLogo({
  className = "w-28 h-28",
  glow = true,
  theme = "blue",
  localFirst = false,
}: TalonLogoProps) {
  const fallbackLogoUrls = localFirst
    ? [...LOCAL_LOGO_URLS]
    : [
        PRIMARY_LOGO_URL,
        ...LOCAL_LOGO_URLS.filter((url) => url !== PRIMARY_LOGO_URL),
      ];
  const [imgSrc, setImgSrc] = useState<string>(fallbackLogoUrls[0]);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    const currentIndex = fallbackLogoUrls.indexOf(imgSrc);
    const nextUrl = fallbackLogoUrls[currentIndex + 1];
    if (nextUrl) {
      setImgSrc(nextUrl);
    } else {
      setHasError(true);
    }
  };

  const invertFilter = theme === "dark" ? "invert brightness-110 contrast-125" : "";

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {glow && (
        <div
          className={`pointer-events-none absolute inset-0 scale-125 animate-pulse rounded-full blur-2xl ${
            theme === "dark" ? "bg-white/15" : "bg-blue-500/20"
          }`}
        />
      )}
      {!hasError ? (
        <img
          src={imgSrc}
          alt="TakeTalon Logo"
          onError={handleError}
          className={`relative z-10 h-full w-full object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)] transition-all duration-300 ${invertFilter}`}
          draggable={false}
        />
      ) : (
        <InlineTalonMark />
      )}
    </div>
  );
}
