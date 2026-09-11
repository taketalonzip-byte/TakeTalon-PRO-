# TakeTalon PRO

TakeTalon PRO is a modern sports betting and peer-to-peer prediction platform featuring live match odds, P2P prediction pools, eSports, casino simulations, interactive TT multiplayer mini-games, and a full-featured digital wallet.

## Features

- **Sportsbook & Odds Hub**: Real-time sports match lists with competitive odds calculations and live updates.
- **P2P Prediction Slips**: User-generated prediction slips with odds unlocking and transparent settlements.
- **eSports & Casino Row**: Fast-paced simulations with fair game mechanics.
- **TT Interactive Games**: Turn-based multiplayer and vs-machine game modes.
- **Secure Digital Wallet**: Multi-currency ledger (FBU, TZS, USD, etc.), instant deposits, and P2P transfers.
- **Multi-Language Support**: Full Swahili (Kiswahili), French (Français), and English localization.
- **Theming**: Blue, Dark, and Light themes.

## Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm** or **pnpm** / **yarn**

## Getting Started

1. **Clone the repository and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment Variables:**
   Copy `.env.example` to `.env` and fill in your Supabase and Gemini credentials:
   ```bash
   cp .env.example .env
   ```

3. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

4. **Production Build:**
   ```bash
   npm run build
   ```

5. **Preview the Production Build:**
   ```bash
   npm start
   ```

Production is deployed as a **Cloudflare Pages** site at
[https://taketalon.pages.dev/](https://taketalon.pages.dev/). The repository no longer
builds or starts a separate Node web server; API traffic is served by the Cloudflare
Pages Functions under `functions/api`.

## License

Apache-2.0
