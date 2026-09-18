"use client"

import { useState } from "react"
import {
  Check,
  CheckCheck,
  ExternalLink,
  MapPin,
  FileText,
  Phone,
  BarChart3,
  ImageOff,
  X,
} from "lucide-react"
import type {
  CardBlock,
  ContactBlock,
  DocBlock,
  LinkAction,
  LocationBlock,
  ParsedBlock,
  PhotoBlock,
  PollBlock,
  Segment,
} from "@/lib/parse-markers"
import { formatWhatsAppText } from "@/lib/parse-markers"

export interface ChatMessage {
  id: string
  text: string
  sender: "me" | "them"
  time: string
  status?: "sent" | "delivered" | "read"
  blocks?: ParsedBlock[]
  links?: LinkAction[]
  quickReplies?: string[]
  pollVote?: string | null
  variant?: "message" | "voice"
  voiceText?: string
  cachedAudioUrl?: string | null
}

interface MessageBubbleProps {
  message: ChatMessage
  onQuickReply?: (value: string) => void
  onPollVote?: (messageId: string, value: string) => void
}

export function MessageBubble({
  message,
  onQuickReply,
  onPollVote,
}: MessageBubbleProps) {
  const isMe = message.sender === "me"
  const blocks = message.blocks ?? [
    { kind: "text" as const, text: message.text },
  ]
  const links = message.links ?? []
  const quickReplies = message.quickReplies ?? []

  const hasMedia = blocks.some(
    (b) => b.kind === "photo" || b.kind === "location"
  )
  const onlyMedia =
    blocks.length === 1 &&
    (blocks[0].kind === "photo" || blocks[0].kind === "location")

  const timeBadge = (
    <span className="flex items-center gap-0.5 text-[11px] leading-none text-[#667781]">
      {message.time}
      {isMe && message.status === "read" && (
        <CheckCheck className="h-4 w-4 text-[#53bdeb]" aria-label="Lida" />
      )}
      {isMe && message.status === "delivered" && (
        <CheckCheck className="h-4 w-4" aria-label="Entregue" />
      )}
      {isMe && message.status === "sent" && (
        <Check className="h-4 w-4" aria-label="Enviada" />
      )}
    </span>
  )

  const bubbleBg = isMe ? "bg-[#d9fdd3]" : "bg-white"
  const hasLinks = links.length > 0

  return (
    <div
      className={`flex w-full flex-col ${
        isMe ? "items-end" : "items-start"
      } gap-1`}
    >
      <div
        className={`relative max-w-[85%] overflow-hidden rounded-lg shadow-sm ${
          isMe ? "rounded-tr-none" : "rounded-tl-none"
        } ${bubbleBg}`}
      >
        <span
          aria-hidden="true"
          className={`absolute top-0 h-0 w-0 border-8 ${
            isMe
              ? "-right-2 border-t-[#d9fdd3] border-l-[#d9fdd3] border-r-transparent border-b-transparent"
              : "-left-2 border-t-white border-r-white border-l-transparent border-b-transparent"
          }`}
        />

        <div className={onlyMedia ? "p-1" : "px-2 py-1.5"}>
          {blocks.map((block, i) =>
            renderBlock(block, i, {
              messageId: message.id,
              pollVote: message.pollVote ?? null,
              onPollVote,
              trailingTimeInPhoto: onlyMedia,
              timeBadge,
            })
          )}

          {!onlyMedia && !hasLinks && (
            <div className="mt-0.5 flex justify-end pr-0.5">{timeBadge}</div>
          )}
        </div>

        {hasLinks && (
          <>
            {!onlyMedia && (
              <div className="flex justify-end px-2 pb-1 pr-2.5">
                {timeBadge}
              </div>
            )}
            <div className="flex flex-col">
              {links.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-center gap-2 border-t px-3 py-2.5 text-[14px] font-medium text-[#027eb5] transition-colors ${
                    isMe
                      ? "border-[#b6ebb0] hover:bg-[#c9f4c1]"
                      : "border-[#e9edef] hover:bg-[#f4f7f8]"
                  }`}
                >
                  <ExternalLink className="h-4 w-4" />
                  {link.label}
                </a>
              ))}
            </div>
          </>
        )}
      </div>

      {quickReplies.length > 0 && !isMe && (
        <div
          className="flex w-full max-w-[85%] flex-col gap-1"
          role="group"
          aria-label="Respostas rápidas"
        >
          {quickReplies.map((opt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onQuickReply?.(opt)}
              aria-label={`Responder: ${opt}`}
              className="w-full rounded-lg border border-[#e9edef] bg-white px-4 py-2 text-center text-[14px] font-medium text-[#027eb5] shadow-sm transition-colors hover:bg-[#f4f7f8] active:bg-[#e9edef]"
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface BlockContext {
  messageId: string
  pollVote: string | null
  onPollVote?: (messageId: string, value: string) => void
  trailingTimeInPhoto: boolean
  timeBadge: React.ReactNode
}

function renderBlock(block: ParsedBlock, key: number, ctx: BlockContext) {
  switch (block.kind) {
    case "text":
      if (!block.text) return null
      return <TextView key={key} text={block.text} />
    case "card":
      return <CardView key={key} card={block} />
    case "photo":
      return (
        <PhotoView
          key={key}
          photo={block}
          trailingTime={ctx.trailingTimeInPhoto ? ctx.timeBadge : null}
        />
      )
    case "location":
      return <LocationView key={key} loc={block} />
    case "doc":
      return <DocView key={key} doc={block} />
    case "contact":
      return <ContactView key={key} contact={block} />
    case "poll":
      return (
        <PollView
          key={key}
          poll={block}
          vote={ctx.pollVote}
          onVote={(v) => ctx.onPollVote?.(ctx.messageId, v)}
        />
      )
  }
}

function FormattedText({ segments }: { segments: Segment[] }) {
  return (
    <>
      {segments.map((s, i) => {
        if (s.kind === "bold") return <strong key={i}>{s.text}</strong>
        if (s.kind === "italic") return <em key={i}>{s.text}</em>
        if (s.kind === "strike") return <s key={i}>{s.text}</s>
        if (s.kind === "mono")
          return (
            <code
              key={i}
              className="rounded bg-[#eff2f4] px-1 py-0.5 font-mono text-[13px]"
            >
              {s.text}
            </code>
          )
        return <span key={i}>{s.text}</span>
      })}
    </>
  )
}

function TextView({ text }: { text: string }) {
  const segments = formatWhatsAppText(text)
  return (
    <p className="whitespace-pre-wrap break-words text-[14.5px] leading-[19px] text-[#111b21]">
      <FormattedText segments={segments} />
    </p>
  )
}

function CardView({ card }: { card: CardBlock }) {
  return (
    <div className="-mx-1 -mt-1 mb-0.5 flex flex-col">
      <div className="px-1 pb-1">
        <p className="text-[15px] font-bold leading-tight text-[#111b21]">
          {card.title}
        </p>
        {card.subtitle && (
          <p className="mt-0.5 text-[13px] leading-tight text-[#54656f]">
            {card.subtitle}
          </p>
        )}
        <div className="mt-1 flex flex-col gap-0.5">
          {card.lines.map((line, i) => (
            <p key={i} className="text-[14px] leading-snug text-[#111b21]">
              <FormattedText segments={formatWhatsAppText(line)} />
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}


function PhotoView({
  photo,
  trailingTime,
}: {
  photo: PhotoBlock
  trailingTime: React.ReactNode
}) {
  const [failed, setFailed] = useState(false)
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="mb-1 overflow-hidden rounded-md">
        {failed ? (
          <div className="flex h-40 w-full max-w-[280px] items-center justify-center gap-2 rounded-md bg-[#eff2f4] text-[#54656f]">
            <ImageOff className="h-5 w-5" />
            <span className="text-[13px]">Foto indisponível</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="block"
            aria-label={`Abrir foto${photo.caption ? `: ${photo.caption}` : ""}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={photo.caption || "Foto"}
              className="block h-auto w-full max-w-[280px] rounded-md object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setFailed(true)}
            />
          </button>
        )}
        {photo.caption && (
          <p className="mt-1 px-1 text-[13.5px] leading-snug text-[#111b21]">
            {photo.caption}
          </p>
        )}
        {trailingTime && (
          <div className="mt-0.5 flex justify-end px-1">{trailingTime}</div>
        )}
      </div>
      {open && !failed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setOpen(false)
            }}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.url}
            alt={photo.caption || "Foto"}
            className="max-h-full max-w-full rounded-md"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </>
  )
}

