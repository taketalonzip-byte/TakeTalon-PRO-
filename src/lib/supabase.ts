import { createClient } from "@supabase/supabase-js";

// Salama kwa ujenzi (safe for building/linting): Kama hakuna funguo tunatumia placeholder ili isiharibu dev server au build.
const rawSupabaseUrl =
  import.meta.env?.VITE_SUPABASE_URL ||
  process.env?.VITE_SUPABASE_URL ||
  process.env?.SUPABASE_URL ||
  "https://placeholder-project.supabase.co";

// Safely clean the URL if it contains "/rest/v1" or trailing slashes
const supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");

const supabaseAnonKey =
  import.meta.env?.VITE_SUPABASE_ANON_KEY ||
  process.env?.VITE_SUPABASE_ANON_KEY ||
  "placeholder-key";

export const isSupabaseConfigured =
  supabaseUrl !== "https://placeholder-project.supabase.co" &&
  supabaseAnonKey !== "placeholder-key";

if (!isSupabaseConfigured) {
  console.warn(
    "[SUPABASE-CONFIG-WARNING] Supabase credentials are not fully configured yet. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your settings or .env file.",
  );
}

// Public anon client — safe to use client-side
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Admin / Service Role client — SERVER-SIDE ONLY, never expose to browser
// Set SUPABASE_SERVICE_ROLE_KEY in your .env / hosting env (never with a VITE_ prefix)
// ─────────────────────────────────────────────────────────────────────────────
const supabaseServiceKey = process.env?.SUPABASE_SERVICE_ROLE_KEY || "";

export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

export const isAdminConfigured = !!supabaseServiceKey;

// ─────────────────────────────────────────────────────────────────────────────
// Helper: generate a unique username from first + last name
// Format: firstname_lastname (lowercase, alphanumeric + underscore only)
// ─────────────────────────────────────────────────────────────────────────────
export function buildUsernameBase(firstName: string, lastName: string): string {
  const clean = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, "");
  return `${clean(firstName)}_${clean(lastName)}`;
}

/**
 * Find a unique username by checking the database and appending a number if needed.
 * Falls back to base username when Supabase is not configured.
 */
export async function generateUniqueUsername(firstName: string, lastName: string): Promise<string> {
  const base = buildUsernameBase(firstName, lastName) || "user";

  if (!isSupabaseConfigured) {
    return base;
  }

  // Angalia kwa profiles table (users table haipo tena)
  const { data: existing } = await supabase
    .from("profiles")
    .select("username")
    .eq("username", base)
    .maybeSingle();

  if (!existing) return base;

  // Jaribu kuongeza nambari hadi tunapata unique
  for (let i = 1; i <= 999; i++) {
    const candidate = `${base}${i}`;
    const { data: taken } = await supabase
      .from("profiles")
      .select("username")
      .eq("username", candidate)
      .maybeSingle();
    if (!taken) return candidate;
  }

  // Fallback: base + timestamp suffix
  return `${base}${Date.now().toString(36)}`;
}
