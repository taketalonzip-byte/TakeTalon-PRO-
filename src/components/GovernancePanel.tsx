/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Shield,
  ShieldAlert,
  Key,
  Users,
  CheckCircle2,
  AlertTriangle,
  Lock,
  RefreshCw,
  Search,
  Crown,
  UserX,
  X,
  Check,
  UserCheck,
  AlertCircle,
  ArrowRight,
  Clock,
  ChevronRight,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { searchProfiles, type PublicProfile } from "../lib/unlockService";
import { UserCircleSingleIcon } from "./MatchList";

export interface OwnershipProposal {
  id: string;
  proposed_by: string;
  successor_profile_id?: string;
  proposal_type?: string;
  reason?: string;
  status: string;
  created_at: string;
  approval_count?: number;
  total_required?: number;
  proposer_username?: string;
  successor_username?: string;
}

interface GovernancePanelProps {
  currentUser: any;
  theme: "light" | "dark" | "blue";
  lang: "en" | "fr" | "sw";
  onAddNotification?: (msg: string, type: "success" | "error" | "info") => void;
  onClose?: () => void;
}

export default function GovernancePanel({
  currentUser,
  theme,
  lang,
  onAddNotification,
  onClose,
}: GovernancePanelProps) {
  // ── Database Role Verification ──────────────────────────────────────────────
  const [dbRole, setDbRole] = useState<string>("LOADING");
  const [dbUsername, setDbUsername] = useState<string>("");
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState<boolean>(true);

  // Status banner / Toast feedback
  const [feedback, setFeedback] = useState<{
    msg: string;
    type: "success" | "error" | "info";
  } | null>(null);

  // 1. Propose Succession State (OWNER only)
  const [masterPasswordInput, setMasterPasswordInput] = useState<string>("");
  const [successorQuery, setSuccessorQuery] = useState<string>("");
  const [successorResults, setSuccessorResults] = useState<PublicProfile[]>([]);
  const [isSearchingSuccessor, setIsSearchingSuccessor] = useState<boolean>(false);
  const [selectedSuccessor, setSelectedSuccessor] = useState<PublicProfile | null>(null);
  const [isSubmittingSuccession, setIsSubmittingSuccession] = useState<boolean>(false);

  // 2. Change Master Password State (OWNER only)
  const [currentMasterPass, setCurrentMasterPass] = useState<string>("");
  const [newMasterPass, setNewMasterPass] = useState<string>("");
  const [isChangingMasterPass, setIsChangingMasterPass] = useState<boolean>(false);

  // 3. Role Management State (OWNER & SUPER_ADMIN)
  const [roleQuery, setRoleQuery] = useState<string>("");
  const [roleResults, setRoleResults] = useState<PublicProfile[]>([]);
  const [isSearchingRoleUser, setIsSearchingRoleUser] = useState<boolean>(false);
  const [selectedRoleProfile, setSelectedRoleProfile] = useState<PublicProfile | null>(null);
  const [targetNewRole, setTargetNewRole] = useState<string>("ADMIN");
  const [isChangingRole, setIsChangingRole] = useState<boolean>(false);

  // 4. Pending Proposals & Emergency Removal State (SUPER_ADMIN / OWNER)
  const [proposals, setProposals] = useState<OwnershipProposal[]>([]);
  const [loadingProposals, setLoadingProposals] = useState<boolean>(false);
  const [approvingProposalId, setApprovingProposalId] = useState<string | null>(null);
  const [emergencyReason, setEmergencyReason] = useState<string>("");
  const [isSubmittingEmergency, setIsSubmittingEmergency] = useState<boolean>(false);

  // Color classes according to theme
  const isDark = theme === "dark" || theme === "blue";
  const bgCard = isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-800";
  const bgInner = isDark ? "bg-slate-950/80 border-slate-800/80" : "bg-slate-50 border-slate-200";
  const textPrimary = isDark ? "text-slate-100" : "text-slate-900";
  const textSubtle = isDark ? "text-slate-400" : "text-slate-600";

  // ── Fetch DB Role directly from Supabase profiles table ─────────────────────
  const fetchDbRole = async () => {
    setLoadingRole(true);
    try {
      const targetIdentifier = currentUser?.id || currentUser?.authUserId || currentUser?.username;
      
      if (!targetIdentifier) {
        setDbRole("USER");
        setLoadingRole(false);
        return;
      }

      // Query profiles table in Supabase
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetIdentifier);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, role, username, auth_user_id")
        .or(isUuid ? `id.eq.${targetIdentifier},auth_user_id.eq.${targetIdentifier}` : `username.eq.${targetIdentifier},email.eq.${targetIdentifier}`)
        .maybeSingle();

      if (data && data.role) {
        setDbRole(data.role.toUpperCase());
        setDbUsername(data.username || currentUser?.username || "");
        setProfileId(data.id);
      } else {
        // Fallback to currentUser prop role
        const propRole = (currentUser?.role || "USER").toUpperCase();
        setDbRole(propRole);
        setDbUsername(currentUser?.username || "");
        setProfileId(currentUser?.id || null);
      }
    } catch (err) {
      console.warn("[GovernancePanel] Error fetching database role:", err);
      setDbRole((currentUser?.role || "USER").toUpperCase());
    } finally {
      setLoadingRole(false);
    }
  };

  // ── Fetch Proposals and Approval Counts ────────────────────────────────────
  const fetchProposals = async () => {
    setLoadingProposals(true);
    try {
      // Query ownership_proposals
      const { data, error } = await supabase
        .from("ownership_proposals")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("[GovernancePanel] Error querying proposals table:", error);
        // If table directly restricted or missing, try custom RPC or fallback structure
        setProposals([]);
        setLoadingProposals(false);
        return;
      }

      if (data && Array.isArray(data)) {
        // Fetch approval counts for each proposal
        const enriched = await Promise.all(
          data.map(async (item: any) => {
            // Count approvals from ownership_approvals
            let approvalCount = 0;
            try {
              const { count } = await supabase
                .from("ownership_approvals")
                .select("*", { count: "exact", head: true })
                .eq("proposal_id", item.id);
              approvalCount = count || 0;
            } catch (e) {
              approvalCount = item.approval_count || 0;
            }

            // Fetch proposer & successor usernames if available
            let proposerUname = item.proposed_by_username || "User";
            let successorUname = item.successor_username || "User";

            if (item.successor_profile_id && !item.successor_username) {
              const { data: succ } = await supabase
                .from("profiles")
                .select("username")
                .eq("id", item.successor_profile_id)
                .maybeSingle();
              if (succ) successorUname = succ.username;
            }

            return {
              id: item.id,
              proposed_by: item.proposed_by,
              successor_profile_id: item.successor_profile_id,
              proposal_type: item.proposal_type || "succession",
              reason: item.reason || item.notes || "",
              status: item.status || (item.executed ? "executed" : "pending"),
              created_at: item.created_at || new Date().toISOString(),
              approval_count: approvalCount,
              total_required: item.total_required || 2, // Quorum requirement (e.g. 2 SuperAdmins)
              proposer_username: proposerUname,
              successor_username: successorUname,
            };
          })
        );
        setProposals(enriched);
      }
    } catch (err) {
      console.warn("[GovernancePanel] Failed to fetch proposals:", err);
    } finally {
      setLoadingProposals(false);
    }
  };

  useEffect(() => {
    fetchDbRole();
  }, [currentUser]);

  useEffect(() => {
    if (dbRole === "OWNER" || dbRole === "SUPER_ADMIN") {
      fetchProposals();
    }
  }, [dbRole]);

  // ── Successor Search ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!successorQuery || successorQuery.length < 2) {
      setSuccessorResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingSuccessor(true);
      try {
        const results = await searchProfiles(successorQuery, currentUser?.authUserId || null);
        setSuccessorResults(results);
      } catch (e) {
        setSuccessorResults([]);
      } finally {
        setIsSearchingSuccessor(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [successorQuery]);

  // ── Role Search ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!roleQuery || roleQuery.length < 2) {
      setRoleResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingRoleUser(true);
      try {
        const results = await searchProfiles(roleQuery, null);
        setRoleResults(results);
      } catch (e) {
        setRoleResults([]);
      } finally {
        setIsSearchingRoleUser(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [roleQuery]);

  // Helper notice display
  const notify = (msg: string, type: "success" | "error" | "info") => {
    setFeedback({ msg, type });
    if (onAddNotification) onAddNotification(msg, type);
  };

  // ── 1. OWNER: Propose Succession RPC ────────────────────────────────────────
  const handleOwnerProposeSuccession = async () => {
    if (!selectedSuccessor) {
      notify(lang === "sw" ? "Tafadhali chagua mfuatiliaji (successor profile)." : "Please select a successor profile.", "error");
      return;
    }
    if (!masterPasswordInput) {
      notify(lang === "sw" ? "Andika Master Password kuthibitisha." : "Please enter Master Password.", "error");
      return;
    }

    setIsSubmittingSuccession(true);
    setFeedback(null);

    try {
      // Call RPC owner_propose_succession
      const { data, error } = await supabase.rpc("owner_propose_succession", {
        p_master_password: masterPasswordInput,
        p_successor_profile_id: selectedSuccessor.profile_id || selectedSuccessor.id,
      });

      // Clear sensitive master password state immediately
      setMasterPasswordInput("");

      if (error) {
        notify(`Error: ${error.message || "Failed to propose succession."}`, "error");
      } else {
        const successMsg = data?.message || (lang === "sw" ? "Pendekezo la Succession limewasilishwa kikamilifu!" : "Succession proposal created successfully!");
        notify(successMsg, "success");
        setSelectedSuccessor(null);
        setSuccessorQuery("");
        fetchProposals();
      }
    } catch (err: any) {
      setMasterPasswordInput("");
      notify(`Execution Error: ${err?.message || "Failed to call owner_propose_succession"}`, "error");
    } finally {
      setIsSubmittingSuccession(false);
    }
  };

  // ── 2. OWNER: Change Master Password RPC ────────────────────────────────────
  const handleChangeMasterPassword = async () => {
    if (!currentMasterPass || !newMasterPass) {
      notify(lang === "sw" ? "Andika password ya sasa na password mpya." : "Enter current and new passwords.", "error");
      return;
    }
    if (newMasterPass.length < 6) {
      notify(lang === "sw" ? "Password mpya lazima iwe na angalau herufi 6." : "New password must be at least 6 characters.", "error");
      return;
    }

    setIsChangingMasterPass(true);
    setFeedback(null);

    try {
      const { data, error } = await supabase.rpc("owner_change_master_password", {
        p_current_password: currentMasterPass,
        p_new_password: newMasterPass,
      });

      // Clear password fields immediately
      setCurrentMasterPass("");
      setNewMasterPass("");

      if (error) {
        notify(`Error: ${error.message || "Failed to change master password."}`, "error");
      } else {
        notify(data?.message || (lang === "sw" ? "Master Password imebadilishwa kikamilifu!" : "Master Password updated successfully!"), "success");
      }
    } catch (err: any) {
      setCurrentMasterPass("");
      setNewMasterPass("");
      notify(`Execution Error: ${err?.message || "Failed to call owner_change_master_password"}`, "error");
    } finally {
      setIsChangingMasterPass(false);
    }
  };

  // ── 3. SUPER_ADMIN / OWNER: Approve Proposal RPC ────────────────────────────
  const handleApproveProposal = async (proposalId: string) => {
    setApprovingProposalId(proposalId);
    setFeedback(null);

    try {
      const { data, error } = await supabase.rpc("superadmin_approve_proposal", {
        p_proposal_id: proposalId,
      });

      if (error) {
        notify(`Error: ${error.message || "Failed to approve proposal."}`, "error");
      } else {
        notify(data?.message || (lang === "sw" ? "Umidhinisha proposal kikamilifu!" : "Proposal approved successfully!"), "success");
        fetchProposals();
      }
    } catch (err: any) {
      notify(`Execution Error: ${err?.message || "Failed to call superadmin_approve_proposal"}`, "error");
    } finally {
      setApprovingProposalId(null);
    }
  };

  // ── 4. SUPER_ADMIN: Emergency Owner Removal RPC ─────────────────────────────
  const handleProposeEmergencyRemoval = async () => {
    if (!emergencyReason || emergencyReason.trim().length < 5) {
      notify(lang === "sw" ? "Tafadhali andika sababu ya dharura (reason)." : "Please provide an emergency reason.", "error");
      return;
    }

    setIsSubmittingEmergency(true);
    setFeedback(null);

    try {
      const { data, error } = await supabase.rpc("superadmin_propose_emergency_removal", {
        p_reason: emergencyReason,
      });

      if (error) {
        notify(`Error: ${error.message || "Failed to propose emergency removal."}`, "error");
      } else {
        notify(data?.message || (lang === "sw" ? "Emergency Removal proposal imewasilishwa!" : "Emergency removal proposed!"), "success");
        setEmergencyReason("");
        fetchProposals();
      }
    } catch (err: any) {
      notify(`Execution Error: ${err?.message || "Failed to call superadmin_propose_emergency_removal"}`, "error");
    } finally {
      setIsSubmittingEmergency(false);
    }
  };

  // ── 5. Admin Role Management RPC (admin_change_role) ────────────────────────
  const handleChangeRole = async () => {
    if (!selectedRoleProfile) {
      notify(lang === "sw" ? "Chagua profile ya mtumiaji kwanza." : "Select a target profile first.", "error");
      return;
    }

    setIsChangingRole(true);
    setFeedback(null);

    try {
      const targetId = selectedRoleProfile.profile_id || selectedRoleProfile.id;
      const { data, error } = await supabase.rpc("admin_change_role", {
        p_target_profile_id: targetId,
        p_new_role: targetNewRole,
      });

      if (error) {
        notify(`Error: ${error.message || "Failed to change role."}`, "error");
      } else {
        notify(
          data?.message ||
            (lang === "sw"
              ? `Role ya @${selectedRoleProfile.username} imebadilishwa kuwa ${targetNewRole}!`
              : `Role for @${selectedRoleProfile.username} changed to ${targetNewRole}!`),
          "success"
        );
        setSelectedRoleProfile(null);
        setRoleQuery("");
      }
    } catch (err: any) {
      notify(`Execution Error: ${err?.message || "Failed to call admin_change_role"}`, "error");
    } finally {
      setIsChangingRole(false);
    }
  };

  const isOwner = dbRole === "OWNER";
  const isSuperAdmin = dbRole === "SUPER_ADMIN";
  const hasGovernanceAccess = isOwner || isSuperAdmin;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5 text-left p-1">
      {/* ── Top Header Banner ────────────────────────────────────────────────── */}
      <div className={`p-4 rounded-2xl border ${bgCard} shadow-xl flex items-center justify-between`}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className={`text-sm sm:text-base font-black uppercase tracking-wider ${textPrimary}`}>
                System Governance & Ownership Panel
              </h2>
              {hasGovernanceAccess && (
                <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center space-x-1">
                  <Crown className="w-2.5 h-2.5" />
                  <span>{dbRole}</span>
                </span>
              )}
            </div>
            <p className={`text-[10px] ${textSubtle} mt-0.5`}>
              Mamlaka ya Mfumo (Strict Supabase Database RPC Execution Only)
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-500/10 hover:bg-slate-500/20 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ── Feedback Banner ──────────────────────────────────────────────────── */}
      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
            feedback.type === "success"
              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
              : feedback.type === "error"
                ? "bg-rose-500/15 border-rose-500/40 text-rose-300"
                : "bg-blue-500/15 border-blue-500/40 text-blue-300"
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.msg}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="p-1 hover:opacity-75 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}

      {/* ── Access Control Gate Check ────────────────────────────────────────── */}
      {loadingRole ? (
        <div className={`p-8 rounded-2xl border ${bgCard} text-center space-y-2`}>
          <RefreshCw className="w-6 h-6 text-amber-500 animate-spin mx-auto" />
          <p className={`text-xs font-mono ${textSubtle}`}>Inathibitisha Role kutoka Database...</p>
        </div>
      ) : !hasGovernanceAccess ? (
        /* ── ACCESS DENIED VIEW (For standard ADMIN or USER) ──────────────── */
        <motion.div
          initial={{ scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-6 rounded-2xl border border-rose-500/40 bg-rose-500/10 text-rose-200 shadow-2xl space-y-4 text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-sm font-black uppercase tracking-wider text-rose-300">
              Ruhusa Imekataliwa (Access Denied)
            </h3>
            <p className="text-xs text-rose-300/90 max-w-md mx-auto leading-relaxed">
              Huna mamlaka ya kufikia Governance Panel. Sehemu hii inapatikana kwa watumiaji wenye role ya{" "}
              <span className="font-mono font-black underline">OWNER</span> au{" "}
              <span className="font-mono font-black underline">SUPER_ADMIN</span> pekee waliojisajili kwenye database.
            </p>
          </div>

          <div className={`p-3 rounded-xl border ${bgInner} text-left text-[11px] font-mono space-y-1 max-w-sm mx-auto`}>
            <div className="flex justify-between">
              <span className="text-slate-500">Akaunti Yako:</span>
              <span className="text-slate-200 font-bold">@{dbUsername || currentUser?.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Database Role Yako:</span>
              <span className="text-rose-400 font-black">{dbRole}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Ruhusa Inayohitajika:</span>
              <span className="text-amber-400 font-bold">OWNER / SUPER_ADMIN</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={fetchDbRole}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg flex items-center justify-center space-x-1.5 mx-auto cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Jaribu Ku-refresh Role</span>
            </button>
          </div>
        </motion.div>
      ) : (
        /* ── GOVERNANCE PANEL AUTHORIZED CONTENT ───────────────────────────── */
        <div className="space-y-6">
          {/* Active Role Indicator Card */}
          <div className={`p-3 rounded-xl border ${bgInner} flex items-center justify-between text-xs`}>
            <div className="flex items-center space-x-2">
              <UserCheck className="w-4 h-4 text-amber-500" />
              <span>
                Akaunti Iliyothibitishwa: <strong className="text-amber-400 font-mono">@{dbUsername}</strong>
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-slate-500">Mamlaka:</span>
              <span className="font-mono font-black text-amber-400 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                {dbRole}
              </span>
            </div>
          </div>

          {/* ── SECTION 1: PROPOSE SUCCESSION (OWNER ONLY) ─────────────────── */}
          {isOwner && (
            <div className={`p-5 rounded-2xl border ${bgCard} shadow-lg space-y-4`}>
              <div className="flex items-center justify-between border-b border-slate-700/40 pb-3">
                <div className="flex items-center space-x-2">
                  <Crown className="w-5 h-5 text-amber-400" />
                  <h3 className={`text-xs sm:text-sm font-black uppercase tracking-wider ${textPrimary}`}>
                    1. Propose Ownership Succession (Owner Only)
                  </h3>
                </div>
                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[8.5px] font-bold rounded border border-amber-500/20">
                  OWNER EXECUTION
                </span>
              </div>

              <p className={`text-xs ${textSubtle} leading-relaxed`}>
                Wasilisha ombi la kuhamisha uongozi mkuu wa mfumo kwenda kwa mtu mwingine (Successor). Mchakato huu
                utahitaji SuperAdmin approvals kutekelezwa.
              </p>

              {/* Successor Search Field */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  A. Tafuta Profile ya Mfuatiliaji (Successor Profile):
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={successorQuery}
                    onChange={(e) => setSuccessorQuery(e.target.value)}
                    placeholder="Andika jina au username ya Successor..."
                    className={`w-full pl-9 pr-3 py-2 text-xs font-bold rounded-xl border focus:outline-none focus:border-amber-500 ${
                      theme === "light"
                        ? "bg-slate-50 border-slate-300 text-slate-900"
                        : "bg-neutral-950 border-neutral-800 text-white"
                    }`}
                  />
                  {isSearchingSuccessor && (
                    <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin absolute right-3 top-2.5" />
                  )}
                </div>

                {/* Search Results Dropdown */}
                {successorResults.length > 0 && (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto p-1 bg-slate-950/80 border border-slate-800 rounded-xl">
                    {successorResults.map((prof) => (
                      <div
                        key={prof.profile_id || prof.id}
                        onClick={() => {
                          setSelectedSuccessor(prof);
                          setSuccessorResults([]);
                        }}
                        className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                          selectedSuccessor?.id === prof.id
                            ? "bg-amber-500/20 border-amber-500 text-amber-200"
                            : "bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-200"
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                            <UserCircleSingleIcon className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="text-xs font-bold block">@{prof.username}</span>
                            <span className="text-[8.5px] text-slate-400 font-mono">Role: {prof.role}</span>
                          </div>
                        </div>
                        <span className="text-[9px] font-bold text-amber-400 uppercase">Chagua</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Selected Successor Card */}
                {selectedSuccessor && (
                  <div className="p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-400" />
                      <div>
                        <span className="text-xs font-bold text-amber-200 block">
                          Mteule: @{selectedSuccessor.username}
                        </span>
                        <span className="text-[9px] font-mono text-amber-400/80">
                          ID: {selectedSuccessor.profile_id || selectedSuccessor.id}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedSuccessor(null)}
                      className="text-slate-400 hover:text-white p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Master Password Input Form */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  B. Master Password kuthibitisha uamuzi (Input Type Password - KAMWE isihifadhiwe):
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    autoComplete="off"
                    value={masterPasswordInput}
                    onChange={(e) => setMasterPasswordInput(e.target.value)}
                    placeholder="Ingiza Master Password..."
                    className={`w-full pl-9 pr-3 py-2 text-xs font-mono font-bold rounded-xl border focus:outline-none focus:border-amber-500 ${
                      theme === "light"
                        ? "bg-slate-50 border-slate-300 text-slate-900"
                        : "bg-neutral-950 border-neutral-800 text-white"
                    }`}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  onClick={handleOwnerProposeSuccession}
                  disabled={!selectedSuccessor || !masterPasswordInput || isSubmittingSuccession}
                  className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 disabled:opacity-40 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {isSubmittingSuccession ? (
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    <>
                      <Crown className="w-4 h-4" />
                      <span>Propose Succession (supabase.rpc)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── SECTION 2: PENDING PROPOSALS & APPROVALS (SUPER_ADMIN & OWNER) ── */}
          <div className={`p-5 rounded-2xl border ${bgCard} shadow-lg space-y-4`}>
            <div className="flex items-center justify-between border-b border-slate-700/40 pb-3">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-sky-400" />
                <h3 className={`text-xs sm:text-sm font-black uppercase tracking-wider ${textPrimary}`}>
                  2. Pending Ownership Proposals & Approvals
                </h3>
              </div>
              <button
                onClick={fetchProposals}
                className="p-1.5 rounded-lg bg-slate-500/10 hover:bg-slate-500/20 text-slate-400 hover:text-white transition-all cursor-pointer flex items-center space-x-1 text-[10px] font-bold"
              >
                <RefreshCw className={`w-3 h-3 ${loadingProposals ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>

            {loadingProposals ? (
              <div className="p-4 text-center text-xs text-slate-400 font-mono">
                Inapakia proposals na approvals...
              </div>
            ) : proposals.length === 0 ? (
              <div className={`p-4 rounded-xl border ${bgInner} text-center space-y-1`}>
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto opacity-80" />
                <p className="text-xs font-bold text-slate-300">Hakuna Pending Proposals zozote kwa sasa.</p>
                <p className="text-[10px] text-slate-500">
                  Mapendekezo mapya ya succession au emergency removal yataonekana hapa kwa ajili ya idhini.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {proposals.map((prop) => {
                  const totalRequired = prop.total_required || 2;
                  const currentApproved = prop.approval_count || 0;
                  const isExecuted = prop.status === "executed";

                  return (
                    <div
                      key={prop.id}
                      className={`p-4 rounded-xl border transition-all space-y-3 ${
                        isExecuted
                          ? "border-emerald-500/30 bg-emerald-500/5"
                          : "border-sky-500/30 bg-sky-500/5"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/30 pb-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-black uppercase tracking-wider text-slate-100">
                              Aina: {prop.proposal_type?.toUpperCase()}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                isExecuted
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              }`}
                            >
                              {prop.status.toUpperCase()}
                            </span>
                          </div>
                          <span className="text-[9.5px] font-mono text-slate-400 block mt-0.5">
                            Proposal ID: {prop.id}
                          </span>
                        </div>

                        {/* Quorum Approval Tally Display */}
                        <div className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-right">
                          <span className="text-[9px] font-bold text-slate-400 block uppercase">
                            APPROVAL QUORUM
                          </span>
                          <span className="text-xs font-black font-mono text-sky-400">
                            {currentApproved}/{totalRequired} SuperAdmins Wamekubali
                          </span>
                        </div>
                      </div>

                      {/* Details Box */}
                      <div className="text-xs space-y-1 font-mono text-slate-300">
                        {prop.successor_username && (
                          <p>
                            Proposed Successor: <span className="text-amber-400 font-bold">@{prop.successor_username}</span>
                          </p>
                        )}
                        {prop.reason && (
                          <p className="text-slate-400">
                            Sababu: <span className="italic text-slate-200">"{prop.reason}"</span>
                          </p>
                        )}
                        <p className="text-[9px] text-slate-500">
                          Muda: {new Date(prop.created_at).toLocaleString()}
                        </p>
                      </div>

                      {/* Approval Button for SUPER_ADMIN */}
                      {!isExecuted && isSuperAdmin && (
                        <div className="pt-1">
                          <button
                            onClick={() => handleApproveProposal(prop.id)}
                            disabled={approvingProposalId === prop.id}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {approvingProposalId === prop.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <Check className="w-4 h-4" />
                                <span>Approve Proposal (superadmin_approve_proposal)</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Emergency Removal Proposal Form for SUPER_ADMIN */}
            {isSuperAdmin && (
              <div className="pt-4 border-t border-slate-700/40 space-y-2">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <h4 className="text-xs font-black uppercase text-rose-300">
                    Emergency: Propose Owner Removal (SuperAdmin Only)
                  </h4>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={emergencyReason}
                    onChange={(e) => setEmergencyReason(e.target.value)}
                    placeholder="Andika sababu ya dharura ya kuondoa Owner..."
                    className={`flex-1 px-3 py-2 text-xs font-bold rounded-xl border focus:outline-none focus:border-rose-500 ${
                      theme === "light"
                        ? "bg-slate-50 border-slate-300 text-slate-900"
                        : "bg-neutral-950 border-neutral-800 text-white"
                    }`}
                  />
                  <button
                    onClick={handleProposeEmergencyRemoval}
                    disabled={!emergencyReason || isSubmittingEmergency}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 active:scale-95 disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shrink-0 flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    {isSubmittingEmergency ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <UserX className="w-4 h-4" />
                        <span>Propose Removal</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── SECTION 3: ADMIN ROLE MANAGEMENT (OWNER & SUPER_ADMIN) ────────── */}
          <div className={`p-5 rounded-2xl border ${bgCard} shadow-lg space-y-4`}>
            <div className="flex items-center space-x-2 border-b border-slate-700/40 pb-3">
              <UserCheck className="w-5 h-5 text-purple-400" />
              <h3 className={`text-xs sm:text-sm font-black uppercase tracking-wider ${textPrimary}`}>
                3. Admin Role Management (admin_change_role)
              </h3>
            </div>

            <p className={`text-xs ${textSubtle}`}>
              Badilisha majukumu ya mtumiaji (USER, ADMIN, SUPER_ADMIN). Mabadiliko haya yanatekelezwa kikamilifu na
              Supabase RPC pekee.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Search Profile Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  A. Tafuta Profile ya Mtumiaji:
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={roleQuery}
                    onChange={(e) => setRoleQuery(e.target.value)}
                    placeholder="Search username au jina..."
                    className={`w-full pl-9 pr-3 py-2 text-xs font-bold rounded-xl border focus:outline-none focus:border-purple-500 ${
                      theme === "light"
                        ? "bg-slate-50 border-slate-300 text-slate-900"
                        : "bg-neutral-950 border-neutral-800 text-white"
                    }`}
                  />
                  {isSearchingRoleUser && (
                    <RefreshCw className="w-3.5 h-3.5 text-purple-400 animate-spin absolute right-3 top-2.5" />
                  )}
                </div>

                {/* Role Search Results */}
                {roleResults.length > 0 && (
                  <div className="space-y-1 max-h-32 overflow-y-auto p-1 bg-slate-950 border border-slate-800 rounded-xl">
                    {roleResults.map((prof) => (
                      <div
                        key={prof.profile_id || prof.id}
                        onClick={() => {
                          setSelectedRoleProfile(prof);
                          setRoleResults([]);
                        }}
                        className="p-1.5 rounded-lg border border-slate-800 hover:border-purple-500 bg-slate-900 flex items-center justify-between cursor-pointer text-xs"
                      >
                        <span className="font-bold text-slate-200">@{prof.username}</span>
                        <span className="text-[9px] font-mono text-purple-400 font-bold uppercase">
                          {prof.role}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {selectedRoleProfile && (
                  <div className="p-2 rounded-xl border border-purple-500/40 bg-purple-500/10 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-purple-200 block">
                        Iliyochaguliwa: @{selectedRoleProfile.username}
                      </span>
                      <span className="text-[9px] font-mono text-slate-400">
                        Sasa: {selectedRoleProfile.role}
                      </span>
                    </div>
                    <button onClick={() => setSelectedRoleProfile(null)} className="text-slate-400 p-1">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Select Role Dropdown & Badilisha Button */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  B. Chagua Role Mpya:
                </label>
                <select
                  value={targetNewRole}
                  onChange={(e) => setTargetNewRole(e.target.value)}
                  className={`w-full px-3 py-2 text-xs font-bold rounded-xl border focus:outline-none focus:border-purple-500 ${
                    theme === "light"
                      ? "bg-slate-50 border-slate-300 text-slate-900"
                      : "bg-neutral-950 border-neutral-800 text-white"
                  }`}
                >
                  <option value="USER">USER (Mchezaji wa kawaida)</option>
                  <option value="ADMIN">ADMIN (Msimamizi wa Kawaida)</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN (Msimamizi Mkuu)</option>
                </select>

                <div className="pt-2">
                  <button
                    onClick={handleChangeRole}
                    disabled={!selectedRoleProfile || isChangingRole}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-500 active:scale-95 disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    {isChangingRole ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Badilisha Role (admin_change_role)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── SECTION 4: CHANGE MASTER PASSWORD (OWNER ONLY) ────────────────── */}
          {isOwner && (
            <div className={`p-5 rounded-2xl border ${bgCard} shadow-lg space-y-4`}>
              <div className="flex items-center space-x-2 border-b border-slate-700/40 pb-3">
                <Key className="w-5 h-5 text-emerald-400" />
                <h3 className={`text-xs sm:text-sm font-black uppercase tracking-wider ${textPrimary}`}>
                  4. Change Master Password (Owner Only)
                </h3>
              </div>

              <p className={`text-xs ${textSubtle}`}>
                Badilisha Master Password ya mfumo inayotumiwa kuthibitishe maamuzi makuu kama kuhamisha umiliki.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Current Password:
                  </label>
                  <input
                    type="password"
                    autoComplete="off"
                    value={currentMasterPass}
                    onChange={(e) => setCurrentMasterPass(e.target.value)}
                    placeholder="Password ya sasa..."
                    className={`w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border focus:outline-none focus:border-emerald-500 ${
                      theme === "light"
                        ? "bg-slate-50 border-slate-300 text-slate-900"
                        : "bg-neutral-950 border-neutral-800 text-white"
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    New Master Password:
                  </label>
                  <input
                    type="password"
                    autoComplete="off"
                    value={newMasterPass}
                    onChange={(e) => setNewMasterPass(e.target.value)}
                    placeholder="Password mpya..."
                    className={`w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border focus:outline-none focus:border-emerald-500 ${
                      theme === "light"
                        ? "bg-slate-50 border-slate-300 text-slate-900"
                        : "bg-neutral-950 border-neutral-800 text-white"
                    }`}
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleChangeMasterPassword}
                  disabled={!currentMasterPass || !newMasterPass || isChangingMasterPass}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  {isChangingMasterPass ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <Key className="w-4 h-4" />
                      <span>Badilisha Master Password</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
