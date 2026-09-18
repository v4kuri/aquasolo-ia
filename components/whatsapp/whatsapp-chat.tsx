"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Lock } from "lucide-react"
import { ChatHeader } from "./chat-header"
import { ChatInput } from "./chat-input"
import {
  MessageBubble,
  TypingBubble,
  type ChatMessage,
} from "./message-bubble"
import { AudioBubble } from "./audio-bubble"
import { splitMessages } from "@/lib/parse-markers"

const AUDIO_THRESHOLD = Number(
  process.env.NEXT_PUBLIC_AUDIO_THRESHOLD_CHARS ?? "100"
)
const AUDIO_MIN_CHARS = 20
const AUDIO_EVERY_N = 2

const STORAGE_KEY = "aquasolo-ia:chat:v2"
const SESSION_KEY = "aquasolo-ia:session:v2"
const TYPING_MIN_MS = 700
const TYPING_MS_PER_CHAR = 18
const TYPING_MAX_MS = 3200
const REQUEST_TIMEOUT_MS = 300000

function nowTime() {
  return new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function readSession(): string {
  if (typeof window === "undefined") return ""
  try {
    const cached = window.localStorage.getItem(SESSION_KEY)
    if (cached) return cached
    const fresh = newId()
    window.localStorage.setItem(SESSION_KEY, fresh)
    return fresh
  } catch {
    return newId()
  }
}

function readMessages(): ChatMessage[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as ChatMessage[]
  } catch {
    return []
  }
}

function persistMessages(messages: ChatMessage[]) {
  if (typeof window === "undefined") return
  try {
    const safe = messages.map((m) => ({ ...m, cachedAudioUrl: null }))
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(safe))
  } catch {
    // storage full or blocked — ignore
  }
}

function computeTypingDelay(text: string): number {
  const clamped = Math.min(
    TYPING_MAX_MS,
    Math.max(TYPING_MIN_MS, text.length * TYPING_MS_PER_CHAR)
  )
  return clamped
}

