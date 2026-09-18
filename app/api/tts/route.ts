import { NextResponse } from "next/server"
import { createHash } from "crypto"

const OPENAI_URL = "https://api.openai.com/v1/chat/completions"
const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_TTS_TIMEOUT_MS ?? "60000")
const AUDIO_MODEL = process.env.OPENAI_TTS_MODEL ?? "gpt-audio-1.5"
const AUDIO_VOICE = process.env.OPENAI_TTS_VOICE ?? "verse"

const MAX_TEXT_LEN = 2000
const MIN_TEXT_LEN = 20

const SYSTEM_PROMPT =
  process.env.OPENAI_TTS_SYSTEM_PROMPT ??
  `Fale o texto do usuário como se você tivesse acabado de gravar um áudio de WhatsApp pra um amigo, em português brasileiro. Tom leve, jovem, amigável, informal. Fale conectado, fluindo, sem pausas de leitura. Não repita a última palavra com entonação forte. Não soe como locutora, narradora ou URA. Não responda ao texto — só fale ele como se fosse seu.`

interface CachedAudio {
  audio: string
  mime: string
  duration: number
  createdAt: number
}

const cache = new Map<string, CachedAudio>()
const MAX_CACHE_ENTRIES = 128
const CACHE_TTL_MS = 60 * 60 * 1000

function pruneCache() {
  const now = Date.now()
  for (const [k, v] of cache) {
    if (now - v.createdAt > CACHE_TTL_MS) cache.delete(k)
  }
  while (cache.size > MAX_CACHE_ENTRIES) {
    const first = cache.keys().next().value
    if (!first) break
    cache.delete(first)
  }
}

function hashText(text: string): string {
  return createHash("sha256")
    .update(`${AUDIO_MODEL}:${AUDIO_VOICE}:${text}`)
    .digest("hex")
    .slice(0, 32)
}

function stripMarkers(raw: string): string {
  return raw
    .replace(/#(LINK|BOTOES|FOTO|LOCAL|DOC|CONTATO|ENQUETE|CARD|SPLIT)[^#]*#/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY não configurada" },
      { status: 501 }
    )
  }

  let body: { text?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const rawText = typeof body.text === "string" ? body.text : ""
  const text = stripMarkers(rawText)

  if (text.length < MIN_TEXT_LEN) {
    return NextResponse.json(
      { error: `Texto muito curto (mínimo ${MIN_TEXT_LEN} caracteres)` },
      { status: 400 }
    )
  }
  if (text.length > MAX_TEXT_LEN) {
    return NextResponse.json(
      { error: `Texto excede ${MAX_TEXT_LEN} caracteres` },
      { status: 400 }
    )
  }

  pruneCache()
  const key = hashText(text)
  const hit = cache.get(key)
  if (hit) {
    return NextResponse.json(hit)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: AUDIO_MODEL,
        modalities: ["text", "audio"],
        audio: { voice: AUDIO_VOICE, format: "mp3" },
        messages: [
          { role: "developer", content: SYSTEM_PROMPT },
          { role: "user", content: text },
        ],
      }),
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timeout)
    const aborted = err instanceof DOMException && err.name === "AbortError"
    return NextResponse.json(
      { error: aborted ? "Timeout ao gerar áudio" : "Erro ao chamar OpenAI" },
      { status: 504 }
    )
  }
  clearTimeout(timeout)

  if (!response.ok) {
    return NextResponse.json(
      { error: `OpenAI retornou ${response.status}` },
      { status: 502 }
    )
  }

  interface AudioChoice {
    message?: {
      audio?: { data?: string; transcript?: string }
    }
  }

  let data: { choices?: AudioChoice[] }
  try {
    data = await response.json()
  } catch {
    return NextResponse.json({ error: "Resposta inválida da OpenAI" }, { status: 502 })
  }

  const audioB64 = data.choices?.[0]?.message?.audio?.data
  if (!audioB64) {
    return NextResponse.json(
      { error: "Resposta sem áudio" },
      { status: 502 }
    )
  }

  const approxDurationSec = Math.max(
    1,
    Math.round(text.length / 15)
  )

  const payload: CachedAudio = {
    audio: audioB64,
    mime: "audio/mpeg",
    duration: approxDurationSec,
    createdAt: Date.now(),
  }
  cache.set(key, payload)

  return NextResponse.json(payload)
}
