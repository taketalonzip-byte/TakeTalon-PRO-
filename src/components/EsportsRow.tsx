/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { motion, AnimatePresence } from "motion/react";

interface EsportsGame {
  id: string;
  title: string;
  image_url: string;
  slug: string;
  category: string;
  display_order: number;
  is_active: boolean;
}

interface EsportsRowProps {
  theme: "blue" | "dark" | "light";
  lang?: "en" | "fr" | "sw";
  onSelectGame?: (slug: string) => void;
}

// Picha za eSports zimehifadhiwa kwenye Supabase Storage bucket "esports-images"
const STORAGE_BASE = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL.replace(/\/+$/, "")}/storage/v1/object/public/esports-images`
  : "";
const GAMES_STORAGE = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL.replace(/\/+$/, "")}/storage/v1/object/public/games`
  : "";

const FALLBACK_GAMES: EsportsGame[] = [
  {
    id: "fallback-1",
    title: "EA Sports FC",
    slug: "ea-sports-fc",
    category: "eSports",
    image_url: `${STORAGE_BASE}/ea-sports-fc.png`,
    display_order: 1,
    is_active: true,
  },
  {
    id: "fallback-2",
    title: "Valorant",
    slug: "valorant",
    category: "eSports",
    image_url: `${STORAGE_BASE}/valorant.png`,
    display_order: 2,
    is_active: true,
  },
  {
    id: "fallback-3",
    title: "Counter-Strike 2",
    slug: "counter-strike-2",
    category: "eSports",
    image_url: `${STORAGE_BASE}/counter-strike-2.jpg`,
    display_order: 3,
    is_active: true,
  },
  {
    id: "fallback-4",
    title: "Horse Racing",
    slug: "horse-racing",
    category: "eSports",
    image_url: `${STORAGE_BASE}/horse-racing.png`,
    display_order: 4,
    is_active: true,
  },
  {
    id: "fallback-5",
    title: "Greyhound Racing",
    slug: "greyhound-racing",
    category: "eSports",
    image_url: `${STORAGE_BASE}/greyhound-racing.png`,
    display_order: 5,
    is_active: true,
  },
  {
    id: "fallback-6",
    title: "Motorsport",
    slug: "motorsport",
    category: "eSports",
    image_url: `${STORAGE_BASE}/motorsport.png`,
    display_order: 6,
    is_active: true,
  },
  {
    id: "fallback-7",
    title: "Cricket",
    slug: "cricket",
    category: "eSports",
    image_url: `${STORAGE_BASE}/ea-sports-fc.png`,
    display_order: 7,
    is_active: true,
  },
  {
    id: "fallback-8",
    title: "Game On",
    slug: "game-on",
    category: "eSports",
    image_url: `${STORAGE_BASE}/valorant.png`,
    display_order: 8,
    is_active: true,
  },
  {
    id: "fallback-9",
    title: "Star League",
    slug: "star-league",
    category: "eSports",
    image_url: `${STORAGE_BASE}/counter-strike-2.jpg`,
    display_order: 9,
    is_active: true,
  },
  {
    id: "fallback-10",
    title: "Infinite Prize League",
    slug: "infinite-prize-league",
    category: "eSports",
    image_url: `${STORAGE_BASE}/motorsport.png`,
    display_order: 10,
    is_active: true,
  },
  {
    id: "fallback-11",
    title: "Tennis",
    slug: "tennis-game",
    category: "eSports",
    image_url: `${GAMES_STORAGE}/esport/01-tennis.png`,
    display_order: 11,
    is_active: true,
  },
  {
    id: "fallback-12",
    title: "Burning Hot",
    slug: "burning-hot",
    category: "eSports",
    image_url: `${GAMES_STORAGE}/esport/03-burning-hot.jpg`,
    display_order: 12,
    is_active: true,
  },
  {
    id: "fallback-13",
    title: "War Combat",
    slug: "war-combat",
    category: "eSports",
    image_url: `${GAMES_STORAGE}/esport/07-war-combat.jpeg`,
    display_order: 13,
    is_active: true,
  },
];

const SLUG_FALLBACK_IMAGES: Record<string, string> = {
  "ea-sports-fc": `${STORAGE_BASE}/ea-sports-fc.png`,
  valorant: `${STORAGE_BASE}/valorant.png`,
  "counter-strike-2": `${STORAGE_BASE}/counter-strike-2.jpg`,
  "horse-racing": `${STORAGE_BASE}/horse-racing.png`,
  "greyhound-racing": `${STORAGE_BASE}/greyhound-racing.png`,
  motorsport: `${STORAGE_BASE}/motorsport.png`,
  cricket: `${STORAGE_BASE}/ea-sports-fc.png`,
  "game-on": `${STORAGE_BASE}/valorant.png`,
  "star-league": `${STORAGE_BASE}/counter-strike-2.jpg`,
  "infinite-prize-league": `${STORAGE_BASE}/motorsport.png`,
  // Michezo iliyohamishwa kutoka Casino → eSports
  "tennis-game": `${GAMES_STORAGE}/esport/01-tennis.png`,
  "burning-hot": `${GAMES_STORAGE}/esport/03-burning-hot.jpg`,
  "war-combat": `${GAMES_STORAGE}/esport/07-war-combat.jpeg`,
};

// Cache version — bump this whenever FALLBACK_GAMES slugs change so old localStorage is discarded
const CACHE_VERSION = "v4-esports-tennis-bh-wc-2026";