function LocationView({ loc }: { loc: LocationBlock }) {
  return (
    <a
      href={loc.mapUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="mb-1 flex items-start gap-2 rounded-md border border-[#e9edef] bg-white px-2 py-2 transition-colors hover:bg-[#f6f8fa]"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e7f3ef] text-[#0b8f6d]">
        <MapPin className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold text-[#111b21]">
          {loc.name}
        </p>
        <p className="line-clamp-2 text-[12.5px] leading-tight text-[#54656f]">
          {loc.address}
        </p>
        <p className="mt-0.5 text-[11.5px] font-medium text-[#0b7ec7]">
          Ver no mapa
        </p>
      </div>
    </a>
  )
}

function DocView({ doc }: { doc: DocBlock }) {
  return (
    <a
      href={doc.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mb-1 flex items-center gap-2 rounded-md border border-[#e9edef] bg-[#f7f8fa] px-2 py-2 transition-colors hover:bg-[#eef1f4]"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-white text-[#d64545]">
        <FileText className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-medium text-[#111b21]">
          {doc.name}
        </p>
        <p className="text-[11.5px] text-[#54656f]">{doc.size}</p>
      </div>
    </a>
  )
}

function ContactView({ contact }: { contact: ContactBlock }) {
  return (
    <a
      href={contact.contactUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="mb-1 flex items-center gap-2 rounded-md border border-[#e9edef] bg-white px-2 py-2 transition-colors hover:bg-[#f6f8fa]"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e7f3ef] text-[#0b8f6d]">
        <Phone className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold text-[#111b21]">
          {contact.name}
        </p>
        <p className="truncate text-[12.5px] text-[#54656f]">{contact.phone}</p>
      </div>
      <span className="shrink-0 text-[11.5px] font-medium text-[#0b7ec7]">
        Chamar
      </span>
    </a>
  )
}

function PollView({
  poll,
  vote,
  onVote,
}: {
  poll: PollBlock
  vote: string | null
  onVote: (v: string) => void
}) {
  const hasVoted = vote !== null
  return (
    <div className="mb-1 rounded-md border border-[#e9edef] bg-white p-2">
      <div className="mb-1.5 flex items-center gap-1.5 text-[#54656f]">
        <BarChart3 className="h-3.5 w-3.5" />
        <span className="text-[11.5px] font-medium uppercase tracking-wide">
          Enquete
        </span>
      </div>
      <p className="mb-2 text-[14px] font-semibold text-[#111b21]">
        {poll.question}
      </p>
      <div className="flex flex-col gap-1">
        {poll.options.map((opt, i) => {
          const isPicked = opt === vote
          return (
            <button
              key={i}
              type="button"
              onClick={() => !hasVoted && onVote(opt)}
              disabled={hasVoted}
              aria-pressed={isPicked}
              className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-left text-[13px] transition-colors ${
                isPicked
                  ? "border-[#0b7ec7] bg-[#f0f7fb] text-[#0b7ec7]"
                  : "border-[#dfe5e7] text-[#111b21]"
              } ${
                hasVoted && !isPicked ? "opacity-60" : "hover:bg-[#f0f7fb]"
              } ${hasVoted ? "cursor-default" : ""}`}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                  isPicked ? "border-[#0b7ec7] bg-[#0b7ec7]" : "border-[#8696a0]"
                }`}
              >
                {isPicked && (
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                )}
              </span>
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function TypingBubble() {
  return (
    <div className="flex w-full justify-start">
      <div className="relative rounded-lg rounded-tl-none bg-white px-4 py-3 shadow-sm">
        <span
          aria-hidden="true"
          className="absolute -left-2 top-0 h-0 w-0 border-8 border-t-white border-r-white border-l-transparent border-b-transparent"
        />
        <div className="flex items-center gap-1" aria-label="Digitando">
          <span className="h-2 w-2 animate-bounce rounded-full bg-[#8696a0] [animation-delay:0ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-[#8696a0] [animation-delay:150ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-[#8696a0] [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  )
}
