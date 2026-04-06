# Varylo API v1 — Documentación

API REST para integraciones externas con Varylo. Permite enviar mensajes de WhatsApp, consultar plantillas, verificar estados de entrega y recibir mensajes entrantes via webhooks.

## Autenticación

Todas las peticiones requieren una API key en el header `Authorization`:

```
Authorization: Bearer vk_live_tu_api_key
```

### Obtener una API key

1. Ir a **Configuración > API** en el panel de Varylo
2. Click en **Crear API Key**
3. Copiar la clave — solo se muestra una vez

### Límites

- **Rate limit:** 60 peticiones por minuto por API key (configurable)
- **Máximo:** 5 API keys activas por empresa

### Scopes disponibles

| Scope | Descripción |
|-------|-------------|
| `templates:read` | Listar plantillas de WhatsApp |
| `messages:read` | Consultar estado de mensajes |
| `messages:write` | Enviar mensajes |
| `webhooks:write` | Registrar/eliminar webhooks |

---

## Endpoints

### Base URL

```
https://tu-dominio.com/api/v1
```

---

### 1. Validar API Key

Verifica que la API key es válida y retorna información de la cuenta.

```
GET /api/v1/auth
```

**Respuesta exitosa (200):**

```json
{
  "success": true,
  "company": {
    "id": "clxyz...",
    "name": "Mi Empresa",
    "status": "ACTIVE",
    "plan": "PRO"
  },
  "whatsapp": {
    "connected": true,
    "phoneNumberId": "123456789",
    "phoneDisplay": "+57 300 123 4567"
  }
}
```

---

### 2. Verificar Conexión WhatsApp

Hace ping a la API de Meta para confirmar que el canal WhatsApp está activo y el token es válido.

```
GET /api/v1/status
```

**Respuesta (conexión activa):**

```json
{
  "success": true,
  "connected": true,
  "phoneDisplay": "+57 300 123 4567"
}
```

**Respuesta (conexión inactiva):**

```json
{
  "success": true,
  "connected": false,
  "reason": "WhatsApp credentials are incomplete."
}
```

---

### 3. Listar Plantillas WhatsApp

Retorna las plantillas aprobadas en tu cuenta de WhatsApp Business.

```
GET /api/v1/templates
```

**Query params:**

| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `status` | string | `APPROVED` | Filtro: `APPROVED` o `ALL` |

**Respuesta (200):**

```json
{
  "success": true,
  "templates": [
    {
      "name": "hello_world",
      "language": "es",
      "status": "APPROVED",
      "category": "MARKETING",
      "components": [
        {
          "type": "BODY",
          "text": "Hola {{1}}, gracias por tu compra."
        }
      ]
    }
  ]
}
```

**Scope requerido:** `templates:read`

---

### 4. Enviar Mensaje

Envía un mensaje de WhatsApp a un número de teléfono. Soporta mensajes de texto (dentro de la ventana de 24h) y mensajes de plantilla (sin restricción).

```
POST /api/v1/messages
```

**Scope requerido:** `messages:write`

#### 4a. Enviar mensaje de texto

Solo funciona si el contacto envió un mensaje en las últimas 24 horas.

```json
{
  "to": "573001234567",
  "type": "text",
  "text": "Hola, ¿en qué puedo ayudarte?"
}
```

#### 4b. Enviar mensaje con plantilla

Funciona sin restricción de ventana. Úsalo para iniciar conversaciones.

```json
{
  "to": "573001234567",
  "type": "template",
  "template": {
    "name": "hello_world",
    "language": "es",
    "components": [
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "Juan" }
        ]
      }
    ]
  }
}
```

**Campos opcionales:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `contactName` | string | Nombre del contacto (si es nuevo, se crea con este nombre) |
| `template.body` | string | Texto para guardar en BD como contenido del mensaje |

**Respuesta exitosa (200):**

```json
{
  "success": true,
  "message": {
    "id": "clxyz...",
    "providerMessageId": "wamid.HBgL...",
    "conversationId": "clxyz...",
    "contactId": "clxyz...",
    "to": "573001234567",
    "type": "template",
    "status": "sent"
  }
}
```

**Error: ventana expirada (400):**

```json
{
  "success": false,
  "error": "24-hour conversation window expired. Use a template message to restart.",
  "code": "WINDOW_EXPIRED"
}
```

---

### 5. Consultar Estado de Mensaje

Verifica si un mensaje fue entregado o leído.

```
GET /api/v1/messages/status?messageId=xxx
```

**Query params:**

| Param | Tipo | Descripción |
|-------|------|-------------|
| `messageId` | string | ID interno del mensaje o `providerMessageId` de WhatsApp |

**Respuesta (200):**

```json
{
  "success": true,
  "message": {
    "id": "clxyz...",
    "providerMessageId": "wamid.HBgL...",
    "direction": "OUTBOUND",
    "from": "123456789",
    "to": "573001234567",
    "content": "Hola!",
    "mediaType": null,
    "timestamp": "2026-04-06T15:30:00.000Z",
    "status": "delivered"
  }
}
```

