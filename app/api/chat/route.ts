import { NextResponse } from "next/server"

const N8N_WEBHOOK_URL =
  process.env.N8N_WEBHOOK_URL ??
  "https://automacao.v4kuri.com.br/webhook/60f58b2f-0452-46e5-9c67-a3221f6238a5/chat"

const N8N_TIMEOUT_MS = Number(process.env.N8N_TIMEOUT_MS ?? "300000")

export async function POST(request: Request) {
  try {
    const { message, sessionId } = await request.json()

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Mensagem inválida" }, { status: 400 })
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), N8N_TIMEOUT_MS)

    let response: Response
    try {
      response = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sendMessage",
          sessionId: sessionId || crypto.randomUUID(),
          chatInput: message,
        }),
        signal: controller.signal,
      })
    } catch (err) {
      clearTimeout(timeout)
      const aborted = err instanceof DOMException && err.name === "AbortError"
      return NextResponse.json(
        {
          error: aborted
            ? "Tempo esgotado ao consultar o assistente"
            : "Erro ao comunicar com o chatbot",
        },
        { status: 504 }
      )
    }
    clearTimeout(timeout)

    if (!response.ok) {
      return NextResponse.json(
        { error: "Erro ao comunicar com o chatbot" },
        { status: 502 }
      )
    }

    const data = await response.json()

    return NextResponse.json({ output: data.output ?? "" })
  } catch {
    return NextResponse.json(
      { error: "Erro interno no servidor" },
      { status: 500 }
    )
  }
}
