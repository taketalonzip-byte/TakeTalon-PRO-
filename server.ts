import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import dotenv from "dotenv";
import crypto from "crypto";
import { syncEspnCompetition, fetchEspnScoreboard, ESPN_LEAGUE_SLUGS } from "./src/lib/espnService";
import { getLeagueLogoUrl } from "./src/lib/leagueLogos";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ──────────────────────────────────────────────────────────────────────────────
// Supabase Backend Admin Client Initialization (Server-Side)
// ──────────────────────────────────────────────────────────────────────────────
const rawSupabaseUrl =
  (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim() ||
  "https://placeholder-project.supabase.co";

const supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
const supabaseServiceKey =
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "").trim() ||
  "placeholder-key";

const isDbConfigured =
  supabaseUrl !== "https://placeholder-project.supabase.co" &&
  supabaseUrl.length > 0 &&
  supabaseServiceKey !== "placeholder-key" &&
  supabaseServiceKey.length > 0;

const supabaseAdmin = isDbConfigured
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

// PATCH_MARKER_WILL_BE_REPLACED
