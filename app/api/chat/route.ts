// Proxy do chat AQUASOLO: encaminha texto ao webhook n8n aquasolo-sdr-ia
// e devolve pra UI o texto puro que o Rafa gerou.
import { NextResponse } from "next/server"

export const maxDuration = 800
export const dynamic = "force-dynamic"

const N8N_WEBHOOK_URL = "https://automacao.v4kuri.com.br/webhook/aquasolo-sdr-ia"

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
  let payload: string = raw ?? ""
  try {
    const data = JSON.parse(raw)
    payload = data?.content ?? data?.output ?? data?.message ?? ""
    if (typeof payload !== "string") payload = String(payload ?? "")
  } catch {
    // texto puro
  }
  return splitMeta(payload)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const content: string | undefined = body?.message ?? body?.content
    const type: string = body?.type === "audio" ? "audio" : "text"
    const sessionId: string = body?.sessionId || crypto.randomUUID()

    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Mensagem inválida" }, { status: 400 })
    }

    const url = new URL(N8N_WEBHOOK_URL)
    url.searchParams.set("content", content)
    url.searchParams.set("type", type)
    url.searchParams.set("sessionId", sessionId)

    // Sem timeout: espera o n8n responder o quanto for necessário.
    // A plataforma (Vercel) tem seu próprio limite de execução via maxDuration.
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    })

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
    const safeOutput = typeof output === "string" ? output : ""
    return NextResponse.json({
      output: safeOutput,
      meta: meta ?? null,
      upstream_status: response.status,
      upstream_length: raw.length,
      raw_debug: raw.length <= 8000 ? raw : `${raw.slice(0, 8000)}...(${raw.length - 8000} chars a mais)`,
    })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: "Erro ao comunicar com o chatbot", detail },
      { status: 500 }
    )
  }
}
