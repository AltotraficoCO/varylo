import { auth } from '@/auth';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowLeft, Copy, ExternalLink } from 'lucide-react';
import { CopyButton } from './copy-button';

export default async function ApiDocsPage() {
    const session = await auth();
    if (!session?.user?.companyId) return null;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : 'https://tu-dominio.com';

    return (
        <div className="w-full max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <Link
                    href="/company/settings?tab=api"
                    className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Volver a API Keys
                </Link>
                <h1 className="text-2xl font-semibold text-foreground">API v1 — Documentación</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Referencia completa para integrar tu cuenta con sistemas externos.
                </p>
            </div>

            {/* Auth section */}
            <Section id="auth" title="Autenticación">
                <p className="text-sm text-muted-foreground mb-3">
                    Todas las peticiones requieren una API key en el header <code className="bg-muted px-1.5 py-0.5 rounded text-xs">Authorization</code>:
                </p>
                <CodeBlock code={`Authorization: Bearer vk_live_tu_api_key`} />
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                        <strong>Límites:</strong> 60 peticiones/minuto por API key. Máximo 5 keys activas por empresa.
                    </p>
                </div>
            </Section>

            {/* Endpoints */}
            <Section id="endpoints" title="Endpoints">
                <div className="space-y-2 mb-6">
                    <EndpointRow method="GET" path="/api/v1/auth" desc="Validar API key y ver info de cuenta" />
                    <EndpointRow method="GET" path="/api/v1/status" desc="Verificar conexión WhatsApp activa" />
                    <EndpointRow method="GET" path="/api/v1/templates" desc="Listar plantillas aprobadas" />
                    <EndpointRow method="POST" path="/api/v1/messages" desc="Enviar mensaje de WhatsApp" />
                    <EndpointRow method="GET" path="/api/v1/messages/status" desc="Consultar estado de entrega" />
                    <EndpointRow method="POST" path="/api/v1/webhooks" desc="Registrar webhook" />
                    <EndpointRow method="GET" path="/api/v1/webhooks" desc="Ver webhook actual" />
                    <EndpointRow method="DELETE" path="/api/v1/webhooks" desc="Eliminar webhook" />
                </div>
            </Section>

            {/* 1. Validate */}
            <Section id="validate" title="1. Validar API Key" sub>
                <EndpointHeader method="GET" path="/api/v1/auth" />
                <p className="text-sm text-muted-foreground mb-3">
                    Verifica que la API key es válida y retorna información de la cuenta y estado de WhatsApp.
                </p>
                <Label>Respuesta</Label>
                <CodeBlock lang="json" code={`{
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
}`} />
            </Section>

            {/* 2. Status */}
            <Section id="status" title="2. Verificar Conexión WhatsApp" sub>
                <EndpointHeader method="GET" path="/api/v1/status" />
                <p className="text-sm text-muted-foreground mb-3">
                    Hace ping a la API de Meta para confirmar que el canal WhatsApp está activo y el token es válido.
                </p>
                <Label>Respuesta</Label>
                <CodeBlock lang="json" code={`{
  "success": true,
  "connected": true,
  "phoneDisplay": "+57 300 123 4567"
}`} />
            </Section>

            {/* 3. Templates */}
            <Section id="templates" title="3. Listar Plantillas" sub>
                <EndpointHeader method="GET" path="/api/v1/templates" />
                <p className="text-sm text-muted-foreground mb-3">
                    Retorna las plantillas aprobadas en tu cuenta de WhatsApp Business.
                </p>
                <Label>Query params</Label>
                <ParamTable params={[
                    { name: 'status', type: 'string', def: 'APPROVED', desc: 'Filtro: APPROVED o ALL' },
                ]} />
                <Label>Respuesta</Label>
                <CodeBlock lang="json" code={`{
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
}`} />
            </Section>

            {/* 4. Send Message */}
            <Section id="messages" title="4. Enviar Mensaje" sub>
                <EndpointHeader method="POST" path="/api/v1/messages" />
                <p className="text-sm text-muted-foreground mb-3">
                    Envía un mensaje de WhatsApp. Soporta texto (dentro de ventana 24h) y plantillas (sin restricción).
                </p>

                <Label>Enviar texto (requiere ventana 24h activa)</Label>
                <CodeBlock lang="json" code={`{
  "to": "573001234567",
  "type": "text",
  "text": "Hola, ¿en qué puedo ayudarte?"
}`} />

                <Label>Enviar plantilla (sin restricción de ventana)</Label>
                <CodeBlock lang="json" code={`{
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
}`} />

                <Label>Respuesta exitosa</Label>
                <CodeBlock lang="json" code={`{
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
}`} />

                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md">
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                        <strong>Ventana de 24h:</strong> WhatsApp solo permite mensajes de texto libre si el contacto envió un mensaje en las últimas 24 horas. Para iniciar conversaciones, usa siempre un mensaje con plantilla.
                    </p>
                </div>
            </Section>

            {/* 5. Message Status */}
            <Section id="message-status" title="5. Estado de Entrega" sub>
                <EndpointHeader method="GET" path="/api/v1/messages/status?messageId=xxx" />
                <p className="text-sm text-muted-foreground mb-3">
                    Consulta si un mensaje fue entregado o leído. Acepta el ID interno o el <code className="bg-muted px-1.5 py-0.5 rounded text-xs">providerMessageId</code> de WhatsApp.
                </p>
                <Label>Respuesta</Label>
                <CodeBlock lang="json" code={`{
  "success": true,
  "message": {
    "id": "clxyz...",
    "providerMessageId": "wamid.HBgL...",
    "direction": "OUTBOUND",
    "from": "123456789",
    "to": "573001234567",
    "content": "Hola!",
    "timestamp": "2026-04-06T15:30:00.000Z",
    "status": "delivered"
  }
}`} />
                <Label>Valores de status</Label>
                <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline">sent</Badge>
                    <Badge variant="outline">delivered</Badge>
                    <Badge variant="outline">read</Badge>
                    <Badge variant="outline">failed</Badge>
                </div>
            </Section>

            {/* 6. Webhooks */}
            <Section id="webhooks" title="6. Webhooks" sub>
                <EndpointHeader method="POST" path="/api/v1/webhooks" />
                <p className="text-sm text-muted-foreground mb-3">
                    Registra una URL HTTPS para recibir notificaciones de mensajes entrantes y cambios de estado.
                </p>
                <Label>Request</Label>
                <CodeBlock lang="json" code={`{
  "url": "https://tu-servidor.com/webhook",
  "events": ["message.received", "message.status"]
}`} />

                <Label>Eventos disponibles</Label>
                <ParamTable params={[
                    { name: 'message.received', type: 'evento', desc: 'Un contacto envió un mensaje a tu WhatsApp' },
                    { name: 'message.status', type: 'evento', desc: 'Cambió el estado de un mensaje enviado (delivered, read, failed)' },
                ]} />

                <Label>Payload: message.received</Label>
                <CodeBlock lang="json" code={`{
  "event": "message.received",
  "timestamp": "2026-04-06T15:30:00.000Z",
  "data": {
    "conversationId": "clxyz...",
    "contactId": "clxyz...",
    "from": "573001234567",
    "content": "Hola, necesito ayuda",
    "mediaUrl": null,
    "mediaType": null
  }
}`} />

                <Label>Payload: message.status</Label>
                <CodeBlock lang="json" code={`{
  "event": "message.status",
  "timestamp": "2026-04-06T15:31:00.000Z",
  "data": {
    "providerMessageId": "wamid.HBgL...",
    "status": "delivered",
    "recipientId": "573001234567",
    "errors": null
  }
}`} />

                <Label>Verificación de firma</Label>
                <p className="text-sm text-muted-foreground mb-2">
                    Cada webhook incluye un header <code className="bg-muted px-1.5 py-0.5 rounded text-xs">X-Varylo-Signature</code> con la firma HMAC-SHA256 del body.
                </p>
                <CodeBlock lang="javascript" code={`const crypto = require('crypto');

function verifyWebhook(body, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return signature === expected;
}

// En tu servidor:
app.post('/webhook', (req, res) => {
  const sig = req.headers['x-varylo-signature'];
  if (!verifyWebhook(JSON.stringify(req.body), sig, SECRET)) {
    return res.status(403).send('Invalid signature');
  }

  const { event, data } = req.body;
  console.log(event, data);
  res.status(200).send('OK');
});`} />
            </Section>

            {/* Errors */}
            <Section id="errors" title="Errores Comunes">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b">
                                <th className="text-left py-2 pr-3 font-medium">HTTP</th>
                                <th className="text-left py-2 pr-3 font-medium">Error</th>
                                <th className="text-left py-2 font-medium">Causa</th>
                            </tr>
                        </thead>
                        <tbody className="text-muted-foreground">
                            <ErrorRow code={401} error="Missing or invalid Authorization header" cause="Falta el header Authorization: Bearer ..." />
                            <ErrorRow code={401} error="Invalid or inactive API key" cause="La key no existe o fue revocada" />
                            <ErrorRow code={403} error="Account is suspended" cause="La cuenta está suspendida" />
                            <ErrorRow code={403} error="Insufficient permissions" cause="La key no tiene el scope necesario" />
                            <ErrorRow code={400} error="WINDOW_EXPIRED" cause="Ventana 24h expirada, usar template" />
                            <ErrorRow code={429} error="Rate limit exceeded" cause="Demasiadas peticiones por minuto" />
                            <ErrorRow code={502} error="WhatsApp API error" cause="Error de la API de Meta" />
                        </tbody>
                    </table>
                </div>
            </Section>

            {/* cURL examples */}
            <Section id="examples" title="Ejemplos con cURL">
                <Label>Validar conexión</Label>
                <CodeBlock code={`curl -s -H "Authorization: Bearer vk_live_abc123..." \\
  ${baseUrl}/api/v1/auth`} />

                <Label>Listar plantillas</Label>
                <CodeBlock code={`curl -s -H "Authorization: Bearer vk_live_abc123..." \\
  ${baseUrl}/api/v1/templates`} />

                <Label>Enviar plantilla</Label>
                <CodeBlock code={`curl -s -X POST \\
  -H "Authorization: Bearer vk_live_abc123..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "573001234567",
    "type": "template",
    "template": {
      "name": "hello_world",
      "language": "es",
      "components": []
    }
  }' \\
  ${baseUrl}/api/v1/messages`} />

                <Label>Consultar estado</Label>
                <CodeBlock code={`curl -s -H "Authorization: Bearer vk_live_abc123..." \\
  "${baseUrl}/api/v1/messages/status?messageId=wamid.HBgL..."`} />

                <Label>Registrar webhook</Label>
                <CodeBlock code={`curl -s -X POST \\
  -H "Authorization: Bearer vk_live_abc123..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://mi-erp.com/varylo-webhook",
    "events": ["message.received", "message.status"]
  }' \\
  ${baseUrl}/api/v1/webhooks`} />
            </Section>
        </div>
    );
}

