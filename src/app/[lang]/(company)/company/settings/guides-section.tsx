'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Copy, ChevronDown, ChevronRight, ExternalLink, BookOpen, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDictionary } from '@/lib/i18n-context';

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleCopy}>
            {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
    );
}

function CodeBlock({ children }: { children: string }) {
    return (
        <div className="flex items-center gap-2 bg-gray-900 text-green-400 rounded-md px-3 py-2 font-mono text-sm overflow-x-auto">
            <code className="flex-1 break-all">{children}</code>
            <CopyButton text={children} />
        </div>
    );
}

interface StepProps {
    number: number;
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

function Step({ number, title, children, defaultOpen = false }: StepProps) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className="border rounded-lg overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
            >
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                    {number}
                </div>
                <span className="font-medium text-sm flex-1">{title}</span>
                {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </button>
            {open && (
                <div className="px-4 pb-4 pt-0 ml-11 space-y-3 text-sm text-muted-foreground leading-relaxed">
                    {children}
                </div>
            )}
        </div>
    );
}

export function GuidesSection() {
    const dict = useDictionary();
    const t = dict.settingsUI?.guidesSection || {};

    const webhookUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/api/webhook/whatsapp`
        : 'https://tu-dominio.com/api/webhook/whatsapp';

    return (
        <div className="space-y-6">
            {/* WhatsApp Integration Guide */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                            <MessageSquare className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">{t.integrationGuide || 'Integrar WhatsApp Business'}</CardTitle>
                            <CardDescription>
                                {t.integrationGuideDesc || 'Guía paso a paso para conectar tu número de WhatsApp Business con Varylo.'}
                            </CardDescription>
                        </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">~15 minutos</Badge>
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">WhatsApp Cloud API</Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    {/* Prerequisites */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                        <p className="font-medium mb-1">Requisitos previos:</p>
                        <ul className="list-disc ml-4 space-y-1 text-xs">
                            <li>Una cuenta de Facebook personal</li>
                            <li>Un portafolio de negocios (Business Portfolio) en Meta</li>
                            <li>Un número de teléfono que NO esté registrado en WhatsApp personal</li>
                        </ul>
                    </div>

                    <Step number={1} title="Crear una App en Meta for Developers" defaultOpen>
                        <p>
                            Ve a <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                                Meta for Developers <ExternalLink className="h-3 w-3" />
                            </a> e inicia sesión con tu cuenta de Facebook.
                        </p>
                        <ol className="list-decimal ml-4 space-y-2">
                            <li>Haz clic en <strong>&quot;Crear app&quot;</strong></li>
                            <li>Selecciona <strong>&quot;Otro&quot;</strong> como caso de uso</li>
                            <li>Selecciona el tipo <strong>&quot;Business&quot;</strong></li>
                            <li>Escribe un nombre para tu app (ej. &quot;Varylo WhatsApp&quot;)</li>
                            <li>Selecciona tu portafolio de negocios (Business Portfolio)</li>
                            <li>Haz clic en <strong>&quot;Crear app&quot;</strong></li>
                        </ol>
                    </Step>

                    <Step number={2} title="Agregar WhatsApp a la App">
                        <p>Una vez creada la app:</p>
                        <ol className="list-decimal ml-4 space-y-2">
                            <li>En el panel de la app, busca <strong>&quot;WhatsApp&quot;</strong> en la lista de productos</li>
                            <li>Haz clic en <strong>&quot;Configurar&quot;</strong></li>
                            <li>Se abrirá el panel de WhatsApp con un número de prueba gratuito</li>
                        </ol>
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-2.5 text-xs text-blue-700 mt-2">
                            <strong>Nota:</strong> Meta te da un número de prueba para empezar. Para producción, deberás agregar tu propio número verificado.
                        </div>
                    </Step>

                    <Step number={3} title="Obtener el Phone Number ID">
                        <p>En el panel de WhatsApp de tu app:</p>
                        <ol className="list-decimal ml-4 space-y-2">
                            <li>Ve a <strong>WhatsApp → Configuración de la API</strong> (API Setup)</li>
                            <li>Verás una sección <strong>&quot;De&quot;</strong> (From) con tu número de teléfono</li>
                            <li>Debajo del número aparece el <strong>Phone Number ID</strong> — cópialo</li>
                            <li>También copia el <strong>WhatsApp Business Account ID</strong> (WABA ID) que aparece en la misma página</li>
                        </ol>
                        <div className="bg-muted rounded-md p-2.5 text-xs mt-2">
                            <strong>Ejemplo de Phone Number ID:</strong> <code className="bg-gray-200 px-1 rounded">104567890123456</code>
                        </div>
                    </Step>

                    <Step number={4} title="Generar un Token de Acceso Permanente">
                        <p>
                            El token temporal de la API de WhatsApp expira en 24 horas. Para producción necesitas un token permanente:
                        </p>
                        <ol className="list-decimal ml-4 space-y-2">
                            <li>
                                Ve a <a href="https://business.facebook.com/settings/system-users" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                                    Meta Business Settings → Usuarios del sistema <ExternalLink className="h-3 w-3" />
                                </a>
                            </li>
                            <li>Haz clic en <strong>&quot;Agregar&quot;</strong> para crear un nuevo usuario del sistema</li>
                            <li>Nombre: <strong>&quot;Varylo API&quot;</strong> (o el que prefieras)</li>
                            <li>Rol: <strong>&quot;Administrador&quot;</strong></li>
                            <li>Haz clic en <strong>&quot;Crear usuario del sistema&quot;</strong></li>
                        </ol>

                        <p className="mt-3 font-medium text-foreground">Asignar la App al usuario del sistema:</p>
                        <ol className="list-decimal ml-4 space-y-2">
                            <li>Selecciona el usuario del sistema que creaste</li>
                            <li>Haz clic en <strong>&quot;Asignar activos&quot;</strong></li>
                            <li>Selecciona <strong>&quot;Apps&quot;</strong> en el menú lateral</li>
                            <li>Busca tu app y activa <strong>&quot;Control total&quot;</strong></li>
                            <li>Guarda los cambios</li>
                        </ol>

                        <p className="mt-3 font-medium text-foreground">Generar el token:</p>
                        <ol className="list-decimal ml-4 space-y-2">
                            <li>En el mismo usuario del sistema, haz clic en <strong>&quot;Generar token&quot;</strong></li>
                            <li>Selecciona tu app</li>
                            <li>Marca los permisos: <strong>whatsapp_business_management</strong> y <strong>whatsapp_business_messaging</strong></li>
                            <li>Haz clic en <strong>&quot;Generar token&quot;</strong></li>
                            <li className="text-amber-700 font-medium">Copia y guarda el token inmediatamente — no se mostrará de nuevo</li>
                        </ol>
                    </Step>

                    <Step number={5} title="Obtener el App Secret">
                        <ol className="list-decimal ml-4 space-y-2">
                            <li>
                                Ve a <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                                    Meta for Developers → Tu App <ExternalLink className="h-3 w-3" />
                                </a>
                            </li>
                            <li>En el menú lateral, ve a <strong>Configuración → Básica</strong> (Settings → Basic)</li>
                            <li>Haz clic en <strong>&quot;Mostrar&quot;</strong> junto a <strong>App Secret</strong></li>
                            <li>Copia el valor</li>
                        </ol>
                        <div className="bg-red-50 border border-red-200 rounded-md p-2.5 text-xs text-red-700 mt-2">
                            <strong>Importante:</strong> Nunca compartas tu App Secret. Se usa para verificar que los mensajes que recibe Varylo realmente vienen de Meta.
                        </div>
                    </Step>

                    <Step number={6} title="Configurar el Webhook en Meta">
                        <p>Ahora necesitas decirle a Meta dónde enviar los mensajes entrantes:</p>
                        <ol className="list-decimal ml-4 space-y-2">
                            <li>En tu App de Meta, ve a <strong>WhatsApp → Configuración</strong> (Configuration)</li>
                            <li>En la sección <strong>&quot;Webhook&quot;</strong>, haz clic en <strong>&quot;Editar&quot;</strong></li>
                            <li>
                                Ingresa la <strong>URL del Webhook</strong>:
                                <CodeBlock>{webhookUrl}</CodeBlock>
                            </li>
                            <li>
                                Ingresa un <strong>Verify Token</strong> (inventa uno, ej. <code className="bg-gray-100 px-1 rounded text-xs">mi_token_secreto_varylo</code>). Deberás usar el mismo valor en Varylo.
                            </li>
                            <li>Haz clic en <strong>&quot;Verificar y guardar&quot;</strong></li>
                        </ol>

                        <p className="mt-3 font-medium text-foreground">Suscribirse a eventos:</p>
                        <ol className="list-decimal ml-4 space-y-2">
                            <li>En la misma sección de Webhook, verás campos de suscripción</li>
                            <li>Activa (suscríbete) el campo <strong>&quot;messages&quot;</strong></li>
                        </ol>
                    </Step>

                    <Step number={7} title="Ingresar los datos en Varylo">
                        <p>Ya tienes todo lo necesario. Ahora ve a la pestaña <strong>&quot;Canales&quot;</strong> de esta misma configuración e ingresa:</p>
                        <div className="bg-muted rounded-lg p-3 space-y-2 text-xs">
                            <div className="flex justify-between items-center">
                                <span className="font-medium text-foreground">Phone Number ID</span>
                                <span className="text-muted-foreground">El ID del paso 3</span>
                            </div>
                            <div className="border-t" />
                            <div className="flex justify-between items-center">
                                <span className="font-medium text-foreground">Permanent Access Token</span>
                                <span className="text-muted-foreground">El token del paso 4</span>
                            </div>
                            <div className="border-t" />
                            <div className="flex justify-between items-center">
                                <span className="font-medium text-foreground">App Secret</span>
                                <span className="text-muted-foreground">El secret del paso 5</span>
                            </div>
                            <div className="border-t" />
                            <div className="flex justify-between items-center">
                                <span className="font-medium text-foreground">Verify Token</span>
                                <span className="text-muted-foreground">El mismo que pusiste en el paso 6</span>
                            </div>
                            <div className="border-t" />
                            <div className="flex justify-between items-center">
                                <span className="font-medium text-foreground">WABA ID</span>
                                <span className="text-muted-foreground">El ID del paso 3 (opcional, para plantillas)</span>
                            </div>
                        </div>
                        <p className="mt-2">
                            Haz clic en <strong>&quot;Conectar WhatsApp&quot;</strong> y luego <strong>&quot;Probar Conexión&quot;</strong> para verificar que todo funciona.
                        </p>
                    </Step>

                    <Step number={8} title="Verificación final">
                        <p>Para confirmar que la integración funciona correctamente:</p>
                        <ol className="list-decimal ml-4 space-y-2">
                            <li>Envía un mensaje de WhatsApp al número que configuraste</li>
                            <li>Deberías ver el mensaje aparecer en la sección de <strong>Conversaciones</strong> de Varylo</li>
                            <li>Si tienes un agente de IA activo, debería responder automáticamente</li>
                        </ol>
                        <div className="bg-green-50 border border-green-200 rounded-md p-2.5 text-xs text-green-700 mt-2">
                            <strong>Listo!</strong> Tu WhatsApp Business está integrado con Varylo. Los mensajes entrantes se recibirán automáticamente y podrás responder desde la plataforma.
                        </div>
                    </Step>
                </CardContent>
            </Card>

            {/* Placeholder for future guides */}
            <Card className="border-dashed opacity-60">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                            <BookOpen className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">{t.moreGuides || 'Más guías próximamente'}</CardTitle>
                            <CardDescription>
                                {t.moreGuidesDesc || 'Guías para integrar Instagram, configurar agentes de IA, chatbots y más.'}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
            </Card>
        </div>
    );
}
