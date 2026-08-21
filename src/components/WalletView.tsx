/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import DepositPage from "./DepositPage";
import {
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Sparkles,
  ShieldCheck,
  History,
  TrendingUp,
  ArrowLeft,
  User,
  UserCheck,
  Eye,
  Languages,
  HelpCircle,
  Download,
  LogOut,
  ChevronRight,
  Home,
  Users,
  Wallet,
  Scale,
  X,
  CheckCircle2,
  Send,
  Copy,
  Gavel,
  UserPlus,
  MessageCircle,
  LifeBuoy,
  LayoutDashboard,
  FileText,
  Lock,
  Shield,
  Award,
  BookOpen,
  AlertTriangle,
  Ban,
  Trash2,
} from "lucide-react";
import TalonLogo from "./TalonLogo";
import SettingsIcon from "./SettingsIcon";
import ColorThemeIcon from "./ColorThemeIcon";
import EyeComfortIcon from "./EyeComfortIcon";
import InstallMobileIcon from "./InstallMobileIcon";
import PwaIcon from "./PwaIcon";
import HandshakeIcon from "./HandshakeIcon";
import HelpQuestionIcon from "./HelpQuestionIcon";
import PrivacyPadlockIcon from "./PrivacyPadlockIcon";
import SecurityFillIcon from "./SecurityFillIcon";
import OfficialLicenseIcon from "./OfficialLicenseIcon";
import ThreatPhoneIcon from "./ThreatPhoneIcon";
import { LegalSectionId } from "./LegalView";
import { Transaction } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { renderThemeIcon } from "./ThemeModeIcons";
import { UserCircleSingleIcon } from "./MatchList";

interface WalletChartProps {
  transactions: Transaction[];
  currentBalance: number;
  theme: "blue" | "dark" | "light";
  lang: "en" | "fr" | "sw";
}

