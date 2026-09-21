import { NextResponse } from "next/server"

const N8N_WEBHOOK_URL = "https://automacao.v4kuri.com.br/webhook/aqua-sdr-ia"
const N8N_TIMEOUT_MS = 300000

const META_MARKER = "<<<META>>>"

function splitMeta(text: string): {
  message: string
  meta: Record<string, unknown> | null
} {
  const idx = text.indexOf(META_MARKER)
  if (idx === -1) return { message: text.trim(), meta: null }
  const message = text.slice(0, idx).trim()
  const metaStr = text.slice(idx + META_MARKER.length).trim()
  try {
    return { message, meta: JSON.parse(metaStr) }
  } catch {
    return { message, meta: null }
  }
}

function parseResponse(raw: string): {
  output: string
  meta: Record<string, unknown> | null
} {
  let payload = raw
  try {
    const data = JSON.parse(raw)
    payload = data.content ?? data.output ?? data.message ?? ""
  } catch {
    // texto puro
  }
  return splitMeta(payload)
}

export async function POST(request: Request) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), N8N_TIMEOUT_MS)

  try {
    const body = await request.json()
    const content: string | undefined = body?.message ?? body?.content
    const type: string = body?.type === "audio" ? "audio" : "text"
    const sessionId: string = body?.sessionId || crypto.randomUUID()

    if (!content || typeof content !== "string") {
      clearTimeout(timeout)
      return NextResponse.json({ error: "Mensagem inválida" }, { status: 400 })
    }

    const url = new URL(N8N_WEBHOOK_URL)
    url.searchParams.set("content", content)
    url.searchParams.set("type", type)
    url.searchParams.set("sessionId", sessionId)

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })

    clearTimeout(timeout)

    const raw = await response.text()

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Webhook n8n retornou erro",
          upstream_status: response.status,
          upstream_body: raw.slice(0, 2000),
          debug: { method: "GET", target: url.toString() },
        },
        { status: 502 }
      )
    }

    const { output, meta } = parseResponse(raw)
    return NextResponse.json({ output, meta })
  } catch (err) {
    clearTimeout(timeout)
    const aborted = err instanceof DOMException && err.name === "AbortError"
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      {
        error: aborted
          ? "Tempo esgotado ao consultar o assistente"
          : "Erro ao comunicar com o chatbot",
        detail,
      },
      { status: aborted ? 504 : 500 }
    )
  }
}
