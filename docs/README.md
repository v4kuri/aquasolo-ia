# Vanzella IA — demo WhatsApp interativo

Preview do assistente **Vane** rodando dentro de uma UI que imita o WhatsApp
real. O agente vive em um fluxo n8n; o front-end interpreta marcadores
especiais no texto de resposta e transforma em elementos ricos (botões,
cards, fotos, enquetes, etc.).

## Rodando local

```bash
pnpm install
pnpm dev
```

Endpoint da API: `POST /api/chat` — recebe `{ message, sessionId }` e devolve
`{ output }`.

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e ajuste:

| Variável | Descrição | Default |
|----------|-----------|---------|
| `N8N_WEBHOOK_URL` | URL do webhook n8n | *(hardcoded como fallback, trocar)* |
| `N8N_TIMEOUT_MS` | Timeout do fetch pro n8n | `25000` |

## Prompt

O prompt vive em [`prompt-vane-v2.md`](./prompt-vane-v2.md). Cole no nó AI do
n8n como System.

## Marcadores suportados

| Marcador | Renderização |
|----------|-------------|
| `#LINK:label\|url#` | Botão de link |
| `#BOTOES:a\|b\|c#` | Quick-replies (2-4 chips) |
| `#FOTO:url\|legenda#` | Imagem com legenda + lightbox |
| `#LOCAL:nome\|end\|url#` | Card de mapa |
| `#DOC:nome\|tam\|url#` | PDF/anexo |
| `#CONTATO:nome\|tel\|url#` | Card de contato clicável |
| `#ENQUETE:pergunta\|op1\|op2#` | Enquete (com estado de "votado") |
| `#CARD:titulo\|sub\|linhas\|label\|url#` | Passagem "consultada" com botão |
| `#SPLIT#` | Divide resposta em múltiplas bolhas |

Formatação inline WhatsApp: `*negrito*`, `_itálico_`, `~riscado~`, `` `mono` ``.

## Allowlist de URLs

Por segurança, o parser rejeita URLs que não estejam em domínios conhecidos.
Editar em [`../lib/parse-markers.ts`](../lib/parse-markers.ts) no array
`URL_ALLOWLIST`.

Atualmente permitido:

- `*.vanzella-transportes.vercel.app`
- `*.vanzella.com.br`
- `wa.me` / `api.whatsapp.com`
- `google.com/maps`, `maps.google.com`, `maps.app.goo.gl`, `goo.gl/maps`
- `images.unsplash.com`
- `upload.wikimedia.org`, `commons.wikimedia.org`

`tel:+55...` também é aceito em `#CONTATO#`.

## Modo demo (sem n8n)

Em qualquer momento, digite `/demo <tipo>` no chat pra ver um exemplo.

Tipos: `saudacao`, `card`, `foto`, `local`, `doc`, `contato`, `enquete`,
`link`, `formatacao`, `split`, `help`.

## Persistência

- `localStorage['vanzella-ia:chat']` — histórico da conversa
- `localStorage['vanzella-ia:session']` — sessionId estável entre reloads

Pra resetar: `localStorage.clear()` no console.

## Estrutura

```
app/
  page.tsx              # entrada
  api/chat/route.ts     # proxy p/ n8n + demos
components/whatsapp/
  whatsapp-phone.tsx    # frame + splash
  whatsapp-chat.tsx     # estado + envio + SPLIT + typing delay
  message-bubble.tsx    # render de blocos + poll + lightbox
  chat-header.tsx
  chat-input.tsx
  iphone-frame.tsx
  splash-screen.tsx
  verified-badge.tsx
lib/
  parse-markers.ts      # parser dos marcadores + allowlist + SPLIT
  utils.ts
docs/
  prompt-vane-v2.md     # prompt do agente
  README.md             # este arquivo
```
