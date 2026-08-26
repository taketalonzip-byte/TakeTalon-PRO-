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

// PATCH-IN-PROGRESS-DO-NOT-USE
