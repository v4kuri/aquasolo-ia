"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check, CheckCheck, Play, Pause, AlertCircle } from "lucide-react"

interface AudioBubbleProps {
  messageId: string
  text: string
  time: string
  isMe: boolean
  status?: "sent" | "delivered" | "read"
  onFail?: (messageId: string) => void
  cachedAudioUrl?: string | null
  onCacheAudio?: (messageId: string, url: string) => void
}

interface TtsResponse {
  audio: string
  mime: string
  duration: number
}

function formatSeconds(s: number): string {
  if (!Number.isFinite(s) || s < 0) s = 0
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, "0")}`
}

function base64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

const WAVEFORM_BARS = 34

export function AudioBubble({
  messageId,
  text,
  time,
  isMe,
  status,
  onFail,
  cachedAudioUrl,
  onCacheAudio,
}: AudioBubbleProps) {
  const [audioUrl, setAudioUrl] = useState<string | null>(cachedAudioUrl ?? null)
  const [loading, setLoading] = useState(!cachedAudioUrl)
  const [error, setError] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState<number>(0)
  const [current, setCurrent] = useState<number>(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (cachedAudioUrl) {
      setAudioUrl(cachedAudioUrl)
      setLoading(false)
      return
    }
    let cancelled = false
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setError(null)
    fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`http ${res.status}`)
        const data = (await res.json()) as TtsResponse
        if (cancelled) return
        const blob = base64ToBlob(data.audio, data.mime || "audio/mpeg")
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        onCacheAudio?.(messageId, url)
        setDuration(data.duration || 0)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        const aborted = err instanceof DOMException && err.name === "AbortError"
        if (aborted) return
        setError("Falha ao gerar áudio")
        setLoading(false)
        onFail?.(messageId)
      })
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [text, messageId, cachedAudioUrl, onCacheAudio, onFail])

  useEffect(() => {
    return () => {
      if (audioUrl && !cachedAudioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl, cachedAudioUrl])

  const bars = useMemo(() => {
    const seed = text.length
    return Array.from({ length: WAVEFORM_BARS }, (_, i) => {
      const wave = Math.sin((i + seed) * 1.3) * 0.5 + 0.5
      const noise = ((seed * (i + 7)) % 13) / 30
      return Math.min(1, Math.max(0.2, wave * 0.8 + noise))
    })
  }, [text])

  const handleToggle = () => {
    const el = audioRef.current
    if (!el) return
    if (playing) {
      el.pause()
    } else {
      el.play().catch(() => setError("Falha ao reproduzir"))
    }
  }

  const progressRatio = duration > 0 ? Math.min(1, current / duration) : 0
  const activeBars = Math.round(progressRatio * WAVEFORM_BARS)

  const bg = isMe ? "bg-[#d9fdd3]" : "bg-white"
  const tail = isMe
    ? "-right-2 border-t-[#d9fdd3] border-l-[#d9fdd3] border-r-transparent border-b-transparent"
    : "-left-2 border-t-white border-r-white border-l-transparent border-b-transparent"
  const tailPos = isMe ? "rounded-tr-none" : "rounded-tl-none"

  return (
    <div
      className={`relative max-w-[85%] rounded-lg shadow-sm ${tailPos} ${bg}`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-0 h-0 w-0 border-8 ${tail}`}
      />
      <div className="flex items-center gap-2.5 px-2 py-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0b7ec7] text-white">
          {loading ? (
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : error ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <button
              type="button"
              onClick={handleToggle}
              aria-label={playing ? "Pausar" : "Reproduzir"}
              className="flex h-full w-full items-center justify-center"
            >
              {playing ? (
                <Pause className="h-4 w-4 fill-current" />
              ) : (
                <Play className="ml-0.5 h-4 w-4 fill-current" />
              )}
            </button>
          )}
        </div>
        <div className="flex flex-col justify-center gap-1">
          <div
            className="flex h-6 items-center gap-[2px]"
            aria-hidden="true"
          >
            {bars.map((h, i) => (
              <span
                key={i}
                style={{ height: `${Math.round(h * 20 + 4)}px` }}
                className={`w-[2px] rounded-full ${
                  i < activeBars ? "bg-[#0b7ec7]" : "bg-[#8696a0]"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[#54656f]">
            <span className="tabular-nums">
              {formatSeconds(playing ? current : duration - current)}
            </span>
            {error && (
              <span className="text-[#d64545]">
                {error}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex justify-end px-2 pb-1 pr-2.5">
        <span className="flex items-center gap-0.5 text-[11px] leading-none text-[#667781]">
          {time}
          {isMe && status === "read" && (
            <CheckCheck className="h-4 w-4 text-[#53bdeb]" aria-label="Lida" />
          )}
          {isMe && status === "delivered" && (
            <CheckCheck className="h-4 w-4" aria-label="Entregue" />
          )}
          {isMe && status === "sent" && (
            <Check className="h-4 w-4" aria-label="Enviada" />
          )}
        </span>
      </div>

      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false)
            setCurrent(0)
          }}
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration
            if (Number.isFinite(d) && d > 0) setDuration(d)
          }}
          onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        />
      )}
    </div>
  )
}