**Valores posibles de `status`:** `sent`, `delivered`, `read`, `failed`

**Scope requerido:** `messages:read`

---

### 6. Webhooks (recibir mensajes entrantes y estados)

Registra una URL para recibir notificaciones cuando un contacto responde o cuando cambia el estado de un mensaje enviado.

#### Registrar webhook

```
POST /api/v1/webhooks
```

```json
{
  "url": "https://tu-servidor.com/webhook",
  "events": ["message.received", "message.status"]
}
```

**Eventos disponibles:**

| Evento | Descripción |
|--------|-------------|
| `message.received` | Un contacto envió un mensaje a tu WhatsApp |
| `message.status` | Cambió el estado de un mensaje enviado (delivered, read, failed) |

**Respuesta (200):**

```json
{
  "success": true,
  "webhook": {
    "url": "https://tu-servidor.com/webhook",
    "events": ["message.received", "message.status"],
    "secret": "a1b2c3d4...",
    "status": "active"
  },
  "note": "Save the secret — it is used to verify webhook payloads (HMAC-SHA256 in X-Varylo-Signature header)."
}
```

> **Importante:** Guarda el `secret` — se usa para verificar la firma de los payloads.

**Scope requerido:** `webhooks:write`

#### Consultar webhook

```
GET /api/v1/webhooks
```

#### Eliminar webhook

```
DELETE /api/v1/webhooks
```

---

## Formato de Webhooks Entrantes

### Evento: `message.received`

Se envía cuando un contacto manda un mensaje a tu número de WhatsApp.

```json
{
  "event": "message.received",
  "timestamp": "2026-04-06T15:30:00.000Z",
  "data": {
    "conversationId": "clxyz...",
    "contactId": "clxyz...",
    "from": "573001234567",
    "content": "Hola, necesito ayuda",
    "mediaUrl": null,
    "mediaType": null,
    "timestamp": "2026-04-06T15:30:00.000Z"
  }
}
```

### Evento: `message.status`

Se envía cuando cambia el estado de un mensaje que enviaste.

```json
{
  "event": "message.status",
  "timestamp": "2026-04-06T15:31:00.000Z",
  "data": {
    "providerMessageId": "wamid.HBgL...",
    "status": "delivered",
    "recipientId": "573001234567",
    "timestamp": "1712345678",
    "errors": null
  }
}
```

### Verificación de firma

Cada webhook incluye un header `X-Varylo-Signature` con la firma HMAC-SHA256 del body usando tu `secret`:

```javascript
const crypto = require('crypto');

function verifyWebhook(body, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return signature === expected;
}

// En tu servidor:
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-varylo-signature'];
  const isValid = verifyWebhook(JSON.stringify(req.body), signature, WEBHOOK_SECRET);

  if (!isValid) {
    return res.status(403).send('Invalid signature');
  }

  const { event, data } = req.body;

  if (event === 'message.received') {
    console.log(`Mensaje de ${data.from}: ${data.content}`);
  }

  if (event === 'message.status') {
    console.log(`Mensaje ${data.providerMessageId}: ${data.status}`);
  }

  res.status(200).send('OK');
});
```

---

## Errores Comunes

| HTTP | Error | Causa |
|------|-------|-------|
| 401 | `Missing or invalid Authorization header` | Falta el header `Authorization: Bearer ...` |
| 401 | `Invalid or inactive API key` | La key no existe o fue revocada |
| 401 | `API key has expired` | La key expiró |
| 403 | `Account is suspended` | La cuenta de la empresa está suspendida |
| 403 | `Insufficient permissions` | La key no tiene el scope necesario |
| 400 | `No WhatsApp channel configured` | No hay canal WhatsApp conectado en la empresa |
| 400 | `WINDOW_EXPIRED` | La ventana de 24h expiró, usar template |
| 429 | `Rate limit exceeded` | Se superó el límite de peticiones por minuto |
| 502 | `WhatsApp API error: ...` | Error de la API de Meta/WhatsApp |

---

## Ejemplo Completo con cURL

```bash
# 1. Validar conexión
curl -s -H "Authorization: Bearer vk_live_abc123..." \
  https://tu-dominio.com/api/v1/auth | jq .

# 2. Listar plantillas
curl -s -H "Authorization: Bearer vk_live_abc123..." \
  https://tu-dominio.com/api/v1/templates | jq .

# 3. Enviar plantilla
curl -s -X POST \
  -H "Authorization: Bearer vk_live_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "to": "573001234567",
    "type": "template",
    "template": {
      "name": "hello_world",
      "language": "es",
      "components": []
    }
  }' \
  https://tu-dominio.com/api/v1/messages | jq .

# 4. Verificar estado de entrega
curl -s -H "Authorization: Bearer vk_live_abc123..." \
  "https://tu-dominio.com/api/v1/messages/status?messageId=wamid.HBgL..." | jq .

# 5. Registrar webhook
curl -s -X POST \
  -H "Authorization: Bearer vk_live_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://mi-erp.com/varylo-webhook",
    "events": ["message.received", "message.status"]
  }' \
  https://tu-dominio.com/api/v1/webhooks | jq .
```