export function WhatsAppChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [activeQuickRepliesId, setActiveQuickRepliesId] = useState<string | null>(
    null
  )
  const sessionIdRef = useRef<string>("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())
  const audioEligibleCountRef = useRef<number>(0)

  useEffect(() => {
    sessionIdRef.current = readSession()
    const cached = readMessages()
    if (cached.length > 0) setMessages(cached)
  }, [])

  useEffect(() => {
    persistMessages(messages)
  }, [messages])

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [messages, isTyping])

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((t) => clearTimeout(t))
      timers.clear()
    }
  }, [])

  const scheduleTimer = useCallback((fn: () => void, ms: number) => {
    const timers = timersRef.current
    const id = setTimeout(() => {
      timers.delete(id)
      fn()
    }, ms)
    timers.add(id)
    return id
  }, [])

  const appendReplies = useCallback(
    (raw: string, baseTime: string) => {
      const chunks = splitMessages(raw)
      if (chunks.length === 0) return

      const emit = (index: number) => {
        if (index >= chunks.length) {
          setIsTyping(false)
          return
        }
        const chunk = chunks[index]
        const delay = computeTypingDelay(chunk.raw)
        setIsTyping(true)
        scheduleTimer(() => {
          const eligibleForAudio = false
          const reply: ChatMessage = {
            id: newId(),
            text: chunk.raw,
            sender: "them",
            time: baseTime,
            blocks: chunk.parsed.blocks,
            links: chunk.parsed.links,
            quickReplies: chunk.parsed.quickReplies,
            pollVote: null,
            variant: eligibleForAudio ? "voice" : "message",
            voiceText: eligibleForAudio ? chunk.parsed.plainText : undefined,
            cachedAudioUrl: null,
          }
          setMessages((prev) => [...prev, reply])
          if (chunk.parsed.quickReplies.length > 0) {
            setActiveQuickRepliesId(reply.id)
          }
          setIsTyping(false)
          if (index + 1 < chunks.length) {
            scheduleTimer(() => emit(index + 1), 250)
          }
        }, delay)
      }

      emit(0)
    },
    [scheduleTimer]
  )

  const handleReset = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t))
    timersRef.current.clear()
    audioEligibleCountRef.current = 0
    setMessages([])
    setActiveQuickRepliesId(null)
    setIsTyping(false)
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(STORAGE_KEY)
        const fresh = newId()
        window.localStorage.setItem(SESSION_KEY, fresh)
        sessionIdRef.current = fresh
      } catch {
        sessionIdRef.current = newId()
      }
    }
  }, [])

  const handleSend = useCallback(
    async (text: string) => {
      if (text.trim().toLowerCase() === "/reset") {
        handleReset()
        return
      }
      const userMessage: ChatMessage = {
        id: newId(),
        text,
        sender: "me",
        time: nowTime(),
        status: "sent",
      }
      setMessages((prev) => [...prev, userMessage])
      setActiveQuickRepliesId(null)
      setIsTyping(true)

      scheduleTimer(() => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === userMessage.id ? { ...m, status: "delivered" } : m
          )
        )
      }, 500)
      scheduleTimer(() => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === userMessage.id ? { ...m, status: "read" } : m
          )
        )
      }, 1200)

      const controller = new AbortController()
      const timeoutId = scheduleTimer(() => controller.abort(), REQUEST_TIMEOUT_MS)

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            sessionId: sessionIdRef.current,
          }),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        timersRef.current.delete(timeoutId)

        if (!res.ok) throw new Error(`http ${res.status}`)

        const data = await res.json()
        const raw =
          data.output ||
          "Desculpe, não consegui processar sua mensagem. Tente novamente."

        appendReplies(raw, nowTime())
      } catch (err) {
        const aborted = err instanceof DOMException && err.name === "AbortError"
        setMessages((prev) => [
          ...prev,
          {
            id: newId(),
            text: aborted
              ? "A resposta demorou demais. Tenta de novo em instantes."
              : "Erro de conexão. Verifique sua internet e tente novamente.",
            sender: "them",
            time: nowTime(),
          },
        ])
        setIsTyping(false)
      }
    },
    [appendReplies, scheduleTimer, handleReset]
  )

  const handleQuickReply = useCallback(
    (value: string) => {
      void handleSend(value)
    },
    [handleSend]
  )

  const handlePollVote = useCallback(
    (messageId: string, value: string) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, pollVote: value } : m))
      )
      void handleSend(value)
    },
    [handleSend]
  )

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#efeae2]">
      <ChatHeader isTyping={isTyping} onReset={handleReset} />

      <div
        ref={scrollRef}
        className="relative flex-1 overflow-y-auto bg-[#efe7dd] px-3 py-2 [background-image:url('/images/whatsapp-bg.webp')] [background-size:420px_auto] [background-repeat:repeat]"
      >
        <div className="flex flex-col gap-1.5">
          <div className="my-1 flex justify-center">
            <span className="rounded-lg bg-white px-3 py-1 text-xs font-medium uppercase text-[#54656f] shadow-sm">
              Hoje
            </span>
          </div>

          <div className="mb-2 flex justify-center">
            <p className="flex max-w-[85%] items-start gap-1 rounded-lg bg-[#ffeecd] px-3 py-1.5 text-center text-[12.5px] leading-snug text-[#54656f] shadow-sm">
              <Lock className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
              <span>
                As mensagens são protegidas com a criptografia de ponta a
                ponta e ficam somente entre você e os participantes desta
                conversa.
              </span>
            </p>
          </div>

          {messages.map((message) => {
            const showQuickReplies =
              message.id === activeQuickRepliesId &&
              (message.quickReplies?.length ?? 0) > 0
            const bubbleMessage = showQuickReplies
              ? message
              : { ...message, quickReplies: [] }
            if (
              message.variant === "voice" &&
              message.voiceText &&
              message.sender === "them"
            ) {
              return (
                <div key={message.id} className="flex w-full justify-start">
                  <AudioBubble
                    messageId={message.id}
                    text={message.voiceText}
                    time={message.time}
                    isMe={false}
                    cachedAudioUrl={message.cachedAudioUrl ?? null}
                    onCacheAudio={(id, url) => {
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === id ? { ...m, cachedAudioUrl: url } : m
                        )
                      )
                    }}
                    onFail={(id) => {
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === id
                            ? { ...m, variant: "message", voiceText: undefined }
                            : m
                        )
                      )
                    }}
                  />
                </div>
              )
            }
            return (
              <MessageBubble
                key={message.id}
                message={bubbleMessage}
                onQuickReply={handleQuickReply}
                onPollVote={handlePollVote}
              />
            )
          })}

          {isTyping && <TypingBubble />}
        </div>
      </div>

      <ChatInput onSend={handleSend} disabled={isTyping} />
    </div>
  )
}
