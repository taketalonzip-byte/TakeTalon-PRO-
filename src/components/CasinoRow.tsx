/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { motion, AnimatePresence } from "motion/react";

interface CasinoGame {
  id: string;
  title: string;
  image_url: string;
  slug: string;
  category: string;
  display_order: number;
  is_active: boolean;
}

interface CasinoRowProps {
  theme: "blue" | "dark" | "light";
  lang?: "en" | "fr" | "sw";
  onSelectGame?: (slug: string) => void;
}

// Picha za casino zimehifadhiwa kwenye Supabase Storage bucket "games/esport/"
// Mpangilio: Tennis → Aviator → Burning Hot → Crystal → Jackpot Wheel → Over&Under 7 → War Combat
const CASINO_STORAGE = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL.replace(/\/+$/, "")}/storage/v1/object/public/games`
  : "";

// Slugs zisizotakiwa — zinafiltrwa kutoka Supabase na fallback
// tennis-game, burning-hot, war-combat zimehamishiwa eSports; over-under-7 imeondolewa kabisa
const BLOCKED_SLUGS = new Set([
  "blackjack",
  "poker",
  "las-vegas",
  "roulette",
  "western-slot",
  "baccarat",
  "tennis-game",
  "burning-hot",
  "war-combat",
  "over-under-7",
]);

const FALLBACK_CASINO_GAMES: CasinoGame[] = [
  {
    id: "casino-2",
    title: "Aviator",
    slug: "aviator",
    category: "Casino",
    image_url: `${CASINO_STORAGE}/esport/02-aviator.jpg`,
    display_order: 1,
    is_active: true,
  },
  {
    id: "casino-4",
    title: "Crystal",
    slug: "crystal",
    category: "Casino",
    image_url: `${CASINO_STORAGE}/esport/04-crystal.jpg`,
    display_order: 2,
    is_active: true,
  },
  {
    id: "casino-5",
    title: "Jackpot Wheel",
    slug: "jackpot-wheel",
    category: "Casino",
    image_url: `${CASINO_STORAGE}/esport/05-jackpot-wheel.jpg`,
    display_order: 3,
    is_active: true,
  },
  {
    id: "casino-8",
    title: "Slot777",
    slug: "slot777",
    category: "Casino",
    image_url: `${CASINO_STORAGE}/esport/slot777.jpg`,
    display_order: 4,
    is_active: true,
  },
  {
    id: "casino-10",
    title: "Plinko",
    slug: "plinko-pyramid",
    category: "Casino",
    image_url: `${CASINO_STORAGE}/esport/plinko.jpg`,
    display_order: 5,
    is_active: true,
  },
  {
    id: "casino-11",
    title: "Dice",
    slug: "provably-dice",
    category: "Casino",
    image_url: `${CASINO_STORAGE}/esport/dice.jpg`,
    display_order: 6,
    is_active: true,
  },
  {
    id: "casino-12",
    title: "Lucky Wheel",
    slug: "lucky-wheel",
    category: "Casino",
    image_url: `${CASINO_STORAGE}/esport/lucky-wheel.jpg`,
    display_order: 7,
    is_active: true,
  },
];

const getCasinoLabel = (slug: string, title: string, lang: "en" | "fr" | "sw" = "en") => {
  if (lang === "sw") {
    switch (slug) {
      case "all-games":
        return "Yote";
      case "aviator":
        return "Aviator";
      case "crash":
        return "Crash";
      case "crystal":
        return "Crystal";
      case "crystal-mine":
        return "Crystal Mine";
      case "burning-hot":
        return "Burning Hot";
      case "western-slot":
        return "Western Slot";
      case "roulette":
        return "Ruleti";
      case "baccarat":
        return "Baccarat";
      case "slot777":
        return "Slot777";
      case "provably-dice":
        return "Dice";
      case "plinko-pyramid":
        return "Plinko";
      default:
        return title;
    }
  } else if (lang === "fr") {
    switch (slug) {
      case "all-games":
        return "Tous";
      case "aviator":
        return "Aviator";
      case "crash":
        return "Crash";
      case "crystal":
        return "Crystal";
      case "crystal-mine":
        return "Crystal Mine";
      case "burning-hot":
        return "Burning Hot";
      case "western-slot":
        return "Western Slot";
      case "roulette":
        return "Roulette";
      case "baccarat":
        return "Baccarat";
      case "slot777":
        return "Slot777";
      case "provably-dice":
        return "Dice";
      case "plinko-pyramid":
        return "Plinko";
      case "lucky-wheel":
        return "Roue de la Fortune";
      default:
        return title;
    }
  }
  return title;
};

const CasinoRow = React.memo(function CasinoRow({
  theme,
  lang = "en",
  onSelectGame,
}: CasinoRowProps) {
  const [games, setGames] = useState<CasinoGame[]>(FALLBACK_CASINO_GAMES);

  const [selectedGameSlug, setSelectedGameSlug] = useState<string>("all-games");
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function fetchCasinoGames() {
      if (!isSupabaseConfigured) return;
      try {
        const { data, error } = await supabase
          .from("casino_games")
          .select("*")
          .eq("is_active", true)
          .order("display_order", { ascending: true });

        if (error) throw error;
        if (data && data.length > 0) {
          // Anza na fallback (ina michezo yote ya provably fair)
          // Ongeza michezo ya Supabase isiyokuwa kwenye fallback na isiyokuwa blocked
          const fallbackSlugs = new Set(FALLBACK_CASINO_GAMES.map((g) => g.slug));
          const extra = data.filter(
            (g: CasinoGame) => !BLOCKED_SLUGS.has(g.slug) && !fallbackSlugs.has(g.slug),
          );
          const merged = [...FALLBACK_CASINO_GAMES, ...extra];
          setGames(merged);
        }
      } catch (err) {
        console.warn(
          "[CASINO-ROW-FETCH-WARNING] Kushindwa kupata data kutoka Supabase, inatumia fallback ya ndani.",
        );
      }
    }
    fetchCasinoGames();
  }, []);

  const handleImageLoad = (id: string) => {
    setLoadedImages((prev) => ({ ...prev, [id]: true }));
  };

  const getImageUrl = (imagePath: string, slug: string) => {
    if (!imagePath) return "";
    const defaultFallback = FALLBACK_CASINO_GAMES.find((g) => g.slug === slug)?.image_url;
    if (
      imagePath.startsWith("http://") ||
      imagePath.startsWith("https://") ||
      imagePath.startsWith("data:")
    ) {
      return imagePath;
    }
    const bucket = "casino-images";
    if (isSupabaseConfigured) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(imagePath);
      return data?.publicUrl || defaultFallback || "";
    }
    return defaultFallback || "";
  };

  const handleGameChange = (slug: string) => {
    setSelectedGameSlug(slug);
    if (onSelectGame) {
      onSelectGame(slug);
    }
  };

  return (
    <div className="px-0 pt-0.5 pb-1 animate-fadeIn select-none">
      {/* The Single Premium Rounded Horizontal Container matching the Sport Categories background exactly */}
      <div
        className={`w-full rounded-[14px] border p-2.5 ${
          theme === "light"
            ? "bg-gradient-to-br from-[#f8fbfe] via-[#f0f5fc] to-[#e6effa] border-slate-200/90 shadow-sm"
            : theme === "blue"
              ? "bg-[#3B6D99] border-blue-400/40"
              : "bg-[#0d0d0d] border-neutral-800/60"
        } shadow-sm`}
      >
        {/* Scrollable list inside the container */}
        <div className="flex items-center space-x-3.5 overflow-x-auto no-scrollbar py-0.5 px-2.5 -mx-2.5 scroll-smooth [touch-action:pan-x_pan-y]">
          {games.map((game, index) => {
            const isSelected = selectedGameSlug === game.slug;
            const isLoaded = loadedImages[game.id] || false;
            const computedUrl = getImageUrl(game.image_url, game.slug);

            return (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.02 }}
                onClick={() => handleGameChange(game.slug)}
                className="flex flex-col items-center shrink-0 w-[64px] touch-manipulation group cursor-pointer"
              >
                {/* Circular Game Image centered exactly like 1xBet Casino design */}
                <div
                  className={`relative w-11 h-11 rounded-full overflow-hidden transition-all duration-300 flex items-center justify-center ${
                    isSelected
                      ? theme === "light"
                        ? "border-2 border-blue-600 scale-105 shadow-[0_0_8px_rgba(37,99,235,0.3)]"
                        : "border-2 border-[#38bdf8] scale-105 shadow-[0_0_8px_rgba(56,189,248,0.4)]"
                      : theme === "light"
                        ? "border border-slate-200 group-hover:border-slate-300 bg-slate-50"
                        : "border border-white/10 group-hover:border-white/20 bg-black/30"
                  }`}
                >
                  {/* Image Skeleton / Loading State */}
                  <AnimatePresence>
                    {!isLoaded && (
                      <div className="absolute inset-0 bg-black/20 animate-pulse flex items-center justify-center rounded-full">
                        <div className="w-3 h-3 rounded-full border border-slate-500/30 border-t-transparent animate-spin" />
                      </div>
                    )}
                  </AnimatePresence>

                  {computedUrl && (
                    <img
                      src={computedUrl}
                      alt={game.title}
                      loading="lazy"
                      decoding="async"
                      onLoad={() => handleImageLoad(game.id)}
                      onError={(e) => {
                        const fallback =
                          FALLBACK_CASINO_GAMES.find((g) => g.slug === game.slug)?.image_url ||
                          FALLBACK_CASINO_GAMES[0].image_url;
                        if (e.currentTarget.src !== fallback) {
                          e.currentTarget.src = fallback;
                          e.currentTarget.referrerPolicy = "no-referrer";
                        }
                      }}
                      className={`w-full h-full object-cover rounded-full transition-opacity duration-300 ${
                        isLoaded ? "opacity-100" : "opacity-0"
                      }`}
                      referrerPolicy="no-referrer"
                    />
                  )}
                </div>

                {/* Game name below the circle */}
                <span
                  className={`text-[8px] leading-tight mt-1 font-bold uppercase tracking-wider text-center truncate max-w-full block select-none transition-colors duration-200 ${
                    isSelected
                      ? theme === "light"
                        ? "text-blue-600 font-black"
                        : "text-[#38bdf8] font-black"
                      : theme === "light"
                        ? "text-slate-500 group-hover:text-slate-800"
                        : theme === "blue"
                          ? "text-blue-100/60 group-hover:text-white"
                          : "text-slate-400 group-hover:text-slate-100"
                  }`}
                >
                  {getCasinoLabel(game.slug, game.title, lang)}
                </span>
              </motion.div>
            );
          })}
          {/* Spacer for edge alignment during scroll */}
          <div className="w-1 shrink-0" />
        </div>
      </div>
    </div>
  );
});
export default CasinoRow;
