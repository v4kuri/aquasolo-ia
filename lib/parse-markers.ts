export interface LinkAction {
  kind: "link"
  label: string
  url: string
}

export interface CardBlock {
  kind: "card"
  title: string
  subtitle: string
  lines: string[]
  buttonLabel: string
  buttonUrl: string
}

export interface PhotoBlock {
  kind: "photo"
  url: string
  caption: string
}

export interface LocationBlock {
  kind: "location"
  name: string
  address: string
  mapUrl: string
}

export interface DocBlock {
  kind: "doc"
  name: string
  size: string
  url: string
}

export interface ContactBlock {
  kind: "contact"
  name: string
  phone: string
  contactUrl: string
}

export interface PollBlock {
  kind: "poll"
  question: string
  options: string[]
}

export type ParsedBlock =
  | { kind: "text"; text: string }
  | CardBlock
  | PhotoBlock
  | LocationBlock
  | DocBlock
  | ContactBlock
  | PollBlock

export interface ParsedMessage {
  blocks: ParsedBlock[]
  links: LinkAction[]
  quickReplies: string[]
  hasRichContent: boolean
  plainText: string
}

const SPLIT_TOKEN = "#SPLIT#"

const LINK_RE = /#LINK:([^|#]+)\|([^#]+)#/g
const BOTOES_RE = /#BOTOES:([^#]+)#/g
const CARD_RE = /#CARD:([^|#]+)\|([^|#]*)\|([^|#]*)\|([^|#]+)\|([^#]+)#/g
const FOTO_RE = /#FOTO:([^|#]+)\|([^#]*)#/g
const LOCAL_RE = /#LOCAL:([^|#]+)\|([^|#]+)\|([^#]+)#/g
const DOC_RE = /#DOC:([^|#]+)\|([^|#]+)\|([^#]+)#/g
const CONTATO_RE = /#CONTATO:([^|#]+)\|([^|#]+)\|([^#]+)#/g
const ENQUETE_RE = /#ENQUETE:([^|#]+)\|([^#]+)#/g

const URL_ALLOWLIST: RegExp[] = [
  // Vanzella
  /^https:\/\/([a-z0-9-]+\.)*vanzella-transportes\.vercel\.app(\/|$)/i,
  /^https:\/\/([a-z0-9-]+\.)*vanzella\.com\.br(\/|$)/i,
  // WhatsApp
  /^https:\/\/wa\.me\//i,
  /^https:\/\/api\.whatsapp\.com\//i,
  // Google Maps
  /^https:\/\/(www\.)?google\.com\/maps/i,
  /^https:\/\/maps\.google\.com\//i,
  /^https:\/\/maps\.app\.goo\.gl\//i,
  /^https:\/\/goo\.gl\/maps\//i,
  // Image CDNs (fotos de destinos)
  /^https:\/\/([a-z0-9-]+\.)*unsplash\.com\//i,
  /^https:\/\/source\.unsplash\.com\//i,
  /^https:\/\/([a-z0-9-]+\.)*wikimedia\.org\//i,
  /^https:\/\/([a-z0-9-]+\.)*wikipedia\.org\//i,
  /^https:\/\/([a-z0-9-]+\.)*pexels\.com\//i,
  /^https:\/\/([a-z0-9-]+\.)*pixabay\.com\//i,
  /^https:\/\/res\.cloudinary\.com\//i,
  /^https:\/\/i\.imgur\.com\//i,
  /^https:\/\/([a-z0-9-]+\.)*githubusercontent\.com\//i,
  /^https:\/\/lh3\.googleusercontent\.com\//i,
  /^https:\/\/storage\.googleapis\.com\//i,
  /^https:\/\/([a-z0-9-]+\.)*vercel\.app\//i,
  /^https:\/\/([a-z0-9-]+\.)*vercel-storage\.com\//i,
  // Turismo MS oficial
  /^https:\/\/([a-z0-9-]+\.)*ms\.gov\.br\//i,
  /^https:\/\/([a-z0-9-]+\.)*turismo\.ms\.gov\.br\//i,
  /^https:\/\/([a-z0-9-]+\.)*bonito\.ms\.gov\.br\//i,
]

interface InlineMatch {
  start: number
  end: number
  block: ParsedBlock
}

const isSafeUrl = (raw: string): boolean => {
  // Same-origin relative paths (assets servidos pelo próprio deploy)
  if (raw.startsWith("/") && !raw.startsWith("//")) return true
  try {
    const u = new URL(raw)
    if (u.protocol !== "https:" && u.protocol !== "http:") return false
    return URL_ALLOWLIST.some((re) => re.test(raw))
  } catch {
    return false
  }
}