const EsportsRow = React.memo(function EsportsRow({
  theme,
  lang = "en",
  onSelectGame,
}: EsportsRowProps) {
  const [games, setGames] = useState<EsportsGame[]>(FALLBACK_GAMES);
  const [loading, setLoading] = useState(true);
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});

  // Kazi hii inazalisha Dynamic URLs kutoka Supabase Storage au Fallback ya Unsplash kwa kasi ya juu kabisa
  const getImageUrl = (imagePath: string, slug: string) => {
    if (!imagePath) return "";

    // Ikiwa tuna picha nzuri na yenye kasi kubwa ya Unsplash CDN kwa ajili ya slug hii,
    // tutaitumia moja kwa moja kuzuia kuchelewa kabisa ("picha kukawia")!
    if (slug && SLUG_FALLBACK_IMAGES[slug]) {
      return SLUG_FALLBACK_IMAGES[slug];
    }

    if (
      imagePath.startsWith("http://") ||
      imagePath.startsWith("https://") ||
      imagePath.startsWith("data:")
    ) {
      return imagePath;
    }

    // Ikiwa ni faili tu na ipo tayari kwenye Supabase Storage:
    const bucket = import.meta.env.VITE_STORAGE_BUCKET || "games";
    if (isSupabaseConfigured) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(imagePath);
      return data?.publicUrl || "";
    }

    return "";
  };

  useEffect(() => {
    async function fetchEsportsGames() {
      if (!isSupabaseConfigured) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("esports_games")
          .select("*")
          .eq("is_active", true)
          .order("display_order", { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          setGames(data);
        }
      } catch (err) {
        console.warn(
          "[ESPORTS-ROW-FETCH-WARNING] Kushindwa kupata data kutoka Supabase, inatumia fallback:",
          err,
        );
      } finally {
        setLoading(false);
      }
    }

    fetchEsportsGames();
  }, []);

  const handleImageLoad = (id: string) => {
    setLoadedImages((prev) => ({ ...prev, [id]: true }));
  };

  // Uwekaji wa rangi kulingana na theme uliyochagua ili kufanana na top navigation bar
  const cardBgClass =
    theme === "light"
      ? "bg-gradient-to-br from-[#f8fbfe] via-[#f0f5fc] to-[#e6effa] border-slate-200/90 shadow-sm hover:border-blue-300/70"
      : theme === "blue"
        ? "bg-[#3B6D99] border-blue-400/40 hover:border-blue-300/40"
        : "bg-[#0d0d0d] border-neutral-800/60 hover:border-neutral-700/60";

  const textColorClass =
    theme === "light"
      ? "text-slate-700 hover:text-slate-900"
      : theme === "blue"
        ? "text-blue-100 hover:text-white"
        : "text-slate-400 hover:text-slate-100";

  const headingText =
    lang === "sw"
      ? "Michezo ya Kielektroniki (Esports)"
      : lang === "fr"
        ? "Jeux Électroniques"
        : "Esports & Specials";

  return (
    <div className="px-0 pt-0.5 pb-1 animate-fadeIn select-none">
      {/* Horizontally scrollable row with identical alignment and touch handling */}
      <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5 px-3 -mx-3 scroll-smooth [touch-action:pan-x_pan-y]">
        {games.map((game, index) => {
          const isLoaded = loadedImages[game.id];
          const computedUrl = getImageUrl(game.image_url, game.slug);

          return (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.03 }}
              className="flex flex-col items-center shrink-0 w-[84px] touch-manipulation group cursor-pointer"
              onClick={() => onSelectGame?.(game.slug)}
            >
              {/* Image Card Container with Perfect Square Shape and Uniform Corners */}
              <div
                className={`relative w-[84px] h-[84px] rounded-[28px] overflow-hidden border transition-all duration-300 ${cardBgClass} cursor-pointer group-hover:scale-[1.02] active:scale-[0.98] select-none`}
              >
                {/* Image Skeleton / Loading State to completely prevent Layout Shift */}
                <AnimatePresence>
                  {!isLoaded && (
                    <div className="absolute inset-0 bg-neutral-800/20 dark:bg-neutral-900/40 animate-pulse flex items-center justify-center rounded-[28px]">
                      <div className="w-4 h-4 rounded-full border border-slate-500/30 border-t-transparent animate-spin" />
                    </div>
                  )}
                </AnimatePresence>

                {/* Optimized Cover Image with Lazy Loading, Async Decoding, and Aspect Ratio Cover */}
                {computedUrl && (
                  <img
                    src={computedUrl}
                    alt={game.title}
                    loading="lazy"
                    decoding="async"
                    onLoad={() => handleImageLoad(game.id)}
                    onError={(e) => {
                      const fallback =
                        SLUG_FALLBACK_IMAGES[game.slug] ||
                        "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=240&auto=format&fit=crop&q=80";
                      if (e.currentTarget.src !== fallback) {
                        e.currentTarget.src = fallback;
                      }
                    }}
                    className={`w-full h-full object-cover rounded-[28px] transition-opacity duration-300 ${
                      isLoaded ? "opacity-100" : "opacity-0"
                    }`}
                  />
                )}
              </div>

              {/* Title below card */}
              <span
                className={`text-[7px] leading-tight mt-1 px-0.5 font-extrabold uppercase tracking-wide text-center truncate max-w-full block transition-colors duration-200 ${textColorClass}`}
              >
                {game.title}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
});
export default EsportsRow;