// --- Helper components ---

function Section({ id, title, sub, children }: { id: string; title: string; sub?: boolean; children: React.ReactNode }) {
    return (
        <section id={id} className={`${sub ? 'mb-8' : 'mb-10'} ${sub ? '' : 'border-t pt-8 first:border-t-0 first:pt-0'}`}>
            <h2 className={`${sub ? 'text-base' : 'text-lg'} font-semibold text-foreground mb-4`}>{title}</h2>
            {children}
        </section>
    );
}

function EndpointRow({ method, path, desc }: { method: string; path: string; desc: string }) {
    const isPost = method === 'POST';
    const isDelete = method === 'DELETE';
    return (
        <div className="flex items-center gap-3 py-1.5">
            <Badge
                variant="outline"
                className={`text-xs w-16 justify-center shrink-0 ${
                    isPost ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800'
                    : isDelete ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800'
                    : ''
                }`}
            >
                {method}
            </Badge>
            <code className="text-xs font-mono text-foreground">{path}</code>
            <span className="text-xs text-muted-foreground ml-auto hidden sm:block">{desc}</span>
        </div>
    );
}

function EndpointHeader({ method, path }: { method: string; path: string }) {
    const isPost = method === 'POST';
    return (
        <div className="flex items-center gap-2 mb-3 p-2 bg-muted/50 rounded-md">
            <Badge
                variant="outline"
                className={`text-xs ${isPost ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800' : ''}`}
            >
                {method}
            </Badge>
            <code className="text-sm font-mono">{path}</code>
        </div>
    );
}

