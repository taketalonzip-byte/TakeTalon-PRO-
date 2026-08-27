/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Flag — shared country/team flag component.
 *
 * Renders real flag artwork from ESPN's CDN (see ../lib/espnFlags.ts) so
 * every country/team badge across the app uses one reliable, consistent
 * source instead of hand-drawn SVGs. If an ESPN asset is missing for a given
 * country, or the image fails to load, it falls back to a neutral initials
 * badge (same style already used by Crest-style logo components) so a
 * broken image never breaks the layout.
 */

import React, { useState } from "react";
import { getEspnFlagUrl } from "../lib/espnFlags";

export interface FlagProps {
  /** Country name or ESPN/ISO-ish code, e.g. "england", "eng", "brazil". */
  country?: string | null;
  /** Square size in px. */
  size?: number;
  /** Optional accessible label; defaults to the country string. */
  label?: string;
  className?: string;
  /** Corner style — "md" matches the app's default badge shape, "full" for a circular chip. */
  rounded?: "full" | "md";
}

/**
 * Country/team flag rendered from ESPN's flag CDN, with a graceful fallback
 * so a missing or broken asset never produces a broken-image icon.
 */
export const Flag: React.FC<FlagProps> = ({
  country,
  size = 24,
  label,
  className = "",
  rounded = "md",
}) => {
  const [errored, setErrored] = useState(false);
  const src = getEspnFlagUrl(country);
  const radiusClass = rounded === "full" ? "rounded-full" : "rounded-md";
  const accessibleLabel = label ?? (country || undefined);
  const initials = (accessibleLabel ?? "??").trim().slice(0, 2).toUpperCase() || "??";

  if (!src || errored) {
    return (
      <span
        className={`inline-flex items-center justify-center shrink-0 border border-white/10 bg-slate-600/70 text-white font-bold uppercase ${radiusClass} ${className}`}
        style={{ width: size, height: size, minWidth: size, fontSize: Math.max(7, size * 0.32) }}
      >
        <span className="sr-only">{accessibleLabel ? `${accessibleLabel} flag` : "flag"}</span>
        <span aria-hidden="true">{initials}</span>
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={accessibleLabel ? `${accessibleLabel} flag` : "flag"}
      loading="lazy"
      onError={() => setErrored(true)}
      className={`inline-block shrink-0 object-cover border border-white/10 ${radiusClass} ${className}`}
      style={{ width: size, height: size, minWidth: size }}
    />
  );
};

export default Flag;
