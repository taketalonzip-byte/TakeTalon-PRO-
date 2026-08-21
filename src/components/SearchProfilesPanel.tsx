/**
 * SearchProfilesPanel — inline profile search results kwenye Home feed.
 * Inaonyeshwa endapo searchQuery ina herufi >= 2. Inatumia searchProfiles
 * kutoka unlockService (ilike kwenye username / first_name / last_name).
 */

import React, { useEffect, useState } from "react";
import { Search, Loader2, UserCheck } from "lucide-react";
import VerifiedBadge from "./VerifiedBadge";
import { UserCircleSingleIcon } from "./MatchList";
import { searchProfiles, type PublicProfile } from "../lib/unlockService";

type Theme = "blue" | "dark" | "light";
type Lang = "en" | "fr" | "sw";

interface Props {
  query: string;
  authUserId: string | null;
  theme: Theme;
  lang?: Lang;
  onSelectProfile?: (p: PublicProfile) => void;
}

export default function SearchProfilesPanel({
  query,
  authUserId,
  theme,
  lang = "en",
  onSelectProfile,
}: Props) {
  const [results, setResults] = useState<PublicProfile[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await searchProfiles(q, authUserId);
        if (!cancelled) {
          setResults(r);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setResults([]);
          setLoading(false);
        }
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, authUserId]);

  if (query.trim().length < 2) return null;

  const cardBg =
    theme === "light"
      ? "bg-white border-slate-200"
      : theme === "blue"
        ? "bg-[#3B6D99] border-blue-400/40"
        : "bg-[#0d0d0d] border-neutral-800/60";

  const textPrimary = theme === "light" ? "text-slate-900" : "text-white";
  const textMuted = theme === "light" ? "text-slate-500" : "text-slate-400";

  const label = {
    title: lang === "sw" ? "Watumiaji" : lang === "fr" ? "Utilisateurs" : "Users",
    empty:
      lang === "sw"
        ? "Hakuna profile inayolingana"
        : lang === "fr"
          ? "Aucun profil trouvé"
          : "No profiles found",
    loading: lang === "sw" ? "Inatafuta…" : lang === "fr" ? "Recherche…" : "Searching…",
  };

  return (
    <div className="px-2 pt-2">
      <div className={`w-full rounded-2xl border ${cardBg} shadow-sm overflow-hidden`}>
        <div
          className={`flex items-center gap-2 px-3 py-2 text-[11px] font-bold uppercase tracking-wider ${textMuted} border-b ${theme === "light" ? "border-slate-200" : "border-white/10"}`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>{label.title}</span>
          {loading && <Loader2 className="w-3 h-3 animate-spin ml-auto" />}
        </div>
        {!loading && results && results.length === 0 && (
          <div className={`px-3 py-4 text-xs ${textMuted} text-center`}>{label.empty}</div>
        )}
        {loading && !results && (
          <div className={`px-3 py-4 text-xs ${textMuted} text-center`}>{label.loading}</div>
        )}
        {results && results.length > 0 && (
          <ul className="divide-y divide-white/5">
            {results.slice(0, 10).map((p) => {
              const fullName =
                [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || p.username;
              return (
                <li
                  key={p.id}
                  onClick={() => onSelectProfile && onSelectProfile(p)}
                  className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${onSelectProfile ? "cursor-pointer hover:bg-white/5" : ""}`}
                >
                  <div
                    className={`w-9 h-9 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold ${
                      theme === "light"
                        ? "bg-gradient-to-br from-blue-600 to-indigo-600 border border-blue-500/30 text-white"
                        : theme === "blue"
                          ? "bg-gradient-to-br from-blue-500/30 to-indigo-500/30 border border-blue-400/30 text-blue-100"
                          : "bg-gradient-to-br from-neutral-800 to-neutral-700 border border-neutral-700/80 text-white"
                    }`}
                  >
                    {p.avatar_url ? (
                      <img
                        src={p.avatar_url}
                        alt={fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserCircleSingleIcon className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`flex items-center gap-1 text-sm font-bold truncate ${textPrimary}`}
                    >
                      {fullName}
                      {p.is_verified && (
                        <VerifiedBadge className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      )}
                      {p.is_pro && <UserCheck className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                    <div className={`text-[11px] truncate ${textMuted}`}>@{p.username}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
