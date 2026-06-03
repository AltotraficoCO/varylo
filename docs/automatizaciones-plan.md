# Plan: Builder de Automatizaciones + ruteo de leads a agentes IA

> Estado: **Fase 0 implementada** (motor de despacho headless). Fase 1 (builder visual) pendiente.
> Contexto: Altotráfico. Los leads llegan desde una app propia (nunca escriben primero) y, según su **origen**, debe atenderlos un **agente IA distinto**. El builder visual será un feature **vendible** a los clientes de Varylo. **No se usa n8n** — todo nativo.

## Resumen

- **Fase 0 (motor de despacho, headless):** recibe un lead y lo entrega al agente correcto (crea contacto + tag de fuente, fija el agente, manda la plantilla de apertura, inyecta el contexto del lead). Cimiento de todo. Rutea leads ya, llamado por la app propia.
- **Fase 1 (builder visual):** módulo "Automatizaciones" que **reutiliza el lienzo de chatbots** (`@xyflow/react`) con 3 nodos (Webhook → Condición → Agente IA) y su propio motor de "una pasada".

## Restricción dura de WhatsApp
Para business-initiate (el cliente no escribió antes) Meta exige **plantilla aprobada**. La IA toma la charla libre recién cuando el lead responde. Por eso el primer mensaje siempre es una plantilla.

---

## FASE 0 — implementada

Archivos:
- `src/lib/lead-dispatch.ts` — `dispatchLead(...)`: resuelve canal WhatsApp, find/create contacto (+ tag de fuente), abre/reusa conversación con `handledByAiAgentId` fijado, guarda `leadContextJson`, envía plantilla (reusa `sendTemplateToPhone` de `broadcast.ts`).
- `src/app/api/v1/leads/route.ts` — `POST /api/v1/leads` (auth API key, scope `messages:write`).
- `prisma/schema.prisma` — `Conversation.leadContextJson Json?`.
- `prisma/migrations/20260602000000_add_conversation_lead_context/` — `ALTER TABLE ... ADD COLUMN`.
- `src/jobs/ai-agent.ts` — `buildSystemPrompt` inyecta el bloque "Datos que YA tienes de este lead… NO vuelvas a preguntar".

Contrato del endpoint:
```json
POST /api/v1/leads   (Authorization: Bearer <api key con scope messages:write>)
{
  "phone": "573001234567",
  "name": "Carolina",
  "agentId": "<ai agent id>",
  "source": "ads_form",
  "metadata": { "vertical": "ia" },
  "template": { "name": "apertura_ads", "language": "es", "components": [] }
}
```
En Fase 0 el **agente lo elige el llamante** (`agentId`). En Fase 1 lo resuelve el nodo Condición del lienzo (la app solo manda `source`).

Pendiente para activar: `pnpm install`, aplicar migración (`prisma migrate deploy` / `dev`), `prisma generate`, `pnpm build`. Crear las plantillas de apertura en Meta (una por fuente outbound).

---

## FASE 1 — pendiente

Modelos:
```prisma
model AutomationFlow { id, companyId, name, status(DRAFT|PUBLISHED), graphJson Json, webhookSecret, createdAt, updatedAt, runs AutomationRun[] }
model AutomationRun  { id, flowId, companyId, payload Json, path Json, status(SUCCESS|NO_MATCH|ERROR), error?, createdAt }
```

Grafo (`graphJson`, mismo patrón que `Chatbot.flowJson`):
```jsonc
{
  "startNodeId": "trigger_1",
  "nodes": {
    "trigger_1": { "type": "trigger", "next": "cond_1" },
    "cond_1": { "type": "condition", "field": "origen",
      "cases": [ { "value": "ads_form", "next": "agent_ads" }, { "value": "web_form", "next": "agent_web" } ],
      "elseNext": "agent_default" },
    "agent_ads": { "type": "dispatch_agent", "agentId": "...", "channelId": "...",
      "template": { "name": "apertura_ads", "lang": "es", "vars": ["name"] } }
  }
}
```

Nodos v1: **Trigger (Webhook)** `POST /api/automations/{flowId}/trigger` (auth por `webhookSecret`) · **Condición** (switch por campo, `==` en v1, N ramas + else) · **Despachar Agente IA** (terminal, llama `dispatchLead`).

Motor `src/jobs/automation-runner.ts` — intérprete de una pasada (sin sesiones), guard anti-ciclos (~50 pasos), persiste `AutomationRun`.

Reutilización del lienzo: extraer de `chatbots/[chatbotId]/flow-editor.tsx` un `src/components/flow/FlowCanvas.tsx` genérico (recibe `nodeTypes`, plantillas y panel de edición por props). El editor de automatizaciones lo usa con sus nodos.

UI: sección "Automatizaciones" (lista, editor con lienzo, URL+secret del webhook, vista de **Runs** para observabilidad).

---

## FASE 2 — futuro
- Fuente 1 (click-to-WhatsApp inbound): parsear `referral` de Meta (`ctwa_clid`/`source_id`) en el webhook de WhatsApp → enrutar al agente de pauta (sin plantilla).
- Nodo delay + seguimiento 24h.
- Más operadores de condición (`contiene`, `in`), versionado, métricas.

## Decisiones tomadas
- Un solo número de WhatsApp para todas las fuentes (el agente lo elige el nodo, no el número).
- 4 agentes separados (cada fuente = un agente con su system prompt), no un agente "router".
- Condición v1 = `==`.
