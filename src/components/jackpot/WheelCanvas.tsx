import React from "react";
import { motion } from "motion/react";
import { WheelSegment } from "@/types/jackpot";

interface WheelCanvasProps {
  segments: WheelSegment[];
  rotationAngle: number;
  isSpinning: boolean;
  highlightedIndex: number | null;
  spinDurationMs?: number;
}

export const WheelCanvas: React.FC<WheelCanvasProps> = ({
  segments,
  rotationAngle,
  isSpinning,
  highlightedIndex,
  spinDurationMs = 10000,
}) => {
  const numSegments = segments.length || 1;
  const sliceAngle = 360 / numSegments;
  const radius = 180;
  const center = 200;

  const getCoordinatesForAngle = (angleInDegrees: number, r: number) => {
    const angleInRadians = (angleInDegrees * Math.PI) / 180;
    return { x: center + r * Math.cos(angleInRadians), y: center + r * Math.sin(angleInRadians) };
  };

  const createSegmentPath = (index: number) => {
    const startAngle = index * sliceAngle;
    const endAngle = (index + 1) * sliceAngle;
    const start = getCoordinatesForAngle(startAngle, radius);
    const end = getCoordinatesForAngle(endAngle, radius);
    const largeArcFlag = sliceAngle <= 180 ? 0 : 1;
    return [
      `M ${center} ${center}`,
      `L ${start.x} ${start.y}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
      "Z",
    ].join(" ");
  };

  return (
    <div className="relative flex items-center justify-center w-[320px] h-[320px] sm:w-[400px] sm:h-[400px] mx-auto select-none p-2">
      {/* Outer border */}
      <div className="absolute inset-1 rounded-full border border-amber-500/20 shadow-[0_0_15px_rgba(0,0,0,0.5)] pointer-events-none z-10" />

      {/* Needle at 12 o'clock */}
      <div className="absolute top-[-8px] z-30 flex flex-col items-center pointer-events-none">
        <motion.div
          animate={isSpinning ? { rotate: [0, -8, 5, -6, 2, 0] } : { rotate: 0 }}
          transition={
            isSpinning ? { repeat: Infinity, duration: 0.16, ease: "easeInOut" } : { duration: 0.3 }
          }
          className="flex flex-col items-center drop-shadow-[0_6px_12px_rgba(0,0,0,0.9)]"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 border-2 border-yellow-200 flex items-center justify-center shadow-lg">
            <span className="text-slate-950 font-black text-[10px]">▼</span>
          </div>
          <div className="-mt-1.5 w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-t-[20px] border-t-amber-400" />
        </motion.div>
      </div>

      {/* Rotating wheel */}
      <motion.div
        className="w-full h-full z-0 p-2"
        animate={{ rotate: rotationAngle }}
        transition={{ duration: spinDurationMs / 1000, ease: [0.05, 0.75, 0.1, 1.0] }}
      >
        <svg viewBox="0 0 400 400" className="w-full h-full drop-shadow-2xl overflow-visible">
          <defs>
            <radialGradient id="goldHubGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#78350f" />
            </radialGradient>
            {segments.map((seg, idx) => (
              <linearGradient
                key={`grad-${seg.id}`}
                id={`seg-grad-${idx}`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor={seg.color} stopOpacity="0.95" />
                <stop offset="100%" stopColor={seg.color} stopOpacity="0.7" />
              </linearGradient>
            ))}
          </defs>

          {/* Segments */}
          {segments.map((seg, idx) => {
            const isHighlighted = highlightedIndex === idx;
            return (
              <g key={seg.id}>
                <path
                  d={createSegmentPath(idx)}
                  fill={`url(#seg-grad-${idx})`}
                  stroke={isHighlighted ? "#fef08a" : "rgba(0,0,0,0.3)"}
                  strokeWidth={isHighlighted ? 3 : 1}
                  style={{ filter: isHighlighted ? "brightness(1.3)" : undefined }}
                />
                {/* Segment label */}
                {(() => {
                  const midAngle = (idx * sliceAngle + sliceAngle / 2) * (Math.PI / 180);
                  const labelR = radius * 0.68;
                  const lx = center + labelR * Math.cos(midAngle);
                  const ly = center + labelR * Math.sin(midAngle);
                  const rotateDeg = idx * sliceAngle + sliceAngle / 2;
                  return (
                    <text
                      x={lx}
                      y={ly}
                      textAnchor="middle"
                      dominantBaseline="central"
                      transform={`rotate(${rotateDeg}, ${lx}, ${ly})`}
                      className="pointer-events-none"
                      style={{
                        fontSize: "10px",
                        fontWeight: 800,
                        fill: "#fff",
                        textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                      }}
                    >
                      {seg.label}
                    </text>
                  );
                })()}
              </g>
            );
          })}

          {/* Center hub */}
          <circle
            cx={center}
            cy={center}
            r={28}
            fill="url(#goldHubGrad)"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth={2}
          />
          <text
            x={center}
            y={center}
            textAnchor="middle"
            dominantBaseline="central"
            style={{ fontSize: "11px", fontWeight: 900, fill: "#1c1917" }}
          >
            TT
          </text>
        </svg>
      </motion.div>
    </div>
  );
};
