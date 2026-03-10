"use client";

import { useEffect } from "react";
import { useCelebration } from "@/features/gamification/hooks/use-completion-celebration";

const CONFETTI_COLORS = [
  "#f472b6",
  "#a78bfa",
  "#60a5fa",
  "#34d399",
  "#fbbf24",
  "#fb923c",
  "#f87171",
];

export function CompletionCelebration() {
  const { celebration, clearCelebration } = useCelebration();

  useEffect(() => {
    if (!celebration) return;
    const timer = setTimeout(clearCelebration, 3000);
    return () => clearTimeout(timer);
  }, [celebration, clearCelebration]);

  if (!celebration) return null;

  const hasAchievement = !!celebration.achievement;

  return (
    <div className="celebration-overlay" onClick={clearCelebration}>
      <style>{`
        .celebration-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: auto;
          animation: celebration-fade-in 0.2s ease-out;
        }

        @keyframes celebration-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .celebration-card {
          background: var(--background, #fff);
          border: 1px solid var(--border, #e5e7eb);
          border-radius: 1rem;
          padding: 2rem;
          text-align: center;
          animation: celebration-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
          position: relative;
          max-width: 20rem;
        }

        @keyframes celebration-pop {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }

        .confetti-container {
          position: fixed;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .confetti-dot {
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: confetti-fall 2s ease-out forwards;
        }

        @keyframes confetti-fall {
          0% {
            transform: translateY(-10px) rotate(0deg) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg) scale(0);
            opacity: 0;
          }
        }
      `}</style>

      <div className="confetti-container">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="confetti-dot"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${-10 + Math.random() * 20}%`,
              backgroundColor:
                CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              animationDelay: `${Math.random() * 0.5}s`,
              animationDuration: `${1.5 + Math.random() * 1}s`,
              width: `${6 + Math.random() * 6}px`,
              height: `${6 + Math.random() * 6}px`,
            }}
          />
        ))}
      </div>

      <div className="celebration-card">
        {hasAchievement ? (
          <>
            <span className="text-5xl block mb-3">
              {celebration.achievement!.icon}
            </span>
            <p className="heading-xs text-foreground mb-1">
              Achievement Unlocked!
            </p>
            <p className="body font-semibold text-foreground">
              {celebration.achievement!.name}
            </p>
            <p className="caption text-muted-foreground mt-1">
              {celebration.achievement!.description}
            </p>
          </>
        ) : (
          <>
            <span className="text-5xl block mb-3">
              {"\u2705"}
            </span>
            <p className="heading-xs text-foreground">Task Complete!</p>
            <p className="caption text-muted-foreground mt-1">
              Keep up the great work!
            </p>
          </>
        )}
      </div>
    </div>
  );
}
