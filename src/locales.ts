/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type LanguageType = "en" | "fr" | "sw";

export interface TranslationSchema {
  // Navigation / Tabs
  home: string;
  tipsters: string;
  aviator: string;
  console: string;
  wallet: string;
  kwako: string;
  unlockers: string;
  all: string;
  football: string;
  games: string;
  basketball: string;
  tennis: string;
  volleyball: string;
  golf: string;
  boxing: string;
  rugby: string;

  // Header
  machoSalama: string;
  machoSalamaDesc: string;
  proBadge: string;
  upgradeToPro: string;
  welcomeBack: string;
  searchTips: string;
  searchPlaceholder: string;
  close: string;

  // Wallet / Coins
  balance: string;
  freeBonusCoins: string;
  proMember: string;
  deposit: string;
  withdraw: string;
  transactionHistory: string;
  coinsCount: string;
  depositSuccess: string;
  depositSuccessDesc: string;
  withdrawSuccess: string;
  withdrawSuccessDesc: string;
  upgradeSuccess: string;
  upgradeSuccessDesc: string;
  amountPlaceholder: string;
  phonePlaceholder: string;
  submit: string;
  insufficientFunds: string;
  upgradeCost: string;
  upgradeCostDesc: string;
  walletDesc: string;

  // Profile Modal
  profileTitle: string;
  avatarLetter: string;
  proBadgePremium: string;
  vipStatus: string;
  standardStatus: string;
  themeSelection: string;
  languageSelection: string;
  developerStats: string;
  accuracyRate: string;
  tipsUnlocked: string;
  settings: string;
  help: string;
  signout: string;

  // Match List / Tips Card
  upcoming: string;
  live: string;
  ended: string;
  confidence: string;
  odds: string;
  draw: string;
  unlockedWithPro: string;
  unlockedWithCoins: string;
  unlockTipNow: string;
  premiumLockedDesc: string;
  prediction: string;
  analysisText: string;
  emptyTips: string;
  categoryFilter: string;
  men: string;
  women: string;

  // Aviator Game
  aviatorTitle: string;
  liveMultiplier: string;
  gameStatusCrashed: string;
  gameStatusFlying: string;
  gameStatusWaiting: string;
  nextRoundIn: string;
  placeBet: string;
  betPlacedStatus: string;
  cashOut: string;
  cashOutSuccess: string;
  secondsCount: string;
  multiplierHistory: string;
  gameRulesTitle: string;
  gameRulesDesc: string;
  autoCashout: string;
  crashWarning: string;

  // Console Pro
  consoleTitle: string;
  consoleSubtitle: string;
  predictNextMatch: string;
  selectCategory: string;
  generatePredictionBtn: string;
  generatingTitle: string;
  analysisDone: string;
  aiConfidence: string;
  systemModel: string;
  matchFixture: string;
  proAnalysisCard: string;
  recentLogs: string;
  tipstersDesc: string;
  tipsterFollowers: string;
  tipsterAccuracy: string;
  tipsterTips: string;
  followBtn: string;
  followingBtn: string;

  // Cart / Bet Slip
  depositBtn: string;
  openProfile: string;
  showSplash: string;
  cartTitle: string;
  creatorTitle: string;
  cartEmpty: string;
  cartEmptyDesc: string;
  viewTopMatches: string;
  creatorModeLabel: string;
  postNow: string;
  clearSlip: string;

  // Feed section labels
  topLiveRefresh: string;
  topOtherBetLabel: string;
  mixedFeedTitle: string;
  viewAll: string;
  buyPro: string;

  // Subscription / Unlocking
  subscribeBtn: string;
  subscribedBtn: string;
  unlockingBtn: string;
  subscribeEarnings: string;
  subscribeSuccess: string;
  subscribeMonthly: string;
  signOutNotif: string;
}