const isSafeContactUrl = (raw: string): boolean => {
  if (raw.startsWith("tel:")) return /^tel:\+?[\d\s()-]{4,}$/.test(raw)
  return isSafeUrl(raw)
}

function collectInline(source: string): InlineMatch[] {
  const matches: InlineMatch[] = []

  const push = (start: number, end: number, block: ParsedBlock) => {
    matches.push({ start, end, block })
  }

  let m: RegExpExecArray | null

  const cardRe = new RegExp(CARD_RE.source, "g")
  while ((m = cardRe.exec(source)) !== null) {
    const [, title, subtitle, linesRaw, label, url] = m
    const trimmedUrl = url.trim()
    if (!isSafeUrl(trimmedUrl)) continue
    push(m.index, m.index + m[0].length, {
      kind: "card",
      title: title.trim(),
      subtitle: subtitle.trim(),
      lines: linesRaw.split(";").map((s) => s.trim()).filter(Boolean),
      buttonLabel: label.trim(),
      buttonUrl: trimmedUrl,
    })
  }

  const fotoRe = new RegExp(FOTO_RE.source, "g")
  while ((m = fotoRe.exec(source)) !== null) {
    const [, url, caption] = m
    const trimmedUrl = url.trim()
    if (!isSafeUrl(trimmedUrl)) continue
    push(m.index, m.index + m[0].length, {
      kind: "photo",
      url: trimmedUrl,
      caption: caption.trim(),
    })
  }

  const localRe = new RegExp(LOCAL_RE.source, "g")
  while ((m = localRe.exec(source)) !== null) {
    const [, name, address, mapUrl] = m
    const trimmedUrl = mapUrl.trim()
    if (!isSafeUrl(trimmedUrl)) continue
    push(m.index, m.index + m[0].length, {
      kind: "location",
      name: name.trim(),
      address: address.trim(),
      mapUrl: trimmedUrl,
    })
  }

  const docRe = new RegExp(DOC_RE.source, "g")
  while ((m = docRe.exec(source)) !== null) {
    const [, name, size, url] = m
    const trimmedUrl = url.trim()
    if (!isSafeUrl(trimmedUrl)) continue
    push(m.index, m.index + m[0].length, {
      kind: "doc",
      name: name.trim(),
      size: size.trim(),
      url: trimmedUrl,
    })
  }

  const contatoRe = new RegExp(CONTATO_RE.source, "g")
  while ((m = contatoRe.exec(source)) !== null) {
    const [, name, phone, contactUrl] = m
    const trimmedUrl = contactUrl.trim()
    if (!isSafeContactUrl(trimmedUrl)) continue
    push(m.index, m.index + m[0].length, {
      kind: "contact",
      name: name.trim(),
      phone: phone.trim(),
      contactUrl: trimmedUrl,
    })
  }

  const enqueteRe = new RegExp(ENQUETE_RE.source, "g")
  while ((m = enqueteRe.exec(source)) !== null) {
    const [, question, optsRaw] = m
    const options = optsRaw
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 12)
    if (options.length < 2) continue
    push(m.index, m.index + m[0].length, {
      kind: "poll",
      question: question.trim(),
      options,
    })
  }

  matches.sort((a, b) => a.start - b.start)

  const noOverlap: InlineMatch[] = []
  let lastEnd = -1
  for (const match of matches) {
    if (match.start >= lastEnd) {
      noOverlap.push(match)
      lastEnd = match.end
    }
  }
  return noOverlap
}

