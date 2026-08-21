/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Bell,
  Trash2,
  ArrowLeft,
  Calendar,
  Info,
  CheckCircle2,
  AlertTriangle,
  Filter,
  Smartphone,
  X,
  ChevronRight,
  Coins,
  MessageSquare,
  Activity,
  ShieldCheck,
  Clock,
  Volume2,
  VolumeX,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import SettingsIcon from "./SettingsIcon";

interface NotificationItem {
  id: string;
  message: string;
  type: "success" | "error" | "info";
  timestamp: string;
  category?: "transactions" | "sms" | "system" | "tips";
  read?: boolean;
}

interface NotificationsViewProps {
  history: NotificationItem[];
  onClearAll: () => void;
  onMarkAllRead?: () => void;
  onBackToHome: () => void;
  theme: "blue" | "dark" | "light";
  lang: "en" | "fr" | "sw";
}

export default function NotificationsView({
  history,
  onClearAll,
  onMarkAllRead,
  onBackToHome,
  theme,
  lang,
}: NotificationsViewProps) {
  const isDark = theme !== "light";

  // State management
  const [localHistory, setLocalHistory] = useState<NotificationItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<"zote" | "miamala" | "mifumo" | "tips">("zote");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [smsToggled, setSmsToggled] = useState(true);
  const [tipsAlerts, setTipsAlerts] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [pushPermission, setPushPermission] = useState<string>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported"
  );

  const handleRequestPush = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPushPermission(result);
  };

  // Sync with prop
  useEffect(() => {
    setLocalHistory(history || []);
  }, [history]);

  // Swahili, English, French Translations
  const t = {
    sw: {
      title: "Kituo cha Arifa na Ujumbe",
      subtitle: "Ufuatiliaji wa miamala na mifumo ya siri",
      empty: "Kikasha cha Arifa ni Tupu",
      emptyDesc: "Miamala ya salio na mechi zitakazofunguliwa zitaonekana hapa.",
      clear: "Futa Zote",
      back: "Rudi Nyumbani",
      generateBtn: "Zalisha Arifa za Majaribio 🚀",
      filters: {
        zote: "Arifa Zote",
        miamala: "Miamala",
        tips: "Kufunguliwa",
        mifumo: "Mifumo",
      },
      settingsTitle: "Mipangilio ya Arifa",
      settingsDesc: "Sanidi jinsi unavyopokea taarifa",
      soundLabel: "Sauti ya Arifa za Mfumo",
      tipsLabel: "Vikumbusho vya Mechi",
      deleteTooltip: "Futa arifa hii",
      detailsTitle: "Maelezo Kamili ya Arifa",
      detailsRef: "Namba ya Kumbukumbu",
      detailsTime: "Muda",
      detailsStatus: "Hali ya Ujumbe",
      markAllRead: "Soma Zote",
      smsLabel: "Arifa za SMS",
      pushTitle: "Arifa za Push (Simu)",
      pushDesc: "Ruhusu arifa hata app ikiwa imefungwa",
      pushGranted: "Umeruhusu arifa za push",
      pushDenied: "Umezuia push kwenye mipangilio ya kivinjari",
      pushEnable: "Washa",
    },
    en: {
      title: "Notification Hub & Alerts",
      subtitle: "Track transactions and system updates",
      empty: "Inbox is Empty",
      emptyDesc: "Balance deposits and unlocked tips will appear here.",
      clear: "Clear All",
      back: "Back to Home",
      generateBtn: "Generate Sample Alerts 🚀",
      filters: {
        zote: "All Alerts",
        miamala: "Transactions",
        tips: "Unlocks",
        mifumo: "System",
      },
      settingsTitle: "Notification Settings",
      settingsDesc: "Configure how you receive your alerts",
      soundLabel: "System Alert Sounds",
      tipsLabel: "Match Kickoff Reminders",
      deleteTooltip: "Delete this notification",
      detailsTitle: "Notification Details",
      detailsRef: "Reference ID",
      detailsTime: "Timestamp",
      detailsStatus: "Status",
      markAllRead: "Mark All Read",
      smsLabel: "SMS Alerts",
      pushTitle: "Push Notifications",
      pushDesc: "Get alerts even when the app is closed",
      pushGranted: "Push notifications enabled",
      pushDenied: "Push blocked in browser settings",
      pushEnable: "Enable",
    },
    fr: {
      title: "Centre de Notifications",
      subtitle: "Suivi des transactions et alertes système",
      empty: "Boîte de réception vide",
      emptyDesc: "Vos dépôts de solde et pronostics apparaîtront ici.",
      clear: "Effacer Tout",
      back: "Retour à l'Accueil",
      generateBtn: "Générer des Alertes de Test 🚀",
      filters: {
        zote: "Toutes",
        miamala: "Transactions",
        tips: "Débloqués",
        mifumo: "Système",
      },
      settingsTitle: "Paramètres de Notification",
      settingsDesc: "Configurez la réception de vos alertes",
      soundLabel: "Sons d'alerte système",
      tipsLabel: "Rappels de coup d'envoi",
      deleteTooltip: "Supprimer cette notification",
      detailsTitle: "Détails de la Notification",
      detailsRef: "ID de Référence",
      detailsTime: "Heure",
      detailsStatus: "Statut",
      markAllRead: "Tout Marquer Lu",
      smsLabel: "Alertes SMS",
      pushTitle: "Notifications Push",
      pushDesc: "Recevez des alertes même app fermée",
      pushGranted: "Notifications push activées",
      pushDenied: "Push bloqué dans les paramètres du navigateur",
      pushEnable: "Activer",
    },
  }[lang] || {
    title: "Kituo cha Arifa na Ujumbe",
    subtitle: "Ufuatiliaji wa miamala na mifumo ya siri",
    empty: "Kikasha cha Arifa ni Tupu",
    emptyDesc: "Miamala ya salio na mechi zitakazofunguliwa zitaonekana hapa.",
    clear: "Futa Zote",
    back: "Rudi Nyumbani",
    generateBtn: "Zalisha Arifa za Majaribio 🚀",
    filters: {
      zote: "Arifa Zote",
      miamala: "Miamala",
      tips: "Kufunguliwa",
      mifumo: "Mifumo",
    },
    settingsTitle: "Mipangilio ya Arifa",
    settingsDesc: "Sanidi jinsi unavyopokea taarifa",
    soundLabel: "Sauti ya Arifa za Mfumo",
    tipsLabel: "Vikumbusho vya Mechi",
    deleteTooltip: "Futa arifa hii",
    detailsTitle: "Maelezo Kamili ya Arifa",
    detailsRef: "Namba ya Kumbukumbu",
    detailsTime: "Muda",
    detailsStatus: "Hali ya Ujumbe",
    markAllRead: "Soma Zote",
    smsLabel: "Arifa za SMS",
    pushTitle: "Arifa za Push (Simu)",
    pushDesc: "Ruhusu arifa hata app ikiwa imefungwa",
    pushGranted: "Umeruhusu arifa za push",
    pushDenied: "Umezuia push kwenye mipangilio ya kivinjari",
    pushEnable: "Washa",
  };

  // Helper to categorize dynamic messages
  const getCategory = (message: string): "transactions" | "system" | "tips" => {
    const text = message.toLowerCase();
    if (
      text.includes("m-pesa") ||
      text.includes("tigo") ||
      text.includes("airtel") ||
      text.includes("salio") ||
      text.includes("deposit") ||
      text.includes("withdraw") ||
      text.includes("coins")
    ) {
      return "transactions";
    }
    if (
      text.includes("tip") ||
      text.includes("utabiri") ||
      text.includes("simba") ||
      text.includes("yanga") ||
      text.includes("unlocked")
    ) {
      return "tips";
    }
    return "system";
  };

  // Apply Filter
  const filteredNotifications = localHistory.filter((item) => {
    const category =
      item.category === "sms" ? "system" : item.category || getCategory(item.message);
    if (activeFilter === "zote") return true;
    if (activeFilter === "miamala") return category === "transactions";
    if (activeFilter === "tips") return category === "tips";
    if (activeFilter === "mifumo") return category === "system";
    return true;
  });

  // Delete Individual Notification
  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = localHistory.filter((item) => item.id !== id);
    setLocalHistory(updated);
  };

  // Clear All
  const handleClearAll = () => {
    setLocalHistory([]);
    onClearAll();
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto p-1 pb-24">
      {/* 1. Header Banner */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToHome}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              isDark
                ? "bg-slate-900/60 hover:bg-slate-800/85 text-slate-300 border border-slate-800/40"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="text-left">
            <h2
              className={`text-base font-display font-black tracking-tight ${isDark ? "text-slate-100" : "text-slate-800"}`}
            >
              {t.title}
            </h2>
            <p className="text-[10px] text-slate-500 font-medium tracking-wide">{t.subtitle}</p>
          </div>
        </div>

        {localHistory.length > 0 && (
          <div className="flex items-center space-x-2">
            {onMarkAllRead && (
              <button
                onClick={onMarkAllRead}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/15 text-blue-500 text-[9.5px] font-black tracking-wider uppercase transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{t.markAllRead}</span>
              </button>
            )}
            <button
              onClick={handleClearAll}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/15 text-rose-500 text-[9.5px] font-black tracking-wider uppercase transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t.clear}</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Settings Accordion Panel (Feature-rich notification engine options) */}
      <div
        className={`p-3.5 rounded-2xl border ${
          isDark ? "bg-slate-950/40 border-slate-900/60" : "bg-gradient-to-br from-[#f8fbfe] via-[#f0f5fc] to-[#e6effa] border-slate-200/90 shadow-sm"
        }`}
      >
        <div className="flex items-center space-x-2 pb-2.5 border-b border-dashed border-slate-800/40 mb-3">
          <SettingsIcon className="w-3.5 h-3.5 text-slate-400 animate-spin-slow" />
          <div className="text-left">
            <h4
              className={`text-[10px] font-black uppercase tracking-wider ${isDark ? "text-slate-200" : "text-slate-800"}`}
            >
              {t.settingsTitle}
            </h4>
            <p className="text-[8.5px] text-slate-500">{t.settingsDesc}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-left">
          {/* Sound Alert Toggle */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/20 border border-slate-800/20">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  soundEnabled
                    ? "bg-blue-600/10 text-blue-400 border border-blue-500/15"
                    : "bg-slate-800/20 text-slate-500 border border-slate-700/20"
                }`}
              >
                {soundEnabled ? (
                  <Volume2 className="w-3.5 h-3.5" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5" />
                )}
              </button>
              <span
                className={`text-[9.5px] font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}
              >
                {t.soundLabel}
              </span>
            </div>
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={() => setSoundEnabled(!soundEnabled)}
              className="w-3.5 h-3.5 rounded-sm border-slate-800 text-blue-600 focus:ring-0 cursor-pointer"
            />
          </div>

          {/* Kickoff alerts */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/20 border border-slate-800/20">
            <div className="flex items-center space-x-2">
              <div
                className={`p-1.5 rounded-lg border ${
                  tipsAlerts
                    ? "bg-amber-600/10 text-amber-400 border-amber-500/15"
                    : "bg-slate-800/20 text-slate-500 border-slate-700/20"
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
              </div>
              <span
                className={`text-[9.5px] font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}
              >
                {t.tipsLabel}
              </span>
            </div>
            <input
              type="checkbox"
              checked={tipsAlerts}
              onChange={() => setTipsAlerts(!tipsAlerts)}
              className="w-3.5 h-3.5 rounded-sm border-slate-800 text-amber-600 focus:ring-0 cursor-pointer"
            />
          </div>

          {/* SMS Alerts Toggle */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/20 border border-slate-800/20">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSmsToggled(!smsToggled)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  smsToggled
                    ? "bg-emerald-600/10 text-emerald-400 border border-emerald-500/15"
                    : "bg-slate-800/20 text-slate-500 border border-slate-700/20"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
              <span
                className={`text-[9.5px] font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}
              >
                {t.smsLabel}
              </span>
            </div>
            <input
              type="checkbox"
              checked={smsToggled}
              onChange={() => setSmsToggled(!smsToggled)}
              className="w-3.5 h-3.5 rounded-sm border-slate-800 text-emerald-600 focus:ring-0 cursor-pointer"
            />
          </div>
        </div>

        {pushPermission !== "unsupported" && (
          <div
            className={`mt-2.5 p-2.5 rounded-xl border flex items-center justify-between ${
              isDark ? "bg-slate-900/20 border-slate-800/20" : "bg-slate-50/60 border-slate-200"
            }`}
          >
            <div className="flex items-center space-x-2">
              <div
                className={`p-1.5 rounded-lg border ${
                  pushPermission === "granted"
                    ? "bg-emerald-600/10 text-emerald-400 border-emerald-500/15"
                    : "bg-slate-800/20 text-slate-500 border-slate-700/20"
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <p className={`text-[9.5px] font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  {t.pushTitle}
                </p>
                <p className="text-[8px] text-slate-500">
                  {pushPermission === "granted"
                    ? t.pushGranted
                    : pushPermission === "denied"
                      ? t.pushDenied
                      : t.pushDesc}
                </p>
              </div>
            </div>
            {pushPermission === "default" && (
              <button
                onClick={handleRequestPush}
                className="px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-[9px] font-black uppercase cursor-pointer shrink-0"
              >
                {t.pushEnable}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. Filter Chips */}
      <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-1">
        <div
          className={`p-1.5 rounded-xl border flex items-center justify-center mr-1 ${
            isDark
              ? "bg-slate-900/20 border-slate-850/40 text-slate-400"
              : "bg-slate-50/60 border-slate-200 text-slate-500"
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
        </div>
        {[
          { id: "zote" as const, label: t.filters.zote, icon: Bell },
          { id: "miamala" as const, label: t.filters.miamala, icon: Coins },
          { id: "tips" as const, label: t.filters.tips, icon: Sparkles },
          { id: "mifumo" as const, label: t.filters.mifumo, icon: Activity },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeFilter === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveFilter(item.id)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all border cursor-pointer shrink-0 ${
                isActive
                  ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                  : isDark
                    ? "bg-slate-900/40 border-slate-850 hover:bg-slate-900/70 text-slate-400"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-150"
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* 5. Main Notification Cards Area */}
      <div
        className={`border rounded-2xl p-4 min-h-[320px] flex flex-col justify-between overflow-hidden relative ${
          isDark ? "bg-slate-950/40 border-slate-900/60" : "bg-gradient-to-br from-[#f8fbfe] via-[#f0f5fc] to-[#e6effa] border-slate-200/90 shadow-sm"
        }`}
      >
        {filteredNotifications.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center space-y-4">
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center border ${
                isDark
                  ? "bg-slate-900/40 border-slate-800/60 text-slate-600"
                  : "bg-slate-50 border-slate-200 text-slate-400"
              }`}
            >
              <Bell className="w-6 h-6 animate-pulse text-blue-500" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h4
                className={`text-xs font-black uppercase tracking-wider ${isDark ? "text-slate-300" : "text-slate-700"}`}
              >
                {t.empty}
              </h4>
              <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                {t.emptyDesc}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1 text-left custom-scrollbar">
            <AnimatePresence initial={false}>
              {filteredNotifications.map((item) => {
                const rawCategory = item.category || getCategory(item.message);
                const category = rawCategory === "sms" ? "system" : rawCategory;

                // Icon selection
                let Icon = Info;
                let badgeColor = "";
                if (category === "transactions") {
                  Icon = Coins;
                  badgeColor =
                    item.type === "success"
                      ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/15"
                      : "text-rose-500 bg-rose-500/10 border-rose-500/15";
                } else if (category === "tips") {
                  Icon = Sparkles;
                  badgeColor = "text-amber-500 bg-amber-500/10 border-amber-500/15";
                } else {
                  Icon =
                    item.type === "success"
                      ? CheckCircle2
                      : item.type === "error"
                        ? AlertTriangle
                        : Info;
                  badgeColor =
                    item.type === "success"
                      ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/15"
                      : item.type === "error"
                        ? "text-rose-500 bg-rose-500/10 border-rose-500/15"
                        : "text-blue-400 bg-blue-400/10 border-blue-400/15";
                }

                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => setSelectedNotification(item)}
                    className={`p-3 rounded-xl border flex items-start space-x-3 transition-all hover:scale-[1.005] active:scale-[0.995] cursor-pointer group relative ${
                      isDark
                        ? "bg-slate-900/40 border-slate-850/60 hover:bg-slate-900/60"
                        : "bg-slate-50/65 border-slate-150 hover:bg-slate-50 shadow-xs"
                    }`}
                  >
                    <div className={`p-2 rounded-xl border flex-shrink-0 ${badgeColor}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 text-left min-w-0 pr-6">
                      <p
                        className={`text-[11px] leading-relaxed font-semibold break-words ${isDark ? "text-slate-200" : "text-slate-700"}`}
                      >
                        {item.message}
                      </p>
                      <div className="flex items-center space-x-1.5 mt-1 text-slate-500 text-[8.5px] font-mono">
                        <Clock className="w-3 h-3 text-slate-600" />
                        <span>{item.timestamp}</span>
                        <span className="text-slate-700">•</span>
                        <span className="text-[8px] uppercase tracking-wide font-bold font-sans text-slate-400 bg-slate-800/40 px-1.5 py-0.5 rounded-md">
                          {category}
                        </span>
                      </div>
                    </div>

                    {/* Individual Swipe/Delete trash bin */}
                    <button
                      onClick={(e) => handleDeleteItem(item.id, e)}
                      title={t.deleteTooltip}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-slate-500 hover:text-rose-500 bg-slate-500/0 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 group-hover:opacity-0 transition-opacity">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        <button
          onClick={onBackToHome}
          className={`w-full py-2.5 mt-4 text-[10px] uppercase tracking-wider font-black rounded-xl border transition-all cursor-pointer text-center ${
            isDark
              ? "bg-slate-950 hover:bg-slate-900 text-slate-400 border-slate-850"
              : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 shadow-xs"
          }`}
        >
          {t.back}
        </button>
      </div>

      {/* 6. Notification Details Interactive Modal */}
      <AnimatePresence>
        {selectedNotification && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-md p-5 rounded-2xl border ${
                isDark
                  ? "bg-slate-900 border-slate-800 text-slate-100"
                  : "bg-white border-slate-200 text-slate-800 shadow-xl"
              }`}
            >
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-800/40">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-blue-500" />
                  <span className="text-[11px] font-black uppercase tracking-wider">
                    {t.detailsTitle}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedNotification(null)}
                  className={`p-1.5 rounded-lg hover:bg-rose-500/10 hover:text-rose-500 transition-all cursor-pointer ${
                    isDark ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-4 space-y-4 text-left">
                {/* Message Body */}
                <div
                  className={`p-3 rounded-xl font-medium text-[11.5px] leading-relaxed border ${
                    isDark ? "bg-slate-950/60 border-slate-850" : "bg-slate-50 border-slate-150"
                  }`}
                >
                  {selectedNotification.message}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  {/* Category info */}
                  <div
                    className={`p-2.5 rounded-xl border ${isDark ? "bg-slate-950/20 border-slate-850/40" : "bg-slate-50/50"}`}
                  >
                    <div className="text-slate-500 font-bold uppercase tracking-wider text-[8px]">
                      {t.detailsStatus}
                    </div>
                    <div className="font-extrabold text-blue-400 mt-0.5 uppercase tracking-wide flex items-center space-x-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>
                        {selectedNotification.category || getCategory(selectedNotification.message)}
                      </span>
                    </div>
                  </div>

                  {/* Timestamp info */}
                  <div
                    className={`p-2.5 rounded-xl border ${isDark ? "bg-slate-950/20 border-slate-850/40" : "bg-slate-50/50"}`}
                  >
                    <div className="text-slate-500 font-bold uppercase tracking-wider text-[8px]">
                      {t.detailsTime}
                    </div>
                    <div className="font-bold text-slate-300 mt-0.5 flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500 mr-1" />
                      <span>{selectedNotification.timestamp}</span>
                    </div>
                  </div>
                </div>

                {/* Reference ID (Automated hash) */}
                <div
                  className={`p-2.5 rounded-xl border text-[9.5px] font-mono flex justify-between items-center ${
                    isDark ? "bg-slate-950/20 border-slate-850/40" : "bg-slate-50/50"
                  }`}
                >
                  <span className="text-slate-500">{t.detailsRef}:</span>
                  <span className="font-bold text-blue-400">
                    TX-
                    {selectedNotification.id.replace(/[^\w]/g, "").substring(0, 10).toUpperCase()}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedNotification(null)}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                {lang === "sw" ? "Nimekuelewa" : lang === "fr" ? "Compris" : "Got it"}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
