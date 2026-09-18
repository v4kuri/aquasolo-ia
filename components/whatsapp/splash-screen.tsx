"use client"

import { VerifiedBadge } from "./verified-badge"

export function SplashScreen({ hiding }: { hiding: boolean }) {
  return (
    <div
      className={`absolute inset-0 z-30 flex flex-col items-center justify-between bg-[#00a884] pb-10 pt-24 transition-all duration-700 ${
        hiding ? "pointer-events-none -translate-y-4 opacity-0" : "opacity-100"
      }`}
      aria-hidden={hiding}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <div className="splash-avatar overflow-hidden rounded-full shadow-2xl ring-4 ring-white/30">
          <img
            src="/images/aquasolo-logo.png"
            alt="Logo Aquasolo"
            className="h-28 w-28 object-contain bg-[#0077b6] p-3"
          />
        </div>
        <div className="splash-title flex items-center gap-1.5">
          <span className="text-2xl font-semibold text-white">Aquasolo IA</span>
          <VerifiedBadge className="h-5 w-5" />
        </div>
        <div className="splash-title flex items-center gap-2 text-white/80">
          <span className="typing-dot h-2 w-2 rounded-full bg-white/80" />
          <span className="typing-dot h-2 w-2 rounded-full bg-white/80 [animation-delay:0.15s]" />
          <span className="typing-dot h-2 w-2 rounded-full bg-white/80 [animation-delay:0.3s]" />
        </div>
      </div>

      <div className="splash-title flex flex-col items-center gap-1">
        <span className="text-xs uppercase tracking-[0.25em] text-white/70">
          Aquasolo
        </span>
      </div>

      <style jsx>{`
        .splash-avatar {
          animation: splash-pop 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        .splash-title {
          animation: splash-fade 0.9s ease 0.35s both;
        }
        .typing-dot {
          animation: splash-fade 0.9s ease 0.35s both,
            splash-bounce 1s ease-in-out 0.9s infinite;
        }
        @keyframes splash-pop {
          from { opacity: 0; transform: scale(0.4); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes splash-fade {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes splash-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  )
}