export function parseMarkers(raw: string): ParsedMessage {
  const links: LinkAction[] = []
  const quickReplies: string[] = []

  let working = raw

  working = working.replace(LINK_RE, (_m, label: string, url: string) => {
    const trimmedUrl = url.trim()
    if (!isSafeUrl(trimmedUrl)) return ""
    links.push({ kind: "link", label: label.trim(), url: trimmedUrl })
    return ""
  })

  working = working.replace(BOTOES_RE, (_m, list: string) => {
    list
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 4)
      .forEach((opt) => quickReplies.push(opt))
    return ""
  })

  const inlineMatches = collectInline(working)

  const blocks: ParsedBlock[] = []
  let cursor = 0
  for (const { start, end, block } of inlineMatches) {
    if (start > cursor) {
      const textChunk = working.slice(cursor, start).trim()
      if (textChunk) blocks.push({ kind: "text", text: textChunk })
    }
    blocks.push(block)
    cursor = end
  }
  const tail = working.slice(cursor).trim()
  if (tail) blocks.push({ kind: "text", text: tail })

  if (blocks.length === 0 && (links.length > 0 || quickReplies.length > 0)) {
    blocks.push({ kind: "text", text: "" })
  }

  // CARD's action button is promoted to bubble-level link (WhatsApp
  // Business template layout puts all action buttons at the bubble base)
  for (const b of blocks) {
    if (b.kind === "card") {
      links.push({ kind: "link", label: b.buttonLabel, url: b.buttonUrl })
    }
  }

  const hasRichContent =
    links.length > 0 ||
    quickReplies.length > 0 ||
    blocks.some((b) => b.kind !== "text")

  const plainText = blocks
    .filter((b): b is { kind: "text"; text: string } => b.kind === "text")
    .map((b) => b.text)
    .join("\n\n")
    .trim()

  return { blocks, links, quickReplies, hasRichContent, plainText }
}

export interface SplitMessage {
  raw: string
  parsed: ParsedMessage
}

function subMessage(blocks: ParsedBlock[]): ParsedMessage {
  const plainText = blocks
    .filter((b): b is { kind: "text"; text: string } => b.kind === "text")
    .map((b) => b.text)
    .join("\n\n")
    .trim()
  const hasRichContent = blocks.some((b) => b.kind !== "text")
  return {
    blocks,
    links: [],
    quickReplies: [],
    hasRichContent,
    plainText,
  }
}

function isolateRichBlocks(msg: ParsedMessage): ParsedMessage[] {
  const hasRich = msg.blocks.some((b) => b.kind !== "text")
  const hasText = msg.blocks.some((b) => b.kind === "text")
  if (!hasRich || !hasText) return [msg]

  const result: ParsedMessage[] = []
  let current: ParsedBlock[] = []
  const flush = () => {
    if (current.length > 0) {
      result.push(subMessage(current))
      current = []
    }
  }

  for (const b of msg.blocks) {
    if (b.kind !== "text") {
      flush()
      result.push(subMessage([b]))
    } else {
      current.push(b)
    }
  }
  flush()

  // Anexar links/quickReplies na ÚLTIMA bolha (padrão WhatsApp Business:
  // CTA fecha a conversa). Se última for rica, ainda ok — o botão fica
  // dentro do balão dela.
  if (result.length > 0) {
    const target = result[result.length - 1]
    target.links = msg.links
    target.quickReplies = msg.quickReplies
    target.hasRichContent =
      target.hasRichContent ||
      msg.links.length > 0 ||
      msg.quickReplies.length > 0
  }

  return result
}

export function splitMessages(raw: string): SplitMessage[] {
  const chunks = raw
    .split(SPLIT_TOKEN)
    .map((s) => s.trim())
    .filter(Boolean)
  const source = chunks.length > 0 ? chunks : [raw]
  const out: SplitMessage[] = []
  for (const chunk of source) {
    const parsed = parseMarkers(chunk)
    const isolated = isolateRichBlocks(parsed)
    for (const sub of isolated) {
      out.push({ raw: chunk, parsed: sub })
    }
  }
  return out
}

export type Segment =
  | { kind: "plain"; text: string }
  | { kind: "bold" | "italic" | "strike" | "mono"; text: string }

const WA_FORMAT_RE = /(\*[^\s*][^*]*?\*|_[^\s_][^_]*?_|~[^\s~][^~]*?~|`[^`]+?`)/g

export function formatWhatsAppText(input: string): Segment[] {
  const out: Segment[] = []
  let last = 0
  let m: RegExpExecArray | null
  const re = new RegExp(WA_FORMAT_RE.source, "g")
  while ((m = re.exec(input)) !== null) {
    if (m.index > last) {
      out.push({ kind: "plain", text: input.slice(last, m.index) })
    }
    const token = m[0]
    const inner = token.slice(1, -1)
    const marker = token[0]
    if (marker === "*") out.push({ kind: "bold", text: inner })
    else if (marker === "_") out.push({ kind: "italic", text: inner })
    else if (marker === "~") out.push({ kind: "strike", text: inner })
    else out.push({ kind: "mono", text: inner })
    last = m.index + token.length
  }
  if (last < input.length) out.push({ kind: "plain", text: input.slice(last) })
  return out
}