function WalletChart({ transactions, currentBalance, theme, lang }: WalletChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);

  const chartLabels = {
    sw: {
      now: "Hivi sasa",
      currentBal: "Salio la sasa",
      daysAgo: (count: number) => `${count} siku zilizopita`,
      historyTrendDesc: "Mwenendo wa kihistoria wa salio",
      trendHeader: "Mwenendo wa Salio (Wallet Trend)",
      trendSub: "Mzunguko na uchambuzi wa kifedha",
      peak: "Kilele (Max)",
      lowest: "Kiwango cha Chini",
      net: "Nyongeza (Net)",
    },
    en: {
      now: "Current",
      currentBal: "Current balance",
      daysAgo: (count: number) => `${count} days ago`,
      historyTrendDesc: "Historical balance trend",
      trendHeader: "Wallet Trend",
      trendSub: "Transactions and financial analysis",
      peak: "Peak (Max)",
      lowest: "Lowest Balance",
      net: "Net Change",
    },
    fr: {
      now: "Actuel",
      currentBal: "Solde actuel",
      daysAgo: (count: number) => `Il y a ${count} jours`,
      historyTrendDesc: "Tendance historique du solde",
      trendHeader: "Tendance du Portefeuille",
      trendSub: "Transactions et analyses financières",
      peak: "Sommet (Max)",
      lowest: "Solde le plus bas",
      net: "Variation nette",
    },
  };

  const labels = chartLabels[lang] || chartLabels.sw;

  // 1. Reconstruct historical balances (newest first in transactions state)
  const reversedPoints: { balance: number; label: string; desc?: string }[] = [
    { balance: currentBalance, label: labels.now, desc: labels.currentBal },
  ];

  let tempBalance = currentBalance;
  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    const isProfit = tx.type === "DEPOSIT" || tx.type === "BET_WIN";
    if (isProfit) {
      tempBalance -= tx.amount;
    } else {
      tempBalance += tx.amount;
    }
    reversedPoints.push({
      balance: tempBalance,
      label: tx.date,
      desc: tx.description,
    });
  }

  const historyPoints = reversedPoints.reverse();

  // 2. Real history points for trend curve
  let chartData: { balance: number; label: string; desc?: string }[] = historyPoints;
  if (chartData.length === 0) {
    chartData = [{ balance: currentBalance, label: labels.now, desc: labels.historyTrendDesc }];
  }

  // 3. Compute SVG bounds and paths
  const H = 140;
  const W = 500;

  const balances = chartData.map((p) => p.balance);
  const minBal = Math.min(...balances);
  const maxBal = Math.max(...balances);
  const balRange = maxBal - minBal || 10000;

  // Dynamic Y-axis padding for pristine scaling
  const paddingY = balRange * 0.18;
  const yMinLimit = Math.max(0, minBal - paddingY);
  const yMaxLimit = maxBal + paddingY;
  const limitRange = yMaxLimit - yMinLimit;

  const pts = chartData.map((pt, i) => {
    const rawX = chartData.length > 1 ? (i / (chartData.length - 1)) * W : W / 2;
    const safeLimitRange = limitRange || 1;
    const rawY = H - ((pt.balance - yMinLimit) / safeLimitRange) * H;
    const x = Number.isNaN(rawX) || !Number.isFinite(rawX) ? 0 : rawX;
    const y = Number.isNaN(rawY) || !Number.isFinite(rawY) ? H / 2 : rawY;
    return { x, y };
  });

  // Generate high-resolution sub-points with micro-fluctuations (TradingView / Binance / Google Finance financial chart style)
  const highResPts = React.useMemo(() => {
    if (pts.length < 2) return pts;
    const SUB_STEPS = 8;
    const result: { x: number; y: number }[] = [];

    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const segmentDy = Math.abs(p2.y - p1.y);

      for (let k = 0; k <= SUB_STEPS; k++) {
        if (i > 0 && k === 0) continue; // Avoid duplicate boundary points

        const t = k / SUB_STEPS;
        const baseX = p1.x + (p2.x - p1.x) * t;
        const baseY = p1.y + (p2.y - p1.y) * t;

        // Envelope dampening ensures 0 offset at exact data points (t=0 and t=1)
        const envelope = Math.sin(t * Math.PI);

        // Deterministic multi-harmonic micro-waves for financial volatility feel
        const noise1 = Math.sin(i * 13.37 + k * 2.85);
        const noise2 = Math.cos(i * 7.12 + k * 4.41);
        const noise3 = Math.sin(i * 23.1 + k * 1.63);
        const noise = noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2;

        const amplitude = Math.min(7.8, 3.6 + segmentDy * 0.1);
        const offsetY = noise * amplitude * envelope;
        const finalY = Math.max(3, Math.min(H - 3, baseY + offsetY));

        result.push({ x: baseX, y: finalY });
      }
    }
    return result;
  }, [pts, H]);

  // High-precision Monotone / Tight Cubic Spline for high-density financial charts
  const linePath = React.useMemo(() => {
    if (highResPts.length === 0) return "";
    if (highResPts.length === 1) return `M ${highResPts[0].x} ${highResPts[0].y}`;

    let path = `M ${highResPts[0].x.toFixed(2)} ${highResPts[0].y.toFixed(2)}`;
    const tension = 0.16; // Smooth natural tension for high-resolution financial charts

    for (let i = 0; i < highResPts.length - 1; i++) {
      const p0 = highResPts[i === 0 ? i : i - 1];
      const p1 = highResPts[i];
      const p2 = highResPts[i + 1];
      const p3 = highResPts[i + 2 < highResPts.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;

      path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }
    return path;
  }, [highResPts]);

  const areaPath = React.useMemo(() => {
    if (highResPts.length === 0 || !linePath) return "";
    const lastPt = highResPts[highResPts.length - 1];
    const firstPt = highResPts[0];
    return `${linePath} L ${lastPt.x.toFixed(2)} ${H} L ${firstPt.x.toFixed(2)} ${H} Z`;
  }, [linePath, highResPts, H]);

  // Compute stats for display
  const highestBalance = Math.max(...balances);
  const lowestBalance = Math.min(...balances);
  const netChange = currentBalance - chartData[0].balance;
  const percentChange = ((netChange / (chartData[0].balance || 1)) * 100).toFixed(1);

  // Active hover/touch coordinate tracker
  const handleMouseMove = (
    e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>,
  ) => {
    if (!svgRef.current || pts.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    let clientX = 0;
    if ("touches" in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
    } else {
      clientX = e.clientX;
    }
    const relativeX = clientX - rect.left;
    const percentageX = relativeX / rect.width;
    const index = Math.max(0, Math.min(pts.length - 1, Math.round(percentageX * (pts.length - 1))));
    setHoveredIndex(index);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  // Styled colors based on theme - chart card background remains black as requested
  const cardThemeClass = "bg-[#0d0d0d] border border-neutral-800/80 shadow-xl text-slate-100";

  const gridLineColor = "rgba(255,255,255,0.04)";
  const dottedLineColor = "rgba(255,255,255,0.18)";

  return (
    <div
      className={`rounded-2xl border p-3.5 space-y-3 relative overflow-hidden transition-all duration-300 ${cardThemeClass}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1.5">
          <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-500">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-[10.5px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {labels.trendHeader}
            </h4>
            <p className="text-[9.5px] text-slate-500 mt-0.5">{labels.trendSub}</p>
          </div>
        </div>
        <div
          className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-[8.5px] font-bold ${
            netChange >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
          }`}
        >
          <span>
            {netChange >= 0 ? "↗" : "↘"} {Math.abs(netChange).toLocaleString()} FBU
          </span>
          <span>
            ({netChange >= 0 ? "+" : ""}
            {percentChange}%)
          </span>
        </div>
      </div>

      {/* SVG Canvas Stage Area */}
      <div className="relative h-[125px] mt-1 select-none touch-pan-y">
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          onMouseMove={handleMouseMove}
          onTouchMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onTouchEnd={handleMouseLeave}
          className="overflow-visible cursor-crosshair"
        >
          {/* Gradients */}
          <defs>
            <linearGradient id="chartAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity={theme === "light" ? 0.16 : 0.22} />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="chartLineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            {/* Soft shadow for line path */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow
                dx="0"
                dy="2"
                stdDeviation="2"
                floodColor="#22c55e"
                floodOpacity="0.2"
              />
            </filter>
          </defs>

          {/* Horizontal Gridlines */}
          <line x1="0" y1={H * 0.25} x2={W} y2={H * 0.25} stroke={gridLineColor} strokeWidth="1" />
          <line x1="0" y1={H * 0.5} x2={W} y2={H * 0.5} stroke={gridLineColor} strokeWidth="1" />
          <line x1="0" y1={H * 0.75} x2={W} y2={H * 0.75} stroke={gridLineColor} strokeWidth="1" />

          {/* Dotted Reference Baseline representing initial balance */}
          <line
            x1="0"
            y1={pts[0]?.y || H / 2}
            x2={W}
            y2={pts[0]?.y || H / 2}
            stroke={dottedLineColor}
            strokeWidth="1.2"
            strokeDasharray="4 4"
          />

          {/* Area under curve */}
          <path d={areaPath} fill="url(#chartAreaGradient)" />

          {/* Main Bezier spline graphics line (Thin & Sleek) */}
          <path
            d={linePath}
            fill="none"
            stroke="url(#chartLineGradient)"
            strokeWidth="1.5"
            strokeLinecap="round"
            filter="url(#glow)"
          />

          {/* Active Highlight Dot moving with cursor */}
          {hoveredIndex !== null && pts[hoveredIndex] && !Number.isNaN(pts[hoveredIndex].x) && !Number.isNaN(pts[hoveredIndex].y) && (
            <>
              {/* Vertical dotted cursor tracking line */}
              <line
                x1={pts[hoveredIndex].x}
                y1="0"
                x2={pts[hoveredIndex].x}
                y2={H}
                stroke={theme === "light" ? "rgba(15,23,42,0.12)" : "rgba(255,255,255,0.08)"}
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              {/* Pulsing glow outer ring */}
              <circle
                cx={pts[hoveredIndex].x}
                cy={pts[hoveredIndex].y}
                r="8"
                fill="#22c55e"
                opacity="0.3"
                className="animate-ping"
              />
              {/* Core solid highlighted dot */}
              <circle
                cx={pts[hoveredIndex].x}
                cy={pts[hoveredIndex].y}
                r="4.5"
                fill="#ffffff"
                stroke="#10b981"
                strokeWidth="2.5"
                className="transition-all duration-75"
              />
            </>
          )}

          {/* Always show glowing pulsing green dot at final point if not hovering */}
          {hoveredIndex === null && pts[pts.length - 1] && !Number.isNaN(pts[pts.length - 1].x) && !Number.isNaN(pts[pts.length - 1].y) && (
            <>
              <circle
                cx={pts[pts.length - 1].x}
                cy={pts[pts.length - 1].y}
                r="7"
                fill="#22c55e"
                opacity="0.25"
                className="animate-ping"
              />
              <circle
                cx={pts[pts.length - 1].x}
                cy={pts[pts.length - 1].y}
                r="4"
                fill="#22c55e"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            </>
          )}
        </svg>

        {/* Floating Glassmorphic Tooltip Overlay */}
        <AnimatePresence>
          {hoveredIndex !== null && chartData[hoveredIndex] && (
            <motion.div
              initial={{ opacity: 0, y: 5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              className={`absolute top-1 z-10 p-2.5 rounded-xl border text-[10px] space-y-0.5 shadow-xl pointer-events-none ${
                hoveredIndex > chartData.length / 2 ? "left-2" : "right-2"
              } ${
                theme === "light"
                  ? "bg-white/95 backdrop-blur-md border-slate-300 text-slate-800"
                  : "bg-slate-950/95 backdrop-blur-md border-slate-800 text-slate-100"
              }`}
            >
              <p className="text-[9px] text-slate-400 font-semibold">
                {chartData[hoveredIndex].label}
              </p>
              <h5 className="font-mono font-black text-sm text-emerald-500">
                FBU {chartData[hoveredIndex].balance.toLocaleString()}
              </h5>
              <p className="text-[9.5px] truncate max-w-[150px] font-medium text-slate-500">
                {chartData[hoveredIndex].desc}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Grid of secondary premium statistics */}
      <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-slate-100 dark:border-neutral-900">
        <div className="text-center">
          <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            {labels.peak}
          </span>
          <span className="text-[11px] font-mono font-black text-slate-800 dark:text-slate-200 mt-0.5 block">
            {highestBalance.toLocaleString()}
          </span>
        </div>
        <div className="text-center border-x border-slate-100 dark:border-neutral-900">
          <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            {labels.lowest}
          </span>
          <span className="text-[11px] font-mono font-black text-slate-800 dark:text-slate-200 mt-0.5 block">
            {lowestBalance.toLocaleString()}
          </span>
        </div>
        <div className="text-center">
          <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            {labels.net}
          </span>
          <span
            className={`text-[11px] font-mono font-black mt-0.5 block ${netChange >= 0 ? "text-emerald-500" : "text-rose-500"}`}
          >
            {netChange >= 0 ? "+" : ""}
            {netChange.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

interface WalletViewProps {
  userBalance: number;
  setUserBalance: React.Dispatch<React.SetStateAction<number>>;
  transactions: Transaction[];
  isPro: boolean;
  setIsPro: (pro: boolean) => void;
  onAddTransaction: (
    type: "DEPOSIT" | "WITHDRAW" | "BET_PLACE" | "BET_WIN" | "UPGRADE_PRO",
    amount: number,
    description: string,
  ) => void;
  /** profiles.id ya mtumiaji aliyeingia — inahitajika kusync deposit/withdraw kwa Supabase */
  profileId?: string | null;
  theme: "blue" | "dark" | "light";
  setTheme?: (theme: "blue" | "dark" | "light") => void;
  onAddNotification: (message: string, type: "success" | "error" | "info") => void;
  t: any;
  lang: "en" | "fr" | "sw";
  setLang?: (lang: "en" | "fr" | "sw") => void;
  onBackToHome?: () => void;
  isLifetime?: boolean;
  setIsLifetime?: (lifetime: boolean) => void;
  currentUser?: { isLoggedIn: boolean; username: string; email: string; phone?: string; avatarUrl?: string | null; role?: string | null } | null;
  setCurrentUser?: any;
  onOpenAuth?: () => void;
  eyeComfort?: boolean;
  setEyeComfort?: (val: boolean) => void;
  setShowSplash?: (val: boolean) => void;
  setActiveTab?: (tab: any) => void;
  setLegalSection?: (section: LegalSectionId) => void;
  handleInstallPWA?: () => void;
}

export default function WalletView({
  userBalance,
  setUserBalance,
  transactions,
  isPro,
  setIsPro,
  onAddTransaction,
  profileId,
  theme,
  setTheme,
  onAddNotification,
  t,
  lang,
  setLang,
  onBackToHome = () => {},
  isLifetime: propIsLifetime,
  setIsLifetime: propSetIsLifetime,
  currentUser,
  setCurrentUser,
  onOpenAuth,
  eyeComfort = false,
  setEyeComfort,
  setShowSplash,
  setActiveTab,
  setLegalSection,
  handleInstallPWA,
}: WalletViewProps) {
  const [showDepositPage, setShowDepositPage] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [agents, setAgents] = useState<{ name: string; phone: string; avatarLetter: string }[]>([]);

  // Menu Legal, Security, Privacy & Compliance Modal State removed (using LegalView component instead)



  // Modals for Invite Friends & Contact Support
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [contactSubject, setContactSubject] = useState("");
  const [contactMsg, setContactMsg] = useState("");

  // Role verification helper for Admin and Governance rows
  const roleUpper = (currentUser?.role || "").toUpperCase();
  const isAdminUser = roleUpper === "ADMIN" || roleUpper === "SUPER_ADMIN" || roleUpper === "OWNER";
  const isGovernanceUser = roleUpper === "SUPER_ADMIN" || roleUpper === "OWNER";

  const [localIsLifetime, setLocalIsLifetime] = useState<boolean>(false);

  const isLifetime = propIsLifetime !== undefined ? propIsLifetime : localIsLifetime;
  const setIsLifetime = (val: boolean) => {
    if (propSetIsLifetime) {
      propSetIsLifetime(val);
    } else {
      setLocalIsLifetime(val);
    }
  };

  if (showDepositPage) {
    return (
      <DepositPage
        userBalance={userBalance}
        setUserBalance={setUserBalance}
        onAddTransaction={onAddTransaction}
        theme={theme}
        onAddNotification={onAddNotification}
        lang={lang}
        onBack={() => setShowDepositPage(false)}
        currentUser={currentUser}
        profileId={profileId}
      />
    );
  }

  const [withdrawAmount, setWithdrawAmount] = useState(5000);
  const [paymentMethod, setPaymentMethod] = useState("M-Pesa");

  const withdrawErr =
    lang === "sw"
      ? "Huna salio la kutosha kutoa kiasi hiki!"
      : lang === "fr"
        ? "Solde insuffisant pour effectuer ce retrait!"
        : "Insufficient balance to perform this withdrawal!";
  const withdrawDesc =
    lang === "sw"
      ? `Utoaji kupitia ${paymentMethod}`
      : lang === "fr"
        ? `Retrait via ${paymentMethod}`
        : `Withdrawal via ${paymentMethod}`;
  const withdrawSuccessMsg =
    lang === "sw"
      ? `Maombi yako ya kutoa FBU ${withdrawAmount.toLocaleString()} yamepokelewa na yanashughulikiwa!`
      : lang === "fr"
        ? `Votre demande de retrait de FBU ${withdrawAmount.toLocaleString()} a été reçue et est en cours de traitement!`
        : `Your request to withdraw FBU ${withdrawAmount.toLocaleString()} has been received and is being processed!`;

  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isWithdrawing) return;
    if (userBalance < withdrawAmount) {
      onAddNotification(withdrawErr, "error");
      return;
    }

    setIsWithdrawing(true);
    const previousBalance = userBalance;
    setUserBalance((prev) => prev - withdrawAmount);

    try {
      if (profileId) {
        const res = await fetch("/api/supabase/wallet-withdraw", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile_id: profileId, amount: withdrawAmount }),
        });
        if (!res.ok) throw new Error("Backend rejected withdrawal");
      }
      onAddTransaction("WITHDRAW", withdrawAmount, withdrawDesc);
      setShowWithdrawModal(false);
      onAddNotification(withdrawSuccessMsg, "success");
    } catch (err) {
      setUserBalance(previousBalance);
      onAddNotification(
        lang === "sw" ? "Imeshindwa kutoa pesa. Jaribu tena." : lang === "fr" ? "Échec du retrait. Veuillez réessayer." : "Withdrawal failed. Please try again.",
        "error",
      );
    } finally {
      setIsWithdrawing(false);
    }
  };

  const upgradeErr =
    lang === "sw"
      ? "Huna salio la kutosha kukamilisha muamala huu! Tafadhali weka salio kwanza."
      : lang === "fr"
        ? "Solde insuffisant pour compléter cette transaction ! Veuillez d'abord recharger."
        : "Insufficient funds to complete this transaction! Please deposit funds first.";
  const upgradeDesc =
    lang === "sw"
      ? "Kujiunga na TakeTalon PRO membership ya Mwezi mmoja"
      : lang === "fr"
        ? "Souscription à l'abonnement mensuel TakeTalon PRO"
        : "Subscription to one month TakeTalon PRO membership";
  const upgradeSuccessMsg =
    lang === "sw"
      ? "Hongera! Sasa wewe ni mwanachama wa TakeTalon PRO. Umefungua doti zote za siri za dhahabu na Console Pro AI Predictor!"
      : lang === "fr"
        ? "Félicitations ! Vous êtes maintenant membre de TakeTalon PRO. Vous avez débloqué tous les secrets dorés et Console Pro AI !"
        : "Congratulations! You are now a TakeTalon PRO member. You have unlocked all golden secret tips and Console Pro AI Predictor!";

  // MOCK: Local-only simulation, haina backend persistence bado. Lazima iunganishwe na /api endpoint wakati wa Backend Integration Phase.
  const handleUpgradeToPro = () => {
    if (isPro) return;
    const upgradeCost = 15000; // 15K FBU
    if (userBalance < upgradeCost) {
      onAddNotification(upgradeErr, "error");
      return;
    }
    setUserBalance((prev) => prev - upgradeCost);
    setIsPro(true);
    onAddTransaction("UPGRADE_PRO", upgradeCost, upgradeDesc);
    onAddNotification(upgradeSuccessMsg, "success");
  };

  const balanceTitle =
    lang === "sw"
      ? "Salio Lako la Sasa"
      : lang === "fr"
        ? "Votre Solde Actuel"
        : "Your Current Balance";
  const depositBtnText = lang === "sw" ? "Weka Salio" : lang === "fr" ? "Déposer" : "Deposit";
  const withdrawBtnText = lang === "sw" ? "Kutoa Pesa" : lang === "fr" ? "Retirer" : "Withdraw";
  const planSectionHeader =
    lang === "sw"
      ? "MIPANGO YA PREMIUM MEMBERSHIP"
      : lang === "fr"
        ? "PLANS D'ABONNEMENT PREMIUM"
        : "PREMIUM MEMBERSHIP PLANS";
  const durationText = lang === "sw" ? "Mwezi mmoja" : lang === "fr" ? "Un mois" : "One month";

  const featuresList =
    lang === "sw"
      ? [
          "Doti zote za siri za dhahabu kufunguliwa",
          "Console Pro AI Predictor - Uchambuzi usio na kikomo",
          "Tahadhari za siri kupitia Whatsapp / SMS",
          "Kipaumbele kikubwa kwenye doti za dharura za 95%+",
        ]
      : lang === "fr"
        ? [
            "Débloquez tous les secrets dorés VIP",
            "Console Pro AI Predictor - Analyses illimitées",
            "Alertes secrètes via WhatsApp / SMS",
            "Haute priorité sur les opportunités urgentes de 95%+",
          ]
        : [
            "Unlock all golden VIP secret tips",
            "Console Pro AI Predictor - Unlimited analysis",
            "Secret alerts via WhatsApp / SMS",
            "High priority on 95%+ emergency opportunities",
          ];

  const proSuccessStatus =
    lang === "sw"
      ? "Akaunti yako tayari ni PRO Elite"
      : lang === "fr"
        ? "Votre compte est déjà PRO Elite"
        : "Your account is already PRO Elite";
  const upgradeBtnAction =
    lang === "sw"
      ? "Anza PRO Elite Sasa (FBU 15,000)"
      : lang === "fr"
        ? "Devenir PRO Elite Sasa (FBU 15,000)"
        : "Start PRO Elite Now (FBU 15,000)";
  const txHistoryHeader =
    lang === "sw"
      ? "HISTORIA YA MIAMALA"
      : lang === "fr"
        ? "HISTORIQUE DES TRANSACTIONS"
        : "TRANSACTION HISTORY";
  const noTxMsg =
    lang === "sw"
      ? "Hakuna miamala iliyofanyika bado."
      : lang === "fr"
        ? "Aucune transaction effectuée pour le moment."
        : "No transactions performed yet.";

  return (
    <div className="px-3.5 py-3 space-y-3.5 max-w-lg mx-auto pb-20 text-left">
      {/* Title Header with Back Button (Aviator Style) */}
      <div className="flex items-center justify-between shrink-0 mb-1">
        <div className="flex items-center space-x-2">
          <button
            onClick={onBackToHome}
            className={`p-2 rounded-xl border transition-all active:scale-95 cursor-pointer ${
              theme === "light"
                ? "bg-white border-slate-200 text-slate-755 hover:bg-slate-50"
                : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-850"
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <div>
            <h2
              className={`font-display font-black text-xs tracking-wide uppercase leading-tight ${theme === "light" ? "text-slate-800" : "text-slate-100"}`}
            >
              {lang === "sw"
                ? "Menu & Mkoba VIP"
                : lang === "fr"
                  ? "Menu & Portefeuille"
                  : "Menu & Wallet VIP"}
            </h2>
            <p
              className={`text-[9px] leading-tight ${theme === "light" ? "text-slate-500" : "text-slate-400"}`}
            >
              {lang === "sw"
                ? "Dhibiti akaunti yako na miamala yako"
                : lang === "fr"
                  ? "Gerez votre compte et miamala"
                  : "Manage account & transactions"}
            </p>
          </div>
        </div>
      </div>

      {/* 1. WASIFU / USER PROFILE ACCOUNT CARD */}
      <div className="space-y-2">
        {currentUser && currentUser.isLoggedIn ? (
          <div
            className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
              theme === "light"
                ? "bg-gradient-to-br from-[#f8fbfe] via-[#f0f5fc] to-[#e6effa] border-slate-200/90 shadow-[0_4px_16px_rgba(15,23,42,0.03)]"
                : "bg-slate-900/40 border-slate-850"
            }`}
          >
            <div className="flex items-center space-x-3 min-w-0">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs shadow-md shrink-0 overflow-hidden ${
                  theme === "light"
                    ? "bg-gradient-to-br from-blue-600 to-indigo-600 border border-blue-500/30 text-white"
                    : theme === "blue"
                      ? "bg-gradient-to-br from-blue-500/30 to-indigo-500/30 border border-blue-400/30 text-blue-100"
                      : "bg-gradient-to-br from-neutral-800 to-neutral-700 border border-neutral-700/80 text-white"
                }`}
              >
                {currentUser?.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.username}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <UserCircleSingleIcon className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0 text-left">
                <div className="flex items-center space-x-1.5">
                  <h4
                    className={`text-xs font-black truncate max-w-[120px] ${theme === "light" ? "text-slate-900" : "text-slate-100"}`}
                  >
                    {currentUser.username}
                  </h4>
                  <span className="text-[6.5px] font-black px-1 py-0.5 rounded border uppercase tracking-wider text-amber-400 bg-amber-400/10 border-amber-400/20">
                    {isPro ? "PRO ELITE" : "ACTIVE"}
                  </span>
                </div>
                <p className="text-[8.5px] text-slate-500 truncate mt-0.5">
                  {currentUser.phone ? currentUser.phone.replace(/(\d{3})\d+(\d{3})$/, "$1***$2") : currentUser.email}
                </p>
              </div>
            </div>
            {setActiveTab && (
              <button
                onClick={() => setActiveTab("Profile")}
                className="text-[9px] font-black text-blue-400 hover:underline px-2 py-1 rounded bg-blue-500/5 active:scale-95 transition-all shrink-0 cursor-pointer"
              >
                {lang === "sw" ? "Wasifu" : "Profil"}
              </button>
            )}
          </div>
        ) : (
          <div
            className={`p-4 rounded-2xl border text-center space-y-3 ${
              theme === "light"
                ? "bg-gradient-to-br from-[#f8fbfe] via-[#f0f5fc] to-[#e6effa] border-slate-200/90 shadow-sm"
                : "bg-slate-900/40 border-slate-850"
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/20 flex items-center justify-center mx-auto">
              <User className="w-4 h-4" />
            </div>
            <div className="text-center">
              <h4
                className={`text-xs font-black ${theme === "light" ? "text-slate-800" : "text-slate-200"}`}
              >
                {lang === "sw" ? "Karibu TakeTalon VIP" : "Welcome to TakeTalon VIP"}
              </h4>
              <p className="text-[9px] text-slate-500 leading-relaxed max-w-[260px] mx-auto mt-0.5">
                {lang === "sw"
                  ? "Ingia sasa ufungue jamvi lako la doti zenye ushindi."
                  : "Log in now to access your premium membership predictions."}
              </p>
            </div>
            {onOpenAuth && (
              <button
                onClick={onOpenAuth}
                className="w-full py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-xl flex items-center justify-center space-x-1.5 shadow-md active:scale-98 transition-all cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5 text-slate-950" />
                <span>{lang === "sw" ? "Ingia / Jisajili" : "Log In / Register"}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Balances Card */}
      <div
        className={`relative overflow-hidden rounded-2xl border p-4 shadow-xl transition-all duration-300 ${
          theme === "light"
            ? "border-slate-200/90 bg-gradient-to-br from-[#f8fbfe] via-[#f0f5fc] to-[#e6effa] shadow-sm"
            : theme === "blue"
              ? "border-blue-400/40 bg-[#3B6D99] text-white shadow-lg"
              : "border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950"
        }`}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>
        <p
          className={`text-[9.5px] font-black uppercase tracking-widest ${
            theme === "light"
              ? "text-slate-600 font-bold"
              : theme === "blue"
                ? "text-blue-100"
                : "text-slate-500"
          }`}
        >
          {balanceTitle}
        </p>
        <h2 className="text-2xl font-display font-black tracking-tight mt-1 flex items-baseline text-emerald-600 dark:text-emerald-400">
          <span className="text-xs font-bold mr-1 text-emerald-700/80 dark:text-emerald-400/80">
            FBU
          </span>
          {userBalance.toLocaleString()}
        </h2>

        {/* Action button triggers */}
        <div className="grid grid-cols-2 gap-2.5 mt-3.5">
          <button
            id="deposit-trigger-btn"
            onClick={() => {
              if (setActiveTab) {
                setActiveTab("Deposit");
              } else {
                setShowDepositPage(true);
              }
            }}
            className={`flex items-center justify-center space-x-1 py-1.5 rounded-lg font-black text-[11px] cursor-pointer transition-colors active:scale-95 border ${
              theme === "light"
                ? "bg-blue-600 hover:bg-blue-700 border-blue-600 text-white shadow-sm"
                : theme === "blue"
                  ? "bg-[#0c1425] hover:bg-[#121c33] border-[#172540] text-white"
                  : "bg-blue-600/10 hover:bg-blue-600/25 border-blue-500/40 text-blue-400"
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>{depositBtnText}</span>
          </button>
          <button
            id="withdraw-trigger-btn"
            onClick={() => setShowWithdrawModal(true)}
            className={`flex items-center justify-center space-x-1 py-1.5 rounded-lg font-bold text-[11px] cursor-pointer transition-colors active:scale-95 border ${
              theme === "light"
                ? "bg-white hover:bg-slate-50 border-slate-200/90 text-slate-800 shadow-xs"
                : theme === "blue"
                  ? "bg-[#121c33] hover:bg-[#172540] border-[#1e355c] text-slate-200"
                  : "bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-300"
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{withdrawBtnText}</span>
          </button>
        </div>
      </div>

      {/* Wallet Trend Masterpiece Chart */}
      <WalletChart
        transactions={transactions}
        currentBalance={userBalance}
        theme={theme}
        lang={lang}
      />

      {/* Subscription premium card selector */}
      <div className="space-y-2">
        <div className="flex items-center space-x-1.5">
          <span className="w-1.2 h-2.5 bg-amber-500 rounded-full"></span>
          <h3
            className={`text-[10.5px] font-black uppercase tracking-wider ${theme === "light" ? "text-slate-500" : "text-slate-400"}`}
          >
            {planSectionHeader}
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-3 text-left">
          {/* Card 1: TakeTalon PRO Elite (Monthly) */}
          <div
            className={`relative overflow-hidden rounded-xl border p-4 shadow-xl backdrop-blur-md ${
              theme === "light"
                ? "border-amber-500/30 bg-gradient-to-br from-[#f8fbfe] via-[#f0f5fc] to-[#e6effa]"
                : "border-amber-500/30 bg-slate-900/40"
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/5 to-transparent -translate-x-full animate-[shimmer_6s_infinite_linear]" />

            <div className="flex items-start justify-between relative z-10 text-left">
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[8.5px] font-black uppercase tracking-widest bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded">
                    BEST OFFER
                  </span>
                  <span className="text-amber-550 font-bold text-[10.5px]">{durationText}</span>
                </div>
                <h4
                  className={`text-base font-display font-black tracking-tight mt-0.5 ${theme === "light" ? "text-slate-800" : "text-slate-100"}`}
                >
                  TakeTalon PRO Elite
                </h4>
              </div>

              <div className="text-right">
                <span
                  className={`text-[9.5px] block line-through ${theme === "light" ? "text-slate-400" : "text-slate-500"}`}
                >
                  FBU 30,000
                </span>
                <span className="text-sm font-mono font-black text-amber-550">FBU 15,000</span>
              </div>
            </div>

            <ul
              className={`mt-3 space-y-1.5 text-[11px] relative z-10 text-left ${theme === "light" ? "text-slate-650" : "text-slate-300"}`}
            >
              {featuresList.map((feature, idx) => (
                <li key={idx} className="flex items-center space-x-1.5">
                  <Check className="w-3 h-3 text-amber-550 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button
              id="upgrade-submit-pro-btn"
              onClick={handleUpgradeToPro}
              disabled={isPro}
              className={`w-full mt-3 py-2 rounded-lg font-display font-black text-[10.5px] uppercase tracking-widest flex items-center justify-center space-x-1 cursor-pointer shadow-md transition-all ${
                isPro
                  ? "bg-emerald-550/15 text-emerald-600 border border-emerald-300 shadow-none cursor-default"
                  : "shimmer-gold text-slate-950 hover:scale-[1.01] active:scale-[0.99] shadow-amber-500/15"
              }`}
            >
              {isPro ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{proSuccessStatus}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                  <span>{upgradeBtnAction}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 5. PREFERENCES & APPEARANCE (Theme, Language, Eye Comfort) */}
      <div className="space-y-2">
        <div className="flex items-center space-x-1.5">
          <span className="w-1.2 h-2.5 bg-blue-500 rounded-full"></span>
          <h3
            className={`text-[10.5px] font-black uppercase tracking-wider ${theme === "light" ? "text-slate-500" : "text-slate-400"}`}
          >
            {lang === "sw"
              ? "MAREKEBISHO & LUGHA"
              : lang === "fr"
                ? "PRÉFÉRENCES & STYLE"
                : "PREFERENCES & THEMES"}
          </h3>
        </div>

        <div className="space-y-2">
          {/* Eye Comfort Mode */}
          <div
            className={`p-2.5 rounded-xl flex items-center justify-between text-xs ${theme === "light" ? "border border-slate-200/90 bg-gradient-to-br from-[#f8fbfe] via-[#f0f5fc] to-[#e6effa] shadow-xs" : "bg-slate-950/40"}`}
          >
            <div className="flex items-center space-x-2">
              <div
                className={`p-1.5 rounded-lg ${eyeComfort ? "bg-amber-500/10 text-amber-400" : "bg-slate-900/40 text-slate-500"}`}
              >
                <EyeComfortIcon className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <p
                  className={`font-black text-[10px] ${theme === "light" ? "text-slate-800" : "text-slate-200"}`}
                >
                  {t.machoSalama}
                </p>
                <p className="text-[8px] text-slate-500">{t.machoSalamaDesc}</p>
              </div>
            </div>
            {setEyeComfort && (
              <button
                type="button"
                onClick={() => setEyeComfort(!eyeComfort)}
                className={`w-9 h-4.5 rounded-full p-0.5 transition-colors duration-300 focus:outline-none cursor-pointer ${
                  eyeComfort ? "bg-amber-500" : "bg-slate-400/20"
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full shadow-sm transform duration-300 bg-white ${
                    eyeComfort ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            )}
          </div>

          {/* Theme Palette (Enlarged & Prominent Size) */}
          <div
            className={`space-y-2.5 p-3 rounded-2xl ${theme === "light" ? "border border-slate-200/90 bg-gradient-to-br from-[#f8fbfe] via-[#f0f5fc] to-[#e6effa] shadow-xs" : "bg-slate-950/40"}`}
          >
            <div className="flex items-center space-x-2 text-[10px] font-black text-slate-500 uppercase tracking-wider text-left">
              <ColorThemeIcon className="w-4 h-4 text-sky-400" />
              <span>{t.themeSelection || "RANGI YA MFUMO"}</span>
            </div>
            {setTheme && (
              <div className="grid grid-cols-3 gap-2 pt-0.5">
                {[
                  { code: "blue", label: "Slate" },
                  { code: "dark", label: "Dark" },
                  { code: "light", label: "Light" },
                ].map((item) => (
                  <button
                    key={item.code}
                    onClick={() => setTheme(item.code as any)}
                    className={`py-3 px-2 rounded-xl text-center transition-all duration-200 cursor-pointer border flex flex-col items-center justify-center space-y-2 ${
                      theme === item.code
                        ? "bg-blue-500/15 border-blue-500 text-blue-400 font-black shadow-md shadow-blue-500/10 scale-[1.02]"
                        : theme === "light"
                          ? "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300"
                          : "bg-slate-950/60 border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      theme === item.code
                        ? "bg-blue-500/20 text-blue-400"
                        : theme === "light"
                          ? "bg-slate-200/80 text-slate-600"
                          : "bg-slate-900 text-slate-400"
                    }`}>
                      {renderThemeIcon(item.code, "w-5 h-5")}
                    </div>
                    <span className="block truncate text-[9px] font-black uppercase tracking-wider">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5.5 MANAGEMENT & SYSTEM ADMINISTRATION */}
      <div className="space-y-2">
        <div className="flex items-center space-x-1.5">
          <span className="w-1.2 h-2.5 bg-blue-500 rounded-full"></span>
          <h3
            className={`text-[10.5px] font-black uppercase tracking-wider ${theme === "light" ? "text-slate-500" : "text-slate-400"}`}
          >
            {lang === "sw" ? "MIPANGILIO & UTAWALA" : "SETTINGS & ADMINISTRATION"}
          </h3>
        </div>

        <div
          className={`rounded-2xl p-1 text-left ${
            theme === "light" ? "bg-gradient-to-br from-[#f8fbfe] via-[#f0f5fc] to-[#e6effa] border border-slate-200/90 shadow-xs" : "bg-slate-900/20"
          }`}
        >
          {/* Mipangilio / Settings */}
          {setActiveTab && (
            <button
              onClick={() => setActiveTab("Settings")}
              className={`w-full text-left p-2 rounded-xl flex items-center justify-between transition-all duration-200 cursor-pointer ${
                theme === "light"
                  ? "text-slate-700 hover:bg-slate-50"
                  : "text-slate-300 hover:bg-slate-900/40"
              }`}
            >
              <span className="flex items-center space-x-2.5 text-[10px]">
                <SettingsIcon className="w-4 h-4 text-blue-400" />
                <span className="font-extrabold uppercase tracking-wide">
                  {lang === "sw" ? "Mipangilio" : "Settings"}
                </span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
          )}

          {/* Admin Dashboard (Visible for Admin / Super Admin / Owner) */}
          {isAdminUser && setActiveTab && (
            <button
              onClick={() => setActiveTab("Admin")}
              className={`w-full text-left p-2 rounded-xl flex items-center justify-between transition-all duration-200 cursor-pointer ${
                theme === "light"
                  ? "text-blue-900 bg-blue-50/50 hover:bg-blue-100/50 border border-blue-200/50"
                  : "text-cyan-300 bg-cyan-950/20 hover:bg-cyan-900/30 border border-cyan-500/20"
              }`}
            >
              <span className="flex items-center space-x-2.5 text-[10px]">
                <LayoutDashboard className="w-4 h-4 text-cyan-400" />
                <span className="font-extrabold uppercase tracking-wide">
                  {lang === "sw" ? "Admin Dashboard" : "Admin Dashboard"}
                </span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="text-[8px] font-mono font-black px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 uppercase">
                  ADMIN
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />
              </span>
            </button>
          )}

          {/* Governance Panel (Visible for Super Admin / CEO / Owner) */}
          {isGovernanceUser && setActiveTab && (
            <button
              onClick={() => setActiveTab("Governance")}
              className={`w-full text-left p-2 rounded-xl flex items-center justify-between transition-all duration-200 cursor-pointer ${
                theme === "light"
                  ? "text-purple-900 bg-purple-50/50 hover:bg-purple-100/50 border border-purple-200/50"
                  : "text-purple-300 bg-purple-950/20 hover:bg-purple-900/30 border border-purple-500/20"
              }`}
            >
              <span className="flex items-center space-x-2.5 text-[10px]">
                <Gavel className="w-4 h-4 text-purple-400" />
                <span className="font-extrabold uppercase tracking-wide">
                  {lang === "sw" ? "Governance Panel" : "Governance Panel"}
                </span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="text-[8px] font-mono font-black px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 uppercase">
                  SUPER
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-purple-400" />
              </span>
            </button>
          )}
        </div>
      </div>

      {/* 6. QUICK LINKS / HUDUMA ZINGINE */}
      <div className="space-y-2">
        <div className="flex items-center space-x-1.5">
          <span className="w-1.2 h-2.5 bg-sky-500 rounded-full"></span>
          <h3
            className={`text-[10.5px] font-black uppercase tracking-wider ${theme === "light" ? "text-slate-500" : "text-slate-400"}`}
          >
            {lang === "sw" ? "HUDUMA & MSAADA" : "SERVICES & HELP"}
          </h3>
        </div>

        <div
          className={`rounded-2xl p-1 text-left ${
            theme === "light" ? "bg-gradient-to-br from-[#f8fbfe] via-[#f0f5fc] to-[#e6effa] border border-slate-200/90 shadow-xs" : "bg-slate-900/20"
          }`}
        >
          {/* Watabiri Link */}
          {setActiveTab && (
            <button
              onClick={() => setActiveTab("Tipsters")}
              className={`w-full text-left p-2 rounded-xl flex items-center justify-between transition-all duration-200 cursor-pointer ${
                theme === "light"
                  ? "text-slate-700 hover:bg-slate-50"
                  : "text-slate-300 hover:bg-slate-900/40"
              }`}
            >
              <span className="flex items-center space-x-2.5 text-[10px]">
                <Users className="w-4 h-4 text-indigo-400" />
                <span className="font-extrabold uppercase tracking-wide">
                  {t.tipsters || "Watabiri"}
                </span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
          )}

          {/* Install PWA Link */}
          <button
            onClick={() => handleInstallPWA && handleInstallPWA()}
            className={`w-full text-left p-2 rounded-xl flex items-center justify-between transition-all duration-200 cursor-pointer ${
              theme === "light"
                ? "text-slate-700 hover:bg-slate-50"
                : "text-slate-300 hover:bg-slate-900/40"
            }`}
          >
            <span className="flex items-center space-x-2.5 text-[10px]">
              <InstallMobileIcon className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-extrabold uppercase tracking-wide flex items-center space-x-1">
                <span>
                  {lang === "sw"
                    ? "SAKINISHA PROGRAMU"
                    : lang === "fr"
                      ? "INSTALLER APPLICATION"
                      : "INSTALL APP"}
                </span>
                <span className="inline-flex items-center text-slate-500 font-bold ml-1">
                  (
                  <PwaIcon className="w-5 h-5 mx-0.5 inline-block shrink-0" />
                  )
                </span>
              </span>
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          </button>

          {/* Wakala Link */}
          {setActiveTab && (
            <button
              onClick={() => setActiveTab("Agent")}
              className={`w-full text-left p-2 rounded-xl flex items-center justify-between transition-all duration-200 cursor-pointer ${
                theme === "light"
                  ? "text-slate-700 hover:bg-slate-50"
                  : "text-slate-300 hover:bg-slate-900/40"
              }`}
            >
              <span className="flex items-center space-x-2.5 text-[10px]">
                <HandshakeIcon className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="font-extrabold uppercase tracking-wide">
                  {lang === "sw" ? "Kuwa Wakala (Agent)" : "Become Agent"}
                </span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
          )}

          {/* Msaada Link */}
          {setActiveTab && (
            <button
              onClick={() => setActiveTab("Help")}
              className={`w-full text-left p-2 rounded-xl flex items-center justify-between transition-all duration-200 cursor-pointer ${
                theme === "light"
                  ? "text-slate-700 hover:bg-slate-50"
                  : "text-slate-300 hover:bg-slate-900/40"
              }`}
            >
              <span className="flex items-center space-x-2.5 text-[10px]">
                <HelpQuestionIcon className="w-4 h-4 text-teal-400 shrink-0" />
                <span className="font-extrabold uppercase tracking-wide">
                  {t.help || "Msaada / FAQ"}
                </span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
          )}

          {/* Wape Rafiki / Invite Friends */}
          <button
            onClick={() => setShowInviteModal(true)}
            className={`w-full text-left p-2 rounded-xl flex items-center justify-between transition-all duration-200 cursor-pointer ${
              theme === "light"
                ? "text-slate-700 hover:bg-slate-50"
                : "text-slate-300 hover:bg-slate-900/40"
            }`}
          >
            <span className="flex items-center space-x-2.5 text-[10px]">
              <UserPlus className="w-4 h-4 text-amber-400" />
              <span className="font-extrabold uppercase tracking-wide">
                {lang === "sw" ? "Wape Rafiki / Invite Friends" : "Invite Friends"}
              </span>
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          </button>

          {/* Wasiliana Nasi / Contact Support */}
          <button
            onClick={() => setShowContactModal(true)}
            className={`w-full text-left p-2 rounded-xl flex items-center justify-between transition-all duration-200 cursor-pointer ${
              theme === "light"
                ? "text-slate-700 hover:bg-slate-50"
                : "text-slate-300 hover:bg-slate-900/40"
            }`}
          >
            <span className="flex items-center space-x-2.5 text-[10px]">
              <MessageCircle className="w-4 h-4 text-sky-400" />
              <span className="font-extrabold uppercase tracking-wide">
                {lang === "sw" ? "Wasiliana Nasi / Contact Support" : "Contact Support"}
              </span>
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          </button>

          {/* Splash screen preview */}
          {setShowSplash && (
            <button
              onClick={() => setShowSplash(true)}
              className={`w-full text-left p-2 rounded-xl flex items-center justify-between transition-all duration-200 border border-dashed cursor-pointer ${
                theme === "light"
                  ? "bg-blue-500/[0.03] border-blue-200/60 text-blue-600 hover:bg-blue-50"
                  : "bg-blue-500/[0.02] border-blue-500/10 text-blue-400 hover:bg-blue-500/5"
              }`}
            >
              <span className="text-[10px] font-extrabold uppercase tracking-wide flex items-center space-x-2.5">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span>{t.showSplash || "Onyesha Splash Screen"}</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-blue-500" />
            </button>
          )}
        </div>
      </div>

      {/* 7. SERA, USALAMA & HAKI (POLICIES, SECURITY & LEGAL) */}
      <div className="space-y-2">
        <div className="flex items-center space-x-1.5">
          <span className="w-1.2 h-2.5 bg-indigo-500 rounded-full"></span>
          <h3
            className={`text-[10.5px] font-black uppercase tracking-wider ${theme === "light" ? "text-slate-500" : "text-slate-400"}`}
          >
            {lang === "sw"
              ? "SERA, USALAMA & HAKI"
              : lang === "fr"
                ? "POLITIQUES & SÉCURITÉ"
                : "POLICIES & LEGAL"}
          </h3>
        </div>

        <div
          className={`rounded-2xl p-1 text-left ${
            theme === "light" ? "bg-white border border-slate-200" : "bg-slate-900/20"
          }`}
        >
          {/* 1. Vigezo na Masharti / Terms */}
          {setActiveTab && (
            <button
              type="button"
              onClick={() => {
                setLegalSection?.("terms");
                setActiveTab("Legal");
              }}
              className={`w-full text-left p-2 rounded-xl flex items-center justify-between transition-all duration-200 cursor-pointer ${
                theme === "light"
                  ? "text-slate-700 hover:bg-slate-50"
                  : "text-slate-300 hover:bg-slate-900/40"
              }`}
            >
              <span className="flex items-center space-x-2.5 text-[10px]">
                <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                <span className="font-extrabold uppercase tracking-wide">
                  {lang === "sw" ? "Vigezo na Masharti / Terms" : lang === "fr" ? "Conditions d'utilisation / Terms" : "Terms & Conditions"}
                </span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
          )}

          {/* 2. Sera ya Faragha / Privacy */}
          {setActiveTab && (
            <button
              type="button"
              onClick={() => {
                setLegalSection?.("privacy");
                setActiveTab("Legal");
              }}
              className={`w-full text-left p-2 rounded-xl flex items-center justify-between transition-all duration-200 cursor-pointer ${
                theme === "light"
                  ? "text-slate-700 hover:bg-slate-50"
                  : "text-slate-300 hover:bg-slate-900/40"
              }`}
            >
              <span className="flex items-center space-x-2.5 text-[10px]">
                <PrivacyPadlockIcon className="w-4 h-4 text-cyan-500 shrink-0" />
                <span className="font-extrabold uppercase tracking-wide">
                  {lang === "sw" ? "Sera ya Faragha / Privacy" : lang === "fr" ? "Politique de confidentialité" : "Privacy Policy"}
                </span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
          )}

          {/* 3. Sheria za Kipolisi / Police Rules */}
          {setActiveTab && (
            <button
              type="button"
              onClick={() => {
                setLegalSection?.("police_rules");
                setActiveTab("Legal");
              }}
              className={`w-full text-left p-2 rounded-xl flex items-center justify-between transition-all duration-200 cursor-pointer ${
                theme === "light"
                  ? "text-slate-700 hover:bg-slate-50"
                  : "text-slate-300 hover:bg-slate-900/40"
              }`}
            >
              <span className="flex items-center space-x-2.5 text-[10px]">
                <SecurityFillIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="font-extrabold uppercase tracking-wide">
                  {lang === "sw" ? "Sheria za Kipolisi / Police Rules" : lang === "fr" ? "Règles de police" : "Police & Security Rules"}
                </span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
          )}

          {/* 4. Kupambana na Udanganyifu / Anti-Fraud */}
          {setActiveTab && (
            <button
              type="button"
              onClick={() => {
                setLegalSection?.("anti_fraud");
                setActiveTab("Legal");
              }}
              className={`w-full text-left p-2 rounded-xl flex items-center justify-between transition-all duration-200 cursor-pointer ${
                theme === "light"
                  ? "text-slate-700 hover:bg-slate-50"
                  : "text-slate-300 hover:bg-slate-900/40"
              }`}
            >
              <span className="flex items-center space-x-2.5 text-[10px]">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="font-extrabold uppercase tracking-wide">
                  {lang === "sw" ? "Kupambana na Udanganyifu / Anti-Fraud" : lang === "fr" ? "Anti-Fraude" : "Anti-Fraud Policy"}
                </span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
          )}

          {/* 5. Leseni / License */}
          {setActiveTab && (
            <button
              type="button"
              onClick={() => {
                setLegalSection?.("license");
                setActiveTab("Legal");
              }}
              className={`w-full text-left p-2 rounded-xl flex items-center justify-between transition-all duration-200 cursor-pointer ${
                theme === "light"
                  ? "text-slate-700 hover:bg-slate-50"
                  : "text-slate-300 hover:bg-slate-900/40"
              }`}
            >
              <span className="flex items-center space-x-2.5 text-[10px]">
                <OfficialLicenseIcon className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="font-extrabold uppercase tracking-wide">
                  {lang === "sw" ? "Leseni / License" : lang === "fr" ? "Licence Officielle" : "Official License"}
                </span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
          )}

          {/* 6. Uchezaji wa Busara / Responsible Gaming */}
          {setActiveTab && (
            <button
              type="button"
              onClick={() => {
                setLegalSection?.("responsible");
                setActiveTab("Legal");
              }}
              className={`w-full text-left p-2 rounded-xl flex items-center justify-between transition-all duration-200 cursor-pointer ${
                theme === "light"
                  ? "text-slate-700 hover:bg-slate-50"
                  : "text-slate-300 hover:bg-slate-900/40"
              }`}
            >
              <span className="flex items-center space-x-2.5 text-[10px]">
                <BookOpen className="w-4 h-4 text-teal-500 shrink-0" />
                <span className="font-extrabold uppercase tracking-wide">
                  {lang === "sw" ? "Uchezaji wa Busara / Responsible Gaming" : lang === "fr" ? "Jeu Responsable" : "Responsible Gaming"}
                </span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
          )}

          {/* 7. Kufungiwa & Kusimamishwa / Blocking & Suspension */}
          {setActiveTab && (
            <button
              type="button"
              onClick={() => {
                setLegalSection?.("blockage");
                setActiveTab("Legal");
              }}
              className={`w-full text-left p-2 rounded-xl flex items-center justify-between transition-all duration-200 cursor-pointer ${
                theme === "light"
                  ? "text-slate-700 hover:bg-slate-50"
                  : "text-slate-300 hover:bg-slate-900/40"
              }`}
            >
              <span className="flex items-center space-x-2.5 text-[10px]">
                <Ban className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="font-extrabold uppercase tracking-wide">
                  {lang === "sw" ? "Kufungiwa & Kusimamishwa" : lang === "fr" ? "Blocage et Suspension" : "Blocking & Suspension"}
                </span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
          )}

          {/* 8. Kufuta Akaunti Kabisa / Permanent Account Deletion */}
          {setActiveTab && (
            <button
              type="button"
              onClick={() => {
                setLegalSection?.("account_deletion");
                setActiveTab("Legal");
              }}
              className={`w-full text-left p-2 rounded-xl flex items-center justify-between transition-all duration-200 cursor-pointer ${
                theme === "light"
                  ? "text-slate-700 hover:bg-slate-50"
                  : "text-slate-300 hover:bg-slate-900/40"
              }`}
            >
              <span className="flex items-center space-x-2.5 text-[10px]">
                <Trash2 className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="font-extrabold uppercase tracking-wide">
                  {lang === "sw" ? "Kufuta Akaunti Kabisa" : lang === "fr" ? "Suppression du Compte" : "Delete Account"}
                </span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
          )}

          {/* Vikomo vya Kucheza / Gambling Controls */}
          {setActiveTab && (
            <button
              type="button"
              onClick={() => setActiveTab("GamblingControls")}
              className={`w-full text-left p-2 rounded-xl flex items-center justify-between transition-all duration-200 cursor-pointer ${
                theme === "light"
                  ? "text-slate-700 hover:bg-slate-50"
                  : "text-slate-300 hover:bg-slate-900/40"
              }`}
            >
              <span className="flex items-center space-x-2.5 text-[10px]">
                <Wallet className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="font-extrabold uppercase tracking-wide">
                  {lang === "sw" ? "Vikomo vya Kucheza" : lang === "fr" ? "Contrôles de Jeu" : "Gambling Controls"}
                </span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
          )}

          {/* Ripoti Tatizo (Report a Problem) */}
          {setActiveTab && (
            <button
              onClick={() => setActiveTab("ReportProblem")}
              className={`w-full text-left p-2 rounded-xl flex items-center justify-between transition-all duration-200 cursor-pointer ${
                theme === "light"
                  ? "text-slate-700 hover:bg-slate-50"
                  : "text-slate-300 hover:bg-slate-900/40"
              }`}
            >
              <span className="flex items-center space-x-2.5 text-[10px]">
                <ThreatPhoneIcon className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="font-extrabold uppercase tracking-wide">
                  {lang === "sw" ? "Ripoti Tatizo / Report Problem" : "Report a Problem"}
                </span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
          )}
        </div>
      </div>

      {/* 7.5 TAKETALON VERIFIED DEDICATED BOX (PLACED DIRECTLY UNDER POLICE LEGAL) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <TalonLogo className="w-7 h-7" glow={false} theme={theme} />
            <h3
              className={`text-xs font-black uppercase tracking-wider ${theme === "light" ? "text-blue-900" : "text-cyan-300"}`}
            >
              {lang === "sw" ? "TAKETALON VERIFIED PORTAL" : "TAKETALON VERIFIED DIRECTORY"}
            </h3>
          </div>
          <span className="text-[8.5px] font-mono font-black px-2 py-0.5 rounded-md border border-blue-500/30 bg-blue-500/10 text-blue-400 uppercase">
            TRUSTED SEAL
          </span>
        </div>

        <div
          className={`rounded-2xl border p-2 text-left space-y-1.5 ${
            theme === "light"
              ? "bg-gradient-to-br from-blue-50 to-sky-50/50 border-blue-200 shadow-sm"
              : "bg-gradient-to-br from-[#0e1c2e] to-[#0a1626] border-blue-500/30 shadow-md"
          }`}
        >
          {/* Main Verified Portal Row - using CheckCircle2 icon */}
          {setActiveTab && (
            <button
              type="button"
              onClick={() => setActiveTab("Verified")}
              className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between transition-all duration-200 cursor-pointer shadow-sm active:scale-[0.99] ${
                theme === "light"
                  ? "bg-white border-blue-200 hover:bg-blue-50 text-slate-900"
                  : "bg-blue-950/40 border-blue-500/40 hover:bg-blue-900/40 text-blue-100"
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
                  <TalonLogo className="w-6 h-6" glow={false} theme={theme} />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs uppercase tracking-wide flex items-center space-x-1.5">
                    <span>{lang === "sw" ? "TakeTalon Verified" : "TakeTalon Verified Portal"}</span>
                    <CheckCircle2 className="w-3.5 h-3.5 fill-blue-500/20 text-blue-400 shrink-0" />
                  </h4>
                  <p className="text-[9.5px] text-slate-400 font-medium leading-relaxed">
                    {lang === "sw"
                      ? "Orodha na Mfumo wa Uhakiki wa Badges za Tipsters, Viongozi na Programu"
                      : "Official Directory of Verified Tipsters, Executives and Badges"}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-blue-400 shrink-0 ml-1" />
            </button>
          )}

          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setActiveTab?.("Verified")}
              className={`p-2 rounded-xl border text-left flex items-center space-x-2 transition-all cursor-pointer ${
                theme === "light"
                  ? "bg-white/80 border-slate-200 hover:bg-white text-slate-800"
                  : "bg-slate-900/60 border-slate-800 hover:bg-slate-900 text-slate-200"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="text-[9.5px] font-extrabold uppercase truncate">
                {lang === "sw" ? "Badges za Uaminifu" : "Trust Badges"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab?.("Verified")}
              className={`p-2 rounded-xl border text-left flex items-center space-x-2 transition-all cursor-pointer ${
                theme === "light"
                  ? "bg-white/80 border-slate-200 hover:bg-white text-slate-800"
                  : "bg-slate-900/60 border-slate-800 hover:bg-slate-900 text-slate-200"
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-[9.5px] font-extrabold uppercase truncate">
                {lang === "sw" ? "Watabiri Zilizothibitishwa" : "Verified Tipsters"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 7. TRANSACTION HISTORY LOG */}
      <div className="space-y-2">
        <div className="flex items-center space-x-1.5 text-left">
          <History className="w-3.5 h-3.5 text-slate-400" />
          <h3
            className={`text-[10.5px] font-black uppercase tracking-wider ${theme === "light" ? "text-slate-500" : "text-slate-400"}`}
          >
            {txHistoryHeader}
          </h3>
        </div>

        <div
          className={`rounded-xl border divide-y overflow-hidden transition-all duration-300 text-left ${
            theme === "light"
              ? "bg-white border-slate-300 divide-slate-300 shadow-sm"
              : "bg-slate-900/30 border-slate-900/80 divide-slate-900/60"
          }`}
        >
          {transactions.length === 0 ? (
            <p className="p-3 text-[11px] text-slate-400 text-center">{noTxMsg}</p>
          ) : (
            transactions.slice(0, 8).map((t) => {
              const isProfit = t.type === "DEPOSIT" || t.type === "BET_WIN";
              return (
                <div
                  key={t.id}
                  className={`p-2.5 flex items-center justify-between text-[11.5px] transition-colors ${theme === "light" ? "hover:bg-slate-100/40" : "hover:bg-slate-900/20"}`}
                >
                  <div className="flex items-center space-x-2">
                    <div
                      className={`p-1 rounded-md border ${
                        isProfit
                          ? theme === "light"
                            ? "bg-emerald-550/10 text-emerald-600 border-emerald-200/60"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : theme === "light"
                            ? "bg-blue-50 text-blue-600 border-blue-200"
                            : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      }`}
                    >
                      {t.type === "DEPOSIT" && <ArrowDownLeft className="w-3 h-3" />}
                      {t.type === "WITHDRAW" && <ArrowUpRight className="w-3 h-3" />}
                      {t.type === "BET_PLACE" && <Coins className="w-3 h-3" />}
                      {t.type === "BET_WIN" && <Sparkles className="w-3 h-3" />}
                      {t.type === "UPGRADE_PRO" && <ShieldCheck className="w-3 h-3" />}
                    </div>
                    <div>
                      <p
                        className={`font-black ${theme === "light" ? "text-slate-700" : "text-slate-200"}`}
                      >
                        {t.description}
                      </p>
                      <p className="text-[9px] text-slate-500 mt-0.5">
                        {(() => {
                          const d = new Date(t.date);
                          return isNaN(d.getTime())
                            ? t.date
                            : d.toLocaleString(lang === "sw" ? "sw-TZ" : lang === "fr" ? "fr-FR" : "en-US", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              });
                        })()}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`font-mono font-black text-xs ${
                      isProfit
                        ? theme === "light"
                          ? "text-emerald-600"
                          : "text-emerald-400"
                        : theme === "light"
                          ? "text-blue-600"
                          : "text-blue-400"
                    }`}
                  >
                    {isProfit ? "+" : "-"} {t.amount.toLocaleString()} FBU
                  </span>
                </div>
              );
            })
          )}
        </div>
        {transactions.length > 8 && setActiveTab && (
          <button
            onClick={() => setActiveTab("TransactionHistory")}
            className="w-full text-center py-2 text-[10.5px] font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer"
          >
            {lang === "sw" ? "Angalia Zote →" : lang === "fr" ? "Voir Tout →" : "View All →"}
          </button>
        )}
      </div>

      {/* 8. LOGOUT BUTTON */}
      {currentUser && currentUser.isLoggedIn && (
        <button
          onClick={async () => {
            try {
              await supabase.auth.signOut();
            } catch (e) {
              console.warn("[LOGOUT] signOut error:", e);
            }
            onAddNotification(t.signOutNotif || "Umetoka kwenye akaunti", "info");
            if (setCurrentUser) {
              setCurrentUser(null);
            }
            if (setActiveTab) {
              setActiveTab("Home");
            } else {
              onBackToHome();
            }
          }}
          className="w-full text-left p-3 rounded-2xl bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 hover:border-rose-500/25 text-rose-400 font-extrabold flex items-center justify-between mt-1.5 transition-all cursor-pointer"
        >
          <span className="flex items-center space-x-2 text-[11px] uppercase tracking-wide">
            <LogOut className="w-4 h-4 text-rose-500" />
            <span>{t.signout || "Toka Kwenye Akaunti"}</span>
          </span>
          <ChevronRight className="w-4 h-4 text-rose-500" />
        </button>
      )}

      {/* Footer copyright */}
      <div
        className={`pt-4 pb-2 text-center ${theme === "light" ? "border-slate-100" : "border-slate-800"}`}
      >
        <p className="text-[9px] text-slate-500 font-black uppercase tracking-wider">
          TakeTalon VIP System
        </p>
        <p className="text-[8px] text-slate-600 mt-0.5">Hakimiliki © 2026. Mchezo wa kistaarabu.</p>
      </div>

      {/* Withdraw Modal Backdrop */}
      {showWithdrawModal && (
        <div
          className={`fixed inset-0 z-50 backdrop-blur-sm flex items-center justify-center p-4 ${theme === "light" ? "bg-slate-900/60" : "bg-slate-950/85"}`}
        >
          <div
            className={`w-full max-w-sm border rounded-2xl p-5 space-y-4 ${theme === "light" ? "bg-white border-slate-200 shadow-xl" : "bg-slate-900 border-slate-800"}`}
          >
            <h3
              className={`text-sm font-display font-bold flex items-center gap-1.5 ${theme === "light" ? "text-slate-800" : "text-slate-100"}`}
            >
              <Coins className="w-4 h-4 text-blue-550" />
              {lang === "sw"
                ? "Utoaji wa Fedha"
                : lang === "fr"
                  ? "Retrait de Fonds"
                  : "Withdraw Funds"}
            </h3>

            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  className={`text-[10px] uppercase ${theme === "light" ? "text-slate-400 font-bold" : "text-slate-500"}`}
                >
                  {lang === "sw"
                    ? "Njia ya Kupokea"
                    : lang === "fr"
                      ? "Méthode de Réception"
                      : "Receive Method"}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["M-Pesa", "Tigo Pesa", "Airtel Money"].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                        paymentMethod === m
                          ? theme === "light"
                            ? "bg-blue-50 text-blue-600 border-blue-300"
                            : "bg-blue-500/10 text-blue-400 border-blue-500/40"
                          : theme === "light"
                            ? "bg-slate-50 text-slate-500 border-slate-200"
                            : "bg-slate-950 text-slate-400 border-slate-800/80"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  className={`text-[10px] uppercase ${theme === "light" ? "text-slate-400 font-bold" : "text-slate-500"}`}
                >
                  {lang === "sw"
                    ? "Nambari ya Simu ya Malipo"
                    : lang === "fr"
                      ? "Numéro de Téléphone"
                      : "Payment Phone Number"}
                </label>
                <input
                  type="text"
                  placeholder="07XXXXXXXX"
                  className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${
                    theme === "light"
                      ? "bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-550"
                      : "bg-slate-950 border border-slate-800 text-slate-300 focus:border-blue-500"
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  className={`text-[10px] uppercase ${theme === "light" ? "text-slate-400 font-bold" : "text-slate-500"}`}
                >
                  {lang === "sw"
                    ? "Kiasi cha Kutoa (FBU)"
                    : lang === "fr"
                      ? "Montant à Retirer (FBU)"
                      : "Withdraw Amount (FBU)"}
                </label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) =>
                    setWithdrawAmount(
                      Math.min(userBalance, Math.max(1000, parseInt(e.target.value) || 0)),
                    )
                  }
                  className={`w-full border rounded-xl px-3 py-2 text-sm font-mono focus:outline-none ${
                    theme === "light"
                      ? "bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-550"
                      : "bg-slate-950 border border-slate-800 text-slate-100 focus:border-blue-500"
                  }`}
                />
                <span className="text-[9px] text-slate-500 block mt-1">
                  {lang === "sw"
                    ? `Salio linaloweza kutolewa: FBU ${userBalance.toLocaleString()}`
                    : lang === "fr"
                      ? `Solde retirable: FBU ${userBalance.toLocaleString()}`
                      : `Withdrawable balance: FBU ${userBalance.toLocaleString()}`}
                </span>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                    theme === "light"
                      ? "bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200"
                      : "bg-slate-950 text-slate-400 border-slate-800/80"
                  }`}
                >
                  {lang === "sw" ? "Ghairi" : lang === "fr" ? "Annuler" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={isWithdrawing}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-slate-950 font-display font-black text-xs uppercase shadow-md active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isWithdrawing
                    ? (lang === "sw" ? "Inatuma..." : lang === "fr" ? "Envoi..." : "Processing...")
                    : (lang === "sw" ? "Toa Pesa ↗" : lang === "fr" ? "Retirer ↗" : "Withdraw ↗")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* INVITE FRIENDS MODAL */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div
            className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-4 relative ${
              theme === "light"
                ? "bg-white border-slate-200 text-slate-900"
                : "bg-[#0d1b2a] border-blue-500/30 text-white"
            }`}
          >
            <button
              onClick={() => setShowInviteModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-800/40 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base">
                  {lang === "sw" ? "Wape Rafiki / Invite Friends" : "Invite Friends & Earn Rewards"}
                </h3>
                <p className="text-xs text-slate-400">
                  {lang === "sw"
                    ? "Alika marafiki wako kujiunga na TakeTalon uweze kujishindia zawadi za kamisheni."
                    : "Share your referral code and earn commission rewards on active friends."}
                </p>
              </div>
            </div>

            <div
              className={`p-4 rounded-2xl border space-y-3 ${
                theme === "light" ? "bg-slate-50 border-slate-200" : "bg-slate-900/60 border-slate-800"
              }`}
            >
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                {lang === "sw" ? "Kiungo Chako cha Mualiko (Referral Link):" : "Your Referral Link:"}
              </label>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={`https://taketalon.pro/ref/${currentUser?.username || "user"}`}
                  className={`w-full px-3 py-2.5 rounded-xl text-xs font-mono font-bold border focus:outline-none ${
                    theme === "light"
                      ? "bg-white border-slate-300 text-slate-800"
                      : "bg-slate-950 border-slate-800 text-amber-300"
                  }`}
                />
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(`https://taketalon.pro/ref/${currentUser?.username || "user"}`);
                    setInviteCopied(true);
                    onAddNotification("Kiungo kimenakiliwa kikamilifu!", "success");
                    setTimeout(() => setInviteCopied(false), 3000);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase flex items-center space-x-1.5 shrink-0 cursor-pointer transition-all"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{inviteCopied ? (lang === "sw" ? "Imenakiliwa!" : "Copied!") : (lang === "sw" ? "Nakili" : "Copy")}</span>
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowInviteModal(false)}
                className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs uppercase cursor-pointer"
              >
                {lang === "sw" ? "Funga" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONTACT SUPPORT MODAL */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div
            className={`w-full max-w-lg p-6 rounded-3xl border shadow-2xl space-y-4 relative ${
              theme === "light"
                ? "bg-white border-slate-200 text-slate-900"
                : "bg-[#0d1b2a] border-blue-500/30 text-white"
            }`}
          >
            <button
              onClick={() => setShowContactModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-800/40 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-400">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base">
                  {lang === "sw" ? "Wasiliana na Msaada wa TakeTalon" : "Contact TakeTalon Support"}
                </h3>
                <p className="text-xs text-slate-400">
                  {lang === "sw"
                    ? "Timu yetu ya huduma kwa wateja ipo tayari kukusaidia masaa 24/7."
                    : "Our support desk is active 24/7 to assist with your queries."}
                </p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!contactSubject || !contactMsg) {
                  onAddNotification("Tafadhali jaza mada na maelezo ya ujumbe wako!", "error");
                  return;
                }
                onAddNotification("Ujumbe wako umetumwa kwa Timu ya Msaada!", "success");
                setContactSubject("");
                setContactMsg("");
                setShowContactModal(false);
              }}
              className="space-y-3 pt-2"
            >
              <div>
                <label className="block text-[10px] font-extrabold uppercase mb-1 text-slate-400">
                  {lang === "sw" ? "Mada ya Ujumbe / Subject:" : "Subject:"}
                </label>
                <input
                  type="text"
                  placeholder={lang === "sw" ? "Mfano: Shida ya Kutoa Pesa / Akaunti" : "e.g. Withdrawal Issue"}
                  value={contactSubject}
                  onChange={(e) => setContactSubject(e.target.value)}
                  className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold border focus:outline-none ${
                    theme === "light"
                      ? "bg-slate-50 border-slate-300 text-slate-800"
                      : "bg-slate-950 border-slate-800 text-white"
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase mb-1 text-slate-400">
                  {lang === "sw" ? "Maelezo ya Ujumbe:" : "Message Details:"}
                </label>
                <textarea
                  rows={3}
                  placeholder={lang === "sw" ? "Andika hapa maelezo kamili..." : "Describe your issue here..."}
                  value={contactMsg}
                  onChange={(e) => setContactMsg(e.target.value)}
                  className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold border focus:outline-none ${
                    theme === "light"
                      ? "bg-slate-50 border-slate-300 text-slate-800"
                      : "bg-slate-950 border-slate-800 text-white"
                  }`}
                />
              </div>

              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowContactModal(false)}
                  className="w-1/2 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs uppercase cursor-pointer"
                >
                  {lang === "sw" ? "Ghairi" : "Cancel"}
                </button>

                <button
                  type="submit"
                  className="w-1/2 py-3 rounded-2xl bg-sky-500 hover:bg-sky-600 text-slate-950 font-black text-xs uppercase flex items-center justify-center space-x-1.5 cursor-pointer shadow-lg transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{lang === "sw" ? "Tuma Ujumbe" : "Send Message"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
