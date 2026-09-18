"use client"

import { useState, type KeyboardEvent } from "react"
import { Smile, Paperclip, Camera, Mic, Send } from "lucide-react"

interface ChatInputProps {
  onSend: (text: string) => void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState("")

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText("")
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (
      e.key === "Enter" &&
      !e.nativeEvent.isComposing &&
      e.keyCode !== 229
    ) {
      e.preventDefault()
      handleSend()
    }
  }

  const hasText = text.trim().length > 0

  return (
    <footer className="flex items-end gap-1.5 bg-[#f0f2f5] px-2 py-1.5">
      <div className="flex flex-1 items-center gap-1 rounded-full bg-white px-2 py-1">
        <button
          type="button"
          aria-label="Emojis"
          className="p-1 text-[#54656f]"
        >
          <Smile className="h-6 w-6" />
        </button>

        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Mensagem"
          aria-label="Digite uma mensagem"
          className="min-w-0 flex-1 bg-transparent py-1.5 text-[15px] text-[#111b21] placeholder:text-[#8696a0] focus:outline-none"
        />

        <button
          type="button"
          aria-label="Anexar arquivo"
          className="p-1 text-[#54656f]"
        >
          <Paperclip className="h-5 w-5 rotate-45" />
        </button>
        <button
          type="button"
          aria-label="Câmera"
          className="p-1 text-[#54656f]"
        >
          <Camera className="h-5 w-5" />
        </button>
      </div>

      <button
        type="button"
        onClick={handleSend}
        aria-label={hasText ? "Enviar mensagem" : "Gravar áudio"}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white transition-transform active:scale-95"
      >
        {hasText ? (
          <Send className="ml-0.5 h-5 w-5" />
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </button>
    </footer>
  )
}
