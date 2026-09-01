/**
 * TalonLogo — the real TakeTalon brand image with an offline-safe cache path.
 */

import React, { useEffect, useState } from "react";
import {
  readCachedTaketalonLogo,
  TAKETALON_BRAND_LOGO_URL,
  requestTaketalonLogoWarmup,
} from "../lib/taketalonBrandLogo";

interface TalonLogoProps {
  className?: string;
  glow?: boolean;
  theme?: "blue" | "dark" | "light";
  /** Read the real logo from CacheStorage and never use a remote URL in this mode. */
  localFirst?: boolean;
}

const STATIC_LOGO_URL = "/tt-logo.png";
const PRIMARY_LOGO_URL = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL.replace(/\/+$/, "")}/storage/v1/object/public/esports-images/tt-logo.png`
  : STATIC_LOGO_URL;

export default function TalonLogo({
  className = "w-28 h-28",
  glow = true,
  theme = "blue",
  localFirst = false,
}: TalonLogoProps) {
  const [cachedLogoUrl, setCachedLogoUrl] = useState<string | null>(null);
  const [imgSrc, setImgSrc] = useState(localFirst ? STATIC_LOGO_URL : PRIMARY_LOGO_URL);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!localFirst) return;

    let disposed = false;
    let activeObjectUrl: string | null = null;

    const loadCachedLogo = async () => {
      const objectUrl = await readCachedTaketalonLogo();
      if (disposed) {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        return;
      }
      if (objectUrl) {
        activeObjectUrl = objectUrl;
        setCachedLogoUrl(objectUrl);
        setImgSrc(objectUrl);
        setHasError(false);
      }
    };

    void loadCachedLogo();

    const handleWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === "TAKETALON_LOGO_CACHED") void loadCachedLogo();
    };
    navigator.serviceWorker?.addEventListener("message", handleWorkerMessage);

    return () => {
      disposed = true;
      navigator.serviceWorker?.removeEventListener("message", handleWorkerMessage);
      if (activeObjectUrl) URL.revokeObjectURL(activeObjectUrl);
    };
  }, [localFirst]);

  useEffect(() => {
    if (localFirst && navigator.onLine) {
      requestTaketalonLogoWarmup(TAKETALON_BRAND_LOGO_URL);
    }
  }, [localFirst]);

  const handleError = () => {
    if (localFirst) {
      // The static copy is already in the app-shell cache. Never switch to a
      // Supabase URL from this offline-critical path.
      if (imgSrc !== STATIC_LOGO_URL) {
        setImgSrc(STATIC_LOGO_URL);
        return;
      }
      setHasError(true);
      return;
    }

    if (imgSrc === PRIMARY_LOGO_URL) {
      setImgSrc(STATIC_LOGO_URL);
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
      {!hasError && (
        <img
          src={localFirst ? cachedLogoUrl || imgSrc : imgSrc}
          alt="TakeTalon Logo"
          onError={handleError}
          className={`relative z-10 h-full w-full object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)] transition-all duration-300 ${invertFilter}`}
          draggable={false}
          loading="eager"
          decoding="sync"
        />
      )}
    </div>
  );
}
