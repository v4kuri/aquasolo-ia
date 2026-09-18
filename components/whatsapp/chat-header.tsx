"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowLeft, Video, Phone, MoreVertical, RotateCcw } from "lucide-react"
import { VerifiedBadge } from "./verified-badge"

interface ChatHeaderProps {
  isTyping: boolean
  onReset?: () => void
}

export function ChatHeader({ isTyping, onReset }: ChatHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [menuOpen])

  return (
    <header className="relative flex items-center gap-2 bg-[#008069] px-2 py-2 text-white">
      <button
        type="button"
        aria-label="Voltar"
        className="flex items-center rounded-full p-1 transition-colors hover:bg-white/10"
      >
        <ArrowLeft className="h-6 w-6" />
      </button>

      <img
        src="/images/aquasolo-logo.png"
        alt="Foto de perfil de Aquasolo IA"
        className="h-10 w-10 rounded-full object-contain bg-[#0077b6] p-1"
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-1 text-base font-medium leading-tight">
          <span className="truncate">Aquasolo IA</span>
          <VerifiedBadge className="h-4 w-4 shrink-0" />
        </span>
        <span className="truncate text-xs leading-tight text-white/85">
          {isTyping ? "digitando..." : "online"}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Chamada de vídeo"
          className="rounded-full p-2 transition-colors hover:bg-white/10"
        >
          <Video className="h-6 w-6" />
        </button>
        <button
          type="button"
          aria-label="Chamada de voz"
          className="rounded-full p-2 transition-colors hover:bg-white/10"
        >
          <Phone className="h-5 w-5" />
        </button>
        <div ref={menuRef} className="relative">
          <button
            type="button"
            aria-label="Mais opções"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-full p-2 transition-colors hover:bg-white/10"
          >
            <MoreVertical className="h-6 w-6" />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-1 top-full z-30 mt-1 min-w-[200px] overflow-hidden rounded-md bg-white text-[#111b21] shadow-lg ring-1 ring-black/5"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  onReset?.()
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[14px] transition-colors hover:bg-[#f0f2f5]"
              >
                <RotateCcw className="h-4 w-4 text-[#54656f]" />
                Resetar conversa
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
