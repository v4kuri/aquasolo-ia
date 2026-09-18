"use client"

import type { ReactNode } from "react"
import { useEffect, useState } from "react"

function StatusBar() {
  const [time, setTime] = useState("")

  useEffect(() => {
    const update = () =>
      setTime(
        new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      )
    update()
    const interval = setInterval(update, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative z-20 flex h-12 shrink-0 items-end justify-between bg-[#008069] px-7 pb-1 text-white">
      <span className="w-14 text-sm font-semibold tabular-nums">{time}</span>

      {/* Dynamic Island */}
      <div className="absolute left-1/2 top-2 h-[26px] w-[100px] -translate-x-1/2 rounded-full bg-black" />

      <div className="flex w-14 items-center justify-end gap-1.5">
        {/* Sinal */}
        <svg viewBox="0 0 18 12" className="h-3 w-[18px]" aria-hidden="true">
          <rect x="0" y="8" width="3" height="4" rx="0.8" fill="currentColor" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="0.8" fill="currentColor" />
          <rect x="10" y="3" width="3" height="9" rx="0.8" fill="currentColor" />
          <rect x="15" y="0.5" width="3" height="11.5" rx="0.8" fill="currentColor" />
        </svg>
        {/* Wi-Fi */}
        <svg viewBox="0 0 16 12" className="h-3 w-4" aria-hidden="true">
          <path
            d="M8 12L5.2 8.9a4.2 4.2 0 015.6 0L8 12zM3.1 6.6a7.4 7.4 0 019.8 0l-1.6 1.8a5 5 0 00-6.6 0L3.1 6.6zM0.5 3.7a11 11 0 0115 0l-1.6 1.8a8.6 8.6 0 00-11.8 0L0.5 3.7z"
            fill="currentColor"
          />
        </svg>
        {/* Bateria */}
        <svg viewBox="0 0 25 12" className="h-3 w-[25px]" aria-hidden="true">
          <rect x="0.5" y="0.5" width="21" height="11" rx="3" stroke="currentColor" fill="none" opacity="0.5" />
          <rect x="2" y="2" width="18" height="8" rx="1.8" fill="currentColor" />
          <path d="M23 4v4a2.2 2.2 0 000-4z" fill="currentColor" opacity="0.5" />
        </svg>
      </div>
    </div>
  )
}

export function IphoneFrame({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Mobile: tela cheia, sem moldura */}
      <div className="h-svh w-full md:hidden">{children}</div>

      {/* Desktop: moldura de iPhone */}
      <div className="relative hidden md:block">
        {/* Botões laterais */}
        <div className="absolute -left-[3px] top-[120px] h-8 w-[3px] rounded-l-md bg-[#3a3a3c]" />
        <div className="absolute -left-[3px] top-[170px] h-14 w-[3px] rounded-l-md bg-[#3a3a3c]" />
        <div className="absolute -left-[3px] top-[236px] h-14 w-[3px] rounded-l-md bg-[#3a3a3c]" />
        <div className="absolute -right-[3px] top-[180px] h-20 w-[3px] rounded-r-md bg-[#3a3a3c]" />

        {/* Corpo do iPhone */}
        <div className="rounded-[3.4rem] bg-[#1c1c1e] p-[5px] shadow-[0_0_0_2px_#3a3a3c,0_25px_60px_-12px_rgba(0,0,0,0.7)]">
          <div className="rounded-[3.1rem] bg-black p-[7px]">
            {/* Tela */}
            <div className="relative flex h-[calc(100svh-8rem)] max-h-[780px] min-h-[560px] w-[380px] flex-col overflow-hidden rounded-[2.6rem] bg-[#efeae2]">
              <StatusBar />
              <div className="min-h-0 flex-1">{children}</div>
              {/* Indicador home */}
              <div className="pointer-events-none absolute bottom-1.5 left-1/2 z-20 h-[5px] w-[130px] -translate-x-1/2 rounded-full bg-black/80" />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