function Label({ children }: { children: React.ReactNode }) {
    return <p className="text-xs font-semibold text-foreground mt-4 mb-2 uppercase tracking-wide">{children}</p>;
}

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
    return (
        <div className="relative group">
            <pre className="bg-gray-950 dark:bg-gray-900 text-gray-100 rounded-md p-4 text-xs font-mono overflow-x-auto">
                <code>{code}</code>
            </pre>
            <CopyButton text={code} />
        </div>
    );
}

function ParamTable({ params }: { params: { name: string; type: string; def?: string; desc: string }[] }) {
    return (
        <div className="overflow-x-auto mb-2">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b">
                        <th className="text-left py-1.5 pr-3 font-medium text-xs">Nombre</th>
                        <th className="text-left py-1.5 pr-3 font-medium text-xs">Tipo</th>
                        {params.some(p => p.def) && <th className="text-left py-1.5 pr-3 font-medium text-xs">Default</th>}
                        <th className="text-left py-1.5 font-medium text-xs">Descripción</th>
                    </tr>
                </thead>
                <tbody className="text-muted-foreground text-xs">
                    {params.map((p) => (
                        <tr key={p.name} className="border-b last:border-0">
                            <td className="py-1.5 pr-3"><code className="bg-muted px-1 py-0.5 rounded">{p.name}</code></td>
                            <td className="py-1.5 pr-3">{p.type}</td>
                            {params.some(pp => pp.def) && <td className="py-1.5 pr-3">{p.def || '—'}</td>}
                            <td className="py-1.5">{p.desc}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function ErrorRow({ code, error, cause }: { code: number; error: string; cause: string }) {
    return (
        <tr className="border-b last:border-0">
            <td className="py-1.5 pr-3"><Badge variant="outline" className="text-xs">{code}</Badge></td>
            <td className="py-1.5 pr-3 font-mono text-xs">{error}</td>
            <td className="py-1.5 text-xs">{cause}</td>
        </tr>
    );
}