export const locales: Record<LanguageType, TranslationSchema> = {
  en: {
    home: "Home",
    tipsters: "Tipsters",
    aviator: "Aviator",
    console: "Console Pro",
    wallet: "Wallet",
    kwako: "For You",
    unlockers: "Unlockers",
    all: "All",
    football: "Football",
    games: "Games",
    basketball: "Basketball",
    tennis: "Tennis",
    volleyball: "Volleyball",
    golf: "Golf",
    boxing: "Boxing",
    rugby: "Rugby",

    machoSalama: "Eye Comfort Shield",
    machoSalamaDesc: "Reduce blue light to protect your vision",
    proBadge: "PRO MEMBER",
    upgradeToPro: "UPGRADE PRO",
    welcomeBack: "Welcome back!",
    searchTips: "Search Tips & Teams",
    searchPlaceholder: "Search users or matches",
    close: "Close",

    balance: "Balance",
    freeBonusCoins: "FREE BONUS COINS",
    proMember: "PRO Member Status",
    deposit: "Deposit",
    withdraw: "Withdraw",
    transactionHistory: "Transaction History",
    coinsCount: "Coins Available",
    depositSuccess: "Deposit Initiated",
    depositSuccessDesc: "Your request of {amount} Coins has been processed instantly.",
    withdrawSuccess: "Withdrawal Sent",
    withdrawSuccessDesc: "Withdrawal of FBU {amount} successfully queued.",
    upgradeSuccess: "PRO Unlocked!",
    upgradeSuccessDesc: "Congratulations! You are now an Official TalonTake PRO Member.",
    amountPlaceholder: "Enter amount (e.g., 500)",
    phonePlaceholder: "Enter Mobile Number (M-Pesa/TigoPesa)",
    submit: "Submit Request",
    insufficientFunds: "Insufficient funds in your wallet.",
    upgradeCost: "Upgrade cost",
    upgradeCostDesc: "Get unlimited premium betting tips permanently",
    walletDesc: "Fund your account to unlock premium AI matches individually or upgrade to PRO.",

    profileTitle: "Your Profile Status",
    avatarLetter: "U",
    proBadgePremium: "Talon PRO VIP",
    vipStatus: "Active VIP Access",
    standardStatus: "Standard Free Account",
    themeSelection: "Select UI Visual Theme",
    languageSelection: "Select Application Language",
    developerStats: "Elite Professional Stats",
    accuracyRate: "Accuracy Rate",
    tipsUnlocked: "Matches Unlocked",
    settings: "Settings",
    help: "Help",
    signout: "Sign Out Safely",

    upcoming: "Upcoming",
    live: "Live Now",
    ended: "Ended",
    confidence: "Confidence Level",
    odds: "Odds Matrix",
    draw: "Draw",
    unlockedWithPro: "Unlocked with PRO status",
    unlockedWithCoins: "Unlocked with {coins} Coins",
    unlockTipNow: "Buy prediction now 🌟",
    premiumLockedDesc:
      "This is an elite VIP analysis. Unlock using 200 Coins or get PRO Membership.",
    prediction: "Golden Choice Prediction 🌟",
    analysisText: "Elite Tactical Analysis",
    emptyTips: "No matches found matching the criteria.",
    categoryFilter: "League Filter",
    men: "Men Division",
    women: "Women Division",

    aviatorTitle: "Talon Aviator AI Pro",
    liveMultiplier: "LIVE MULTIPLIER",
    gameStatusCrashed: "PLANE CRASHED AT",
    gameStatusFlying: "PLANE IS FLYING...",
    gameStatusWaiting: "WAITING FOR NEXT TAKEOFF",
    nextRoundIn: "Next round in:",
    placeBet: "Place Bet",
    betPlacedStatus: "BET PLACED - Awaiting flight",
    cashOut: "CASH OUT NOW",
    cashOutSuccess: "SUCCESSFUL CASHOUT!",
    secondsCount: "s",
    multiplierHistory: "MULTIPLIER HISTORY LOG",
    gameRulesTitle: "AI Flight Crash Predictor Rules",
    gameRulesDesc:
      "Place your simulated bet using your wallet coins, and cash out before the plane flies away! High risk, high reward multipliers.",
    autoCashout: "Auto Cashout",
    crashWarning: "CRASH PREVENTED BY SHIELD",

    consoleTitle: "Talon AI Engine Pro",
    consoleSubtitle: "Elite Predictive Machine Learning Model",
    predictNextMatch: "Predict Next Match Fixture",
    selectCategory: "Select Sport / Match Type",
    generatePredictionBtn: "Run Predictive Algorithm",
    generatingTitle: "Computing Multi-variable Probability Matrices...",
    analysisDone: "AI Analysis Generated Successfully",
    aiConfidence: "AI Confidence Score",
    systemModel: "Model Version",
    matchFixture: "Simulated Fixture Result",
    proAnalysisCard: "Elite Machine Analysis",
    recentLogs: "Real-time Network Telemetry Log",
    tipstersDesc: "Elite Tipsters with high win-rate metrics verified on chain.",
    tipsterFollowers: "Followers",
    tipsterAccuracy: "Accuracy",
    tipsterTips: "Total Predictions",
    followBtn: "Follow Elite",
    followingBtn: "Following",

    depositBtn: "Deposit Funds",
    openProfile: "Open Your Profile ⚙️",
    showSplash: "Show Splash Screen Again 🎬",
    cartTitle: "Bet Slip",
    creatorTitle: "VIP Card Publisher 🌟",
    cartEmpty: "Your slip is empty!",
    cartEmptyDesc:
      "Tap odds from matches you want to bet on to fill your slip and build a winning combo.",
    viewTopMatches: "View Top Matches",
    creatorModeLabel: "Setup VIP Odds (Creator) 🌟",
    postNow: "Post Now 🚀",
    clearSlip: "Clear",

    topLiveRefresh: "Refreshes every 3 min",
    topOtherBetLabel: "Today's Best Matches",
    mixedFeedTitle: "Today's Combo",
    viewAll: "View All",
    buyPro: "BUY PRO",

    subscribeBtn: "Unlock (500 FBU/month)",
    subscribedBtn: "✓ Unlocked",
    unlockingBtn: "Unlocking...",
    subscribeEarnings: "Earnings: ~0.625 FBU/hr · 15 FBU/day · 450 FBU/month",
    subscribeSuccess: "Unlocked! 450 FBU sent to tipster.",
    subscribeMonthly: "500 FBU/month",
    signOutNotif: "You have signed out safely!",
  },
  fr: {
    home: "Accueil",
    tipsters: "Pronostiqueurs",
    aviator: "Aviateur",
    console: "Console Pro",
    wallet: "Portefeuille",
    kwako: "Pour Vous",
    unlockers: "Débloqueurs",
    all: "Tous",
    football: "Football",
    games: "Jeux AI",
    basketball: "Basket-ball",
    tennis: "Tennis",
    volleyball: "Volley-ball",
    golf: "Golf",
    boxing: "Boxe",
    rugby: "Rugby",

    machoSalama: "Filtre Anti-Lumière Bleue",
    machoSalamaDesc: "Réduisez la lumière bleue pour préserver vos yeux",
    proBadge: "MEMBRE PRO",
    upgradeToPro: "PASSER PRO",
    welcomeBack: "Bon retour parmi nous !",
    searchTips: "Rechercher des pronostics & équipes",
    searchPlaceholder: "Rechercher des utilisateurs ou des matchs",
    close: "Fermer",

    balance: "Solde de Coins",
    freeBonusCoins: "COINS DE BONUS GRATUIT",
    proMember: "Statut Membre PRO",
    deposit: "Dépôt",
    withdraw: "Retrait",
    transactionHistory: "Historique des Transactions",
    coinsCount: "Coins disponibles",
    depositSuccess: "Dépôt Initié",
    depositSuccessDesc: "Votre demande de {amount} Coins a été créditée instantanément.",
    withdrawSuccess: "Retrait Envoyé",
    withdrawSuccessDesc: "Retrait de FBU {amount} mis en attente avec succès.",
    upgradeSuccess: "PRO Débloqué !",
    upgradeSuccessDesc: "Félicitations ! Vous êtes désormais un membre officiel PRO de TalonTake.",
    amountPlaceholder: "Entrez le montant (ex. 500)",
    phonePlaceholder: "Numéro de Mobile (M-Pesa/Airtel/Orange)",
    submit: "Soumettre la Demande",
    insufficientFunds: "Fonds insuffisants dans votre portefeuille.",
    upgradeCost: "Coût de la mise à niveau",
    upgradeCostDesc: "Obtenez un accès illimité et permanent aux pronostics premium",
    walletDesc:
      "Alimentez votre portefeuille pour débloquer les matchs premium individuellement ou passer PRO.",

    profileTitle: "Statut de Votre Profil",
    avatarLetter: "U",
    proBadgePremium: "Membre Talon PRO VIP",
    vipStatus: "Accès VIP Actif",
    standardStatus: "Compte Gratuit Standard",
    themeSelection: "Sélectionner le Thème Visuel",
    languageSelection: "Sélectionner la Langue",
    developerStats: "Statistiques Professionnelles",
    accuracyRate: "Taux de Précision",
    tipsUnlocked: "Matchs Débloqués",
    settings: "Paramètres",
    help: "Aide",
    signout: "Se déconnecter en toute sécurité",

    upcoming: "À venir",
    live: "En direct",
    ended: "Terminé",
    confidence: "Niveau de Confiance",
    odds: "Matrice des Cotes",
    draw: "Nul",
    unlockedWithPro: "Débloqué avec le statut PRO",
    unlockedWithCoins: "Débloqué avec {coins} Coins",
    unlockTipNow: "Acheter le Pronostic 🌟",
    premiumLockedDesc:
      "Ceci est une analyse VIP d'élite. Débloquez-la pour 200 Coins ou obtenez l'abonnement PRO.",
    prediction: "Pronostic d'Or d'Élite 🌟",
    analysisText: "Analyse Tactique d'Élite",
    emptyTips: "Aucun match ne correspond aux critères de recherche.",
    categoryFilter: "Filtre des Ligues",
    men: "Division Masculine",
    women: "Division Féminine",

    aviatorTitle: "Talon Aviateur AI Pro",
    liveMultiplier: "MULTIPLICATEUR EN DIRECT",
    gameStatusCrashed: "L'AVION A CRASHÉ À",
    gameStatusFlying: "L'AVION S'ENVOLE...",
    gameStatusWaiting: "ATTENTE DU PROCHAIN DÉCOLLAGE",
    nextRoundIn: "Prochain vol dans :",
    placeBet: "Placer le Pari",
    betPlacedStatus: "PARI PLACÉ - En attente du vol",
    cashOut: "ENCAISSER MAINTENANT",
    cashOutSuccess: "ENCAISSEMENT RÉUSSI !",
    secondsCount: "s",
    multiplierHistory: "LOG D'HISTORIQUE DE MULTIPLICATEUR",
    gameRulesTitle: "Règles du Prédicteur de Crash d'Avion AI",
    gameRulesDesc:
      "Placez votre pari virtuel en utilisant vos coins, et encaissez avant que l'avion ne s'envole ! Multiplicateurs à haut risque et haut rendement.",
    autoCashout: "Auto Encaissement",
    crashWarning: "CRASH PRÉVENU PAR LE BOUCLIER",

    consoleTitle: "Talon Moteur AI Pro",
    consoleSubtitle: "Modèle de Machine Learning Prédictif d'Élite",
    predictNextMatch: "Prédire le Prochain Match",
    selectCategory: "Sélectionner le Sport / Type",
    generatePredictionBtn: "Exécuter l'Algorithme Prédictif",
    generatingTitle: "Calcul des Matrices de Probabilité Multi-variables...",
    analysisDone: "Analyse Générée avec Succès par l'AI",
    aiConfidence: "Score de Confiance AI",
    systemModel: "Version du Modèle",
    matchFixture: "Résultat du Match Simulé",
    proAnalysisCard: "Analyse d'Élite de la Machine",
    recentLogs: "Télémétrie Réseau en Temps Réel",
    tipstersDesc:
      "Pronostiqueurs d'élite avec un taux de victoire élevé vérifié sur la blockchain.",
    tipsterFollowers: "Abonnés",
    tipsterAccuracy: "Précision",
    tipsterTips: "Pronostics Totaux",
    followBtn: "Suivre l'Élite",
    followingBtn: "Abonné",

    depositBtn: "Déposer des Fonds",
    openProfile: "Ouvrir votre Profil ⚙️",
    showSplash: "Revoir l'Écran Splash 🎬",
    cartTitle: "Coupon de Paris",
    creatorTitle: "Publication Fiche VIP 🌟",
    cartEmpty: "Votre coupon est vide !",
    cartEmptyDesc:
      "Appuyez sur les cotes des matchs pour remplir votre coupon et créer un combo gagnant.",
    viewTopMatches: "Voir les Top Matchs",
    creatorModeLabel: "Config. Cotes VIP (Créateur) 🌟",
    postNow: "Publier Maintenant 🚀",
    clearSlip: "Vider",

    topLiveRefresh: "Actualise toutes les 3 min",
    topOtherBetLabel: "Meilleurs Matchs du Jour",
    mixedFeedTitle: "Combiné du Jour",
    viewAll: "Voir Tout",
    buyPro: "ACHETER PRO",

    subscribeBtn: "Débloquer (500 FBU/mois)",
    subscribedBtn: "✓ Débloqué",
    unlockingBtn: "Déblocage...",
    subscribeEarnings: "Gains : ~0.625 FBU/h · 15 FBU/jour · 450 FBU/mois",
    subscribeSuccess: "Débloqué ! 450 FBU envoyés au pronostiqueur.",
    subscribeMonthly: "500 FBU/mois",
    signOutNotif: "Vous vous êtes déconnecté en toute sécurité !",
  },
  sw: {
    home: "Nyumbani",
    tipsters: "Watabiri",
    aviator: "Aviator",
    console: "Console Pro",
    wallet: "Mkoba",
    kwako: "Kwako",
    unlockers: "Unlockers",
    all: "Zote",
    football: "Kandanda",
    games: "Michezo AI",
    basketball: "Kikapu",
    tennis: "Tenisi",
    volleyball: "Wongoya",
    golf: "Gofu",
    boxing: "Ngumi",
    rugby: "Raga",

    machoSalama: "Macho Salama (Ulinzi)",
    machoSalamaDesc: "Punguza mwanga wa bluu kulinda macho yako",
    proBadge: "MWANACHAMA PRO",
    upgradeToPro: "JIUNGE NA PRO",
    welcomeBack: "Karibu tena!",
    searchTips: "Tafuta utabiri & timu",
    searchPlaceholder: "Tafuta watumiaji au mechi",
    close: "Funga",

    balance: "Salio la Sarafu",
    freeBonusCoins: "BONASI YA BURE YA SARAFU",
    proMember: "Hali ya Mwanachama wa PRO",
    deposit: "Weka Pesa",
    withdraw: "Toa Pesa",
    transactionHistory: "Historia ya Miamala",
    coinsCount: "Sarafu Zinazopatikana",
    depositSuccess: "Ombi la Kuweka Pesa Limeanzishwa",
    depositSuccessDesc: "Ombi lako la sarafu {amount} limeshughulikiwa hivi sasa.",
    withdrawSuccess: "Ombi la Kutoa Pesa Limeandaliwa",
    withdrawSuccessDesc: "Kiasi cha FBU {amount} kimeingizwa kwenye foleni ya malipo kwa ufanisi.",
    upgradeSuccess: "PRO Imefunguliwa!",
    upgradeSuccessDesc: "Hongera sana! Sasa wewe ni Mwanachama Rasmi wa TalonTake PRO.",
    amountPlaceholder: "Weka kiasi (mfano, 500)",
    phonePlaceholder: "Weka namba ya simu (M-Pesa/TigoPesa)",
    submit: "Tuma Ombi",
    insufficientFunds: "Salio halitoshi kwenye mkoba wako.",
    upgradeCost: "Gharama ya Kujiunga",
    upgradeCostDesc: "Pata utabiri wa kipekee na wa kudumu bila kikomo",
    walletDesc:
      "Ongeza pesa kwenye mkoba wako ili kufungua mechi za premium binafsi au kujiunga na PRO.",

    profileTitle: "Hali ya Profaili Yako",
    avatarLetter: "U",
    proBadgePremium: "Mwanachama wa VIP PRO",
    vipStatus: "Uanachama wa VIP Uko Amilifu",
    standardStatus: "Akaunti ya Kawaida ya Bure",
    themeSelection: "Chagua Mandhari ya Rangi",
    languageSelection: "Chagua Lugha ya Programu",
    developerStats: "Takwimu za Kitalaamu za Elit",
    accuracyRate: "Kiwango cha Usahihi",
    tipsUnlocked: "Mechi Zilizofunguliwa",
    settings: "Mipangilio",
    help: "Msaada",
    signout: "Ondoka Salama",

    upcoming: "Zijazo",
    live: "Hivi Sasa",
    ended: "Zimeisha",
    confidence: "Kiwango cha Uhakika",
    odds: "Uwiano wa Odds",
    draw: "Sare",
    unlockedWithPro: "Imefunguliwa kwa hadhi ya PRO",
    unlockedWithCoins: "Imefunguliwa kwa sarafu {coins}",
    unlockTipNow: "Nunua Utabiri Sasa 🌟",
    premiumLockedDesc:
      "Uchambuzi huu umezuiwa kwa wanachama VIP. Fungua kwa sarafu 200 au jiunge na PRO.",
    prediction: "Doti la Dhahabu (Ushindi) 🌟",
    analysisText: "Uchambuzi Imara wa Kiufundi",
    emptyTips: "Hakuna mechi zilizopatikana kulingana na vigezo vyako.",
    categoryFilter: "Chujio la Ligi",
    men: "Idara ya Wanaume",
    women: "Idara ya Wanawake",

    aviatorTitle: "Talon Aviator AI Pro",
    liveMultiplier: "KIZIDISHO CHA SASA",
    gameStatusCrashed: "NDEGE IMEANGUKA KATIKA",
    gameStatusFlying: "NDEGE INAPAA...",
    gameStatusWaiting: "INASUBIRI AWAMU INAYOFUATA YAKUPAA",
    nextRoundIn: "Awamu ijayo baada ya:",
    placeBet: "Weka Dau",
    betPlacedStatus: "DAU LIMEWEKWA - Inasubiri kupaa",
    cashOut: "TOA DAU SASA",
    cashOutSuccess: "DAU LIMETOLEWA KWA MAFANIKIO!",
    secondsCount: "s",
    multiplierHistory: "HISTORIA YA KIZIDISHO (LOG)",
    gameRulesTitle: "Sheria za Kizuia Ajali za Ndege za AI",
    gameRulesDesc:
      "Weka dau lako la mtihani ukitumia sarafu za mkoba wako, kisha toa dau kabla ya ndege kuruka na kupotea! Hatari kubwa na faida kubwa.",
    autoCashout: "Kutoa Dau Moja kwa Moja",
    crashWarning: "AJALI IMEZUILIWA NA NGAO YA SEFTI",

    consoleTitle: "Talon AI Engine Pro",
    consoleSubtitle: "Mfumo wa Kisasa wa Kutabiri Matokeo kwa Kutumia AI",
    predictNextMatch: "Tabiri Mchezo Ujao wa Kandanda",
    selectCategory: "Chagua Aina ya Mchezo",
    generatePredictionBtn: "Zindua Algorithm ya Utabiri",
    generatingTitle: "Inakokotoa matrices mbalimbali ya uwezekano...",
    analysisDone: "Utabiri wa AI Umezalishwa kwa Mafanikio",
    aiConfidence: "Kiwango cha Uhakika wa AI",
    systemModel: "Toleo la Mfumo",
    matchFixture: "Matokeo ya Mechi Iliyosimuliwa",
    proAnalysisCard: "Uchambuzi wa Juu wa Mashine",
    recentLogs: "Logi za Mtandao wa Real-time",
    tipstersDesc:
      "Watabiri wasomi wenye viwango vya juu vya ushindi vilivyothibitishwa kwenye mfumo.",
    tipsterFollowers: "Wafuasi",
    tipsterAccuracy: "Usahihi",
    tipsterTips: "Jumla ya Utabiri",
    followBtn: "Mpe Kura (Follow)",
    followingBtn: "Umeshajiunga (Following)",

    depositBtn: "Weka Salio",
    openProfile: "Fungua Wasifu Wako ⚙️",
    showSplash: "Onyesha Splash Screen Tena 🎬",
    cartTitle: "Kikapu cha Jamvi",
    creatorTitle: "Uchapishaji wa Kadi VIP 🌟",
    cartEmpty: "Kikapu chako ni tupu!",
    cartEmptyDesc:
      "Gusa odds za mechi unazotaka kubashiri ili zijaze kikapu chako na uunde jamvi la kishindo.",
    viewTopMatches: "Tazama Mechi Kuu",
    creatorModeLabel: "Panga Odds (Kadi VIP) 🌟",
    postNow: "Chapisha Sasa 🚀",
    clearSlip: "Futa",

    topLiveRefresh: "Inamaliza kila Dakika 3",
    topOtherBetLabel: "Mechi Bora za Leo",
    mixedFeedTitle: "Mchanganyiko wa Leo",
    viewAll: "Ona Zote",
    buyPro: "NUNUA PRO",

    subscribeBtn: "Fungua (500 FBU/mwezi)",
    subscribedBtn: "✓ Imefunguliwa",
    unlockingBtn: "Inafungua...",
    subscribeEarnings: "Mapato: ~0.625 FBU/saa · 15 FBU/siku · 450 FBU/mwezi",
    subscribeSuccess: "Ume-unlock! 450 FBU zimetumwa kwa mwatabiri.",
    subscribeMonthly: "500 FBU/mwezi",
    signOutNotif: "Umetoka kwenye akaunti yako kwa usalama!",
  },
};
