"use client";

import React, { useEffect, useState, useRef } from "react";

interface AudioPulseWaveProps {
  isActive?: boolean;
  frequency?: number;
  barCount?: number;
  color?: "cyan" | "yellow" | "emerald" | "rose";
}

export const AudioPulseWave: React.FC<AudioPulseWaveProps> = ({
  isActive = false,
  frequency = 220,
  barCount = 5,
  color = "yellow",
}) => {
  const [pulse, setPulse] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const wasActiveRef = useRef(false);

  useEffect(() => {
    if (isActive && !wasActiveRef.current) {
      wasActiveRef.current = true;
      setPulse(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setPulse(false), 350);
    } else if (!isActive && wasActiveRef.current) {
      wasActiveRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      setPulse(false);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isActive]);

  const colorClasses = {
    yellow: "bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]",
    cyan: "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]",
    emerald: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]",
    rose: "bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.6)]",
  }[color];

  return (
    <div
      aria-hidden="true"
      className="inline-flex items-center gap-1 h-5 px-1.5 py-0.5 rounded-full bg-slate-950/80 border border-slate-700/50"
      title={`Audio Pulse (${frequency}Hz)`}
    >
      {Array.from({ length: barCount }).map((_, idx) => {
        // Height variation based on index and pulse state
        const heights = [
          pulse ? "h-4" : "h-1.5",
          pulse ? "h-5" : "h-2.5",
          pulse ? "h-3" : "h-1.5",
          pulse ? "h-4.5" : "h-2",
          pulse ? "h-2.5" : "h-1",
        ];

        return (
          <span
            key={idx}
            className={`w-1 rounded-full transition-all duration-150 ${colorClasses} ${
              heights[idx % heights.length]
            }`}
          />
        );
      })}
    </div>
  );
};

