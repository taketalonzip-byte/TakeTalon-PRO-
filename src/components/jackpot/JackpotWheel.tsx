import React, { useState, useEffect, useRef } from "react";
import { Play, Loader2, Timer, Hash } from "lucide-react";
import { WheelSegment, JackpotWheelProps, SpinHistoryRecord } from "@/types/jackpot";
import { useWheelSpin } from "@/hooks/useWheelSpin";
import { WheelCanvas } from "@/components/jackpot/WheelCanvas";
import { SeedControls } from "@/components/jackpot/SeedControls";
import { ProvablyFairVerifier } from "@/components/jackpot/ProvablyFairVerifier";
import { SpinHistory } from "@/components/jackpot/SpinHistory";
import { ResultModal } from "@/components/jackpot/ResultModal";
import { generateRandomSeed, sha256 } from "@/lib/jackpotCrypto";

export const JackpotWheel: React.FC<JackpotWheelProps> = ({
  segments,
  onSpinRequest,
  disabled = false,
  className,
  clientSeed: externalClientSeed,
  onClientSeedChange,
  onSpinComplete,
}) => {
  const [internalClientSeed, setInternalClientSeed] = useState(() => generateRandomSeed(16));
  const activeClientSeed = externalClientSeed ?? internalClientSeed;

  const handleSeedChange = (newSeed: string) => {
    if (onClientSeedChange) onClientSeedChange(newSeed);
    else setInternalClientSeed(newSeed);
  };

  const [nonce, setNonce] = useState(1);
  const [currentCommitHash, setCurrentCommitHash] = useState<string>("");
  const [isRequesting, setIsRequesting] = useState(false);

  // User number picks (max 10, range 1–300)
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([
    7, 15, 42, 88, 120, 150, 210, 245, 275, 298,
  ]);
  const [customNumInput, setCustomNumInput] = useState<string>("");

  // Auto spin countdown
  const [countdown, setCountdown] = useState<number>(60);
  const [isAutoTimerActive, setIsAutoTimerActive] = useState<boolean>(true);

  const [userTotalScore, setUserTotalScore] = useState<number>(1000);

  const [lastResult, setLastResult] = useState<{
    segment: WheelSegment;
    winningNumber: number;
    userSelectedNumbers: number[];
    isUserWinner: boolean;
    earnedPoints: number;
    serverSeed: string;
    clientSeed: string;
    nonce: number;
    commitHash: string;
  } | null>(null);

  const [showResultModal, setShowResultModal] = useState(false);

  const [isVerifierOpen, setIsVerifierOpen] = useState(false);
  const [history, setHistory] = useState<SpinHistoryRecord[]>([]);

  const [verifierInitialData, setVerifierInitialData] = useState<{
    serverSeed?: string;
    clientSeed?: string;
    nonce?: number;
    commitHash?: string;
    segmentIndex?: number;
  }>({});

  const { isSpinning, rotationAngle, spinToSegment, currentHighlightedSegment } = useWheelSpin({
    numSegments: segments.length,
    spinDurationMs: 10000,
  });

  // Pre-generate commit hash preview
  useEffect(() => {
    let mounted = true;
    sha256(generateRandomSeed(32)).then((hash) => {
      if (mounted && !currentCommitHash) setCurrentCommitHash(hash);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const triggerSpinRef = useRef<() => void>(() => {});

  const handleSpinClick = async () => {
    if (isSpinning || isRequesting || disabled) return;
    try {
      setIsRequesting(true);
      const response = await onSpinRequest(selectedNumbers);

      // Find winning segment
      const winningSegment = segments.find((s) => s.id === response.resultSegmentId);
      if (!winningSegment) throw new Error("Segment not found: " + response.resultSegmentId);

      const segmentIndex = segments.findIndex((s) => s.id === response.resultSegmentId);
      const isUserWinner = selectedNumbers.includes(response.winningNumber);
      const earnedPoints = isUserWinner ? winningSegment.points : 0;

      if (response.commitHash) setCurrentCommitHash(response.commitHash);

      setIsRequesting(false);
      spinToSegment(segmentIndex, () => {
        const result = {
          segment: winningSegment,
          winningNumber: response.winningNumber,
          userSelectedNumbers: [...selectedNumbers],
          isUserWinner,
          earnedPoints,
          serverSeed: response.serverSeed,
          clientSeed: response.clientSeed,
          nonce: response.nonce,
          commitHash: response.commitHash,
        };
        setLastResult(result);
        setShowResultModal(true);

        if (isUserWinner) {
          setUserTotalScore((prev) => prev + earnedPoints);
        }

        setHistory((prev) => [
          {
            id: crypto.randomUUID(),
            timestamp: new Date(),
            ...result,
            isVerified: false,
          },
          ...prev.slice(0, 9),
        ]);

        setNonce((n) => n + 1);

        if (onSpinComplete) onSpinComplete(result);
      });
    } catch (err) {
      console.error("[JackpotWheel] spin error:", err);
      setIsRequesting(false);
    }
  };

  triggerSpinRef.current = handleSpinClick;

  // Auto-spin countdown
  useEffect(() => {
    if (!isAutoTimerActive || isSpinning || isRequesting) return;
    if (countdown <= 0) {
      setCountdown(60);
      triggerSpinRef.current();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, isAutoTimerActive, isSpinning, isRequesting]);

  const handleOpenVerifierForRecord = (record: SpinHistoryRecord) => {
    const segIdx = segments.findIndex((s) => s.id === record.segment.id);
    setVerifierInitialData({
      serverSeed: record.serverSeed,
      clientSeed: record.clientSeed,
      nonce: record.nonce,
      commitHash: record.commitHash,
      segmentIndex: segIdx !== -1 ? segIdx : 0,
    });
    setIsVerifierOpen(true);
  };

  const addCustomNumber = () => {
    const num = parseInt(customNumInput, 10);
    if (
      !isNaN(num) &&
      num >= 1 &&
      num <= 300 &&
      !selectedNumbers.includes(num) &&
      selectedNumbers.length < 10
    ) {
      setSelectedNumbers((prev) => [...prev, num]);
    }
    setCustomNumInput("");
  };

  return (
    <div className={`w-full space-y-5 ${className ?? ""}`}>
      {/* Header */}
      <div className="text-center space-y-1">
        <h2 className="text-xl font-black text-amber-300 tracking-wider">🎰 JACKPOT WHEEL</h2>
        <p className="text-xs text-slate-400">Zunguka gurudumu — Provably Fair (SHA-256)</p>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold">
          <span>⭐ Pointi Zako:</span>
          <span className="font-black text-amber-200">{userTotalScore.toLocaleString()}</span>
        </div>
      </div>

      {/* Wheel */}
      <div className="relative">
        <WheelCanvas
          segments={segments}
          rotationAngle={rotationAngle}
          isSpinning={isSpinning}
          highlightedIndex={currentHighlightedSegment}
          spinDurationMs={10000}
        />

        {/* Last result overlay */}
        {lastResult && !isSpinning && !showResultModal && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: lastResult.segment.color }}
            />
            <span className="text-slate-200 font-bold">{lastResult.segment.label}</span>
            <span className="text-slate-400">#{lastResult.winningNumber}</span>
            {lastResult.isUserWinner && (
              <span className="text-emerald-400 font-black">+{lastResult.earnedPoints} PTS</span>
            )}
          </div>
        )}
      </div>

      {/* Spin button & timer */}
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={handleSpinClick}
          disabled={isSpinning || isRequesting || disabled}
          className="w-full max-w-xs h-11 rounded-xl font-black tracking-wider uppercase text-sm shadow-lg bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-slate-950 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {isRequesting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Preparing SHA-256...
            </>
          ) : isSpinning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Spinning...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              SPIN NOW
            </>
          )}
        </button>

        <div className="flex items-center gap-3 text-[11px] text-slate-400 w-full max-w-xs justify-between px-1">
          <span className="flex items-center gap-1">
            <Timer className="w-3 h-3" /> Auto: {countdown}s
          </span>
          <button
            onClick={() => setIsAutoTimerActive(!isAutoTimerActive)}
            className="text-amber-400 underline font-semibold hover:text-amber-300"
          >
            {isAutoTimerActive ? "Simamisha" : "Endesha"} Auto
          </button>
        </div>
      </div>

      {/* Number selection */}
      <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl">
        <div className="border-b border-slate-800 pb-2.5">
          <h3 className="text-sm font-black text-amber-300 flex items-center gap-2">
            <Hash className="w-4 h-4 text-amber-400" />
            CHAGUA NAMBA HADI 10 (1 – 300)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Kila namba imefungwa kwa rangi ya segment:
          </p>
        </div>

        {/* Segment-range table */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
          {segments.map((seg) => (
            <div
              key={seg.id}
              className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-950/80 border border-slate-800"
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: seg.color }}
              />
              <span className="text-slate-300 font-bold truncate">{seg.label}</span>
              <span className="ml-auto text-amber-400 font-black text-[10px]">+{seg.points}</span>
            </div>
          ))}
        </div>

        {/* Selected numbers chips */}
        <div className="flex flex-wrap gap-1.5">
          {selectedNumbers.map((n) => (
            <button
              key={n}
              onClick={() => setSelectedNumbers((prev) => prev.filter((x) => x !== n))}
              className="px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-bold hover:bg-rose-500/20 hover:border-rose-500/40 hover:text-rose-300 transition-colors"
              title="Bonyeza ili uondoe"
            >
              {n} ×
            </button>
          ))}
          {selectedNumbers.length === 0 && (
            <span className="text-slate-500 text-xs">Bado haujachagua namba yoyote</span>
          )}
        </div>

        {/* Custom number input */}
        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            max={300}
            value={customNumInput}
            onChange={(e) => setCustomNumInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustomNumber()}
            placeholder="Ingiza namba (1–300)"
            className="flex-1 px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-slate-100 text-xs outline-none focus:border-amber-500/50"
          />
          <button
            onClick={addCustomNumber}
            disabled={selectedNumbers.length >= 10}
            className="px-3 py-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold hover:bg-amber-500/30 transition-colors disabled:opacity-50"
          >
            + Ongeza
          </button>
        </div>

        {/* Quick picks per segment */}
        <div className="border-t border-slate-800 pt-3 space-y-1.5">
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
            Chagua haraka kwa segment:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {segments.map((seg) => (
              <div key={seg.id} className="flex flex-wrap gap-1">
                {seg.numbersRange.slice(0, 4).map((num) => (
                  <button
                    key={num}
                    onClick={() => {
                      if (selectedNumbers.includes(num)) {
                        setSelectedNumbers((prev) => prev.filter((x) => x !== num));
                      } else if (selectedNumbers.length < 10) {
                        setSelectedNumbers((prev) => [...prev, num]);
                      }
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                      selectedNumbers.includes(num)
                        ? "text-slate-950 border-transparent"
                        : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500"
                    }`}
                    style={selectedNumbers.includes(num) ? { backgroundColor: seg.color } : {}}
                  >
                    {num}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Seed controls */}
      <SeedControls
        commitHash={currentCommitHash}
        clientSeed={activeClientSeed}
        onClientSeedChange={handleSeedChange}
        nonce={nonce}
        isSpinning={isSpinning || isRequesting}
        onOpenVerifier={() => {
          if (lastResult) {
            const segIdx = segments.findIndex((s) => s.id === lastResult.segment.id);
            setVerifierInitialData({
              serverSeed: lastResult.serverSeed,
              clientSeed: lastResult.clientSeed,
              nonce: lastResult.nonce,
              commitHash: lastResult.commitHash,
              segmentIndex: segIdx !== -1 ? segIdx : 0,
            });
          }
          setIsVerifierOpen(true);
        }}
      />

      {/* Spin history */}
      <SpinHistory history={history} onVerifyRecord={handleOpenVerifierForRecord} />

      {/* Result modal */}
      <ResultModal
        isOpen={showResultModal}
        onClose={() => setShowResultModal(false)}
        segment={lastResult?.segment ?? null}
        winningNumber={lastResult?.winningNumber}
        userSelectedNumbers={lastResult?.userSelectedNumbers}
        isUserWinner={lastResult?.isUserWinner}
        earnedPoints={lastResult?.earnedPoints}
        serverSeed={lastResult?.serverSeed ?? ""}
        clientSeed={lastResult?.clientSeed ?? ""}
        nonce={lastResult?.nonce ?? 0}
        commitHash={lastResult?.commitHash ?? ""}
        onOpenVerifier={() => {
          setShowResultModal(false);
          if (lastResult) {
            const segIdx = segments.findIndex((s) => s.id === lastResult.segment.id);
            setVerifierInitialData({
              serverSeed: lastResult.serverSeed,
              clientSeed: lastResult.clientSeed,
              nonce: lastResult.nonce,
              commitHash: lastResult.commitHash,
              segmentIndex: segIdx !== -1 ? segIdx : 0,
            });
            setIsVerifierOpen(true);
          }
        }}
        onSpinAgain={() => setShowResultModal(false)}
      />

      {/* Provably fair verifier */}
      <ProvablyFairVerifier
        isOpen={isVerifierOpen}
        onClose={() => setIsVerifierOpen(false)}
        segments={segments}
        initialServerSeed={verifierInitialData.serverSeed}
        initialClientSeed={verifierInitialData.clientSeed ?? activeClientSeed}
        initialNonce={verifierInitialData.nonce ?? nonce}
        initialCommitHash={verifierInitialData.commitHash ?? currentCommitHash}
        initialSegmentIndex={verifierInitialData.segmentIndex ?? 0}
      />
    </div>
  );
};
