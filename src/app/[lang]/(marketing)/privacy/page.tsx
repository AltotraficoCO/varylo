import { Locale } from '@/lib/dictionary';
import { Shield, Database, Eye, Share2, Lock, Clock, UserCheck, Globe, Mail, FileText } from 'lucide-react';

function SectionCard({ number, icon: Icon, children }: { number: number; icon: any; children: React.ReactNode }) {
    return (
        <div className="group relative rounded-2xl border border-gray-200 bg-white p-8 md:p-10 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300">
            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-4 mb-6">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition-colors">
                    <Icon className="h-5 w-5 text-emerald-600" />
                </div>
                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                    {String(number).padStart(2, '0')}
                </span>
            </div>
            {children}
        </div>
    );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return <h2 className="text-xl font-bold text-gray-900 mb-4">{children}</h2>;
}

function P({ children }: { children: React.ReactNode }) {
    return <p className="text-gray-600 text-[15px] leading-relaxed mb-3 last:mb-0">{children}</p>;
}

export default async function PrivacyPage({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params;
    const isEs = lang === 'es';

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
            <div className="max-w-4xl mx-auto px-6 py-20 md:py-28">
                {/* Header */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-6 border border-emerald-200">
                        <Shield className="h-3.5 w-3.5" />
                        {isEs ? 'Documento Legal' : 'Legal Document'}
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                        {isEs ? 'Política de Privacidad' : 'Privacy Policy'}
                    </h1>
                    <p className="text-gray-500 text-sm">
                        {isEs ? 'Última actualización: 31 de marzo de 2026' : 'Last updated: March 31, 2026'}
                    </p>
                </div>

                <div className="space-y-6">
                    <SectionCard number={1} icon={Eye}>
                        <SectionTitle>{isEs ? 'Introducción' : 'Introduction'}</SectionTitle>
                        <P>
                            {isEs
                                ? 'Varylo es una plataforma desarrollada y operada por Altotrafico SAS, con domicilio en Colombia. Esta Política de Privacidad describe cómo recopilamos, usamos, almacenamos y protegemos la información personal de nuestros usuarios y los contactos que gestionan a través de nuestra plataforma.'
                                : 'Varylo is a platform developed and operated by Altotrafico SAS, based in Colombia. This Privacy Policy describes how we collect, use, store, and protect the personal information of our users and the contacts they manage through our platform.'}
                        </P>
                        <P>
                            {isEs
                                ? 'Al utilizar Varylo, usted acepta las prácticas descritas en esta política. Si no está de acuerdo, por favor no utilice nuestros servicios.'
                                : 'By using Varylo, you agree to the practices described in this policy. If you disagree, please do not use our services.'}
                        </P>
                    </SectionCard>

                    <SectionCard number={2} icon={Database}>
                        <SectionTitle>{isEs ? 'Información que Recopilamos' : 'Information We Collect'}</SectionTitle>
                        <P>
                            {isEs
                                ? 'Recopilamos los siguientes tipos de información:'
                                : 'We collect the following types of information:'}
                        </P>
                        <P>
                            {isEs
                                ? '- Información de cuenta: nombre, correo electrónico, contraseña (encriptada), nombre de la empresa.'
                                : '- Account information: name, email, password (encrypted), company name.'}
                        </P>
                        <P>
                            {isEs
                                ? '- Datos de conversación: mensajes recibidos y enviados a través de WhatsApp, Instagram y Web Chat, incluyendo texto, imágenes, documentos y audio.'
                                : '- Conversation data: messages received and sent through WhatsApp, Instagram and Web Chat, including text, images, documents and audio.'}
                        </P>
                        <P>
                            {isEs
                                ? '- Datos de contactos: nombre, número de teléfono, correo electrónico y otros datos que los usuarios capturen de sus clientes.'
                                : '- Contact data: name, phone number, email and other data that users capture from their customers.'}
                        </P>
                        <P>
                            {isEs
                                ? '- Tokens de acceso: credenciales de plataformas de terceros (Meta, Google) necesarias para la integración de canales.'
                                : '- Access tokens: third-party platform credentials (Meta, Google) necessary for channel integration.'}
                        </P>
                    </SectionCard>

                    <SectionCard number={3} icon={FileText}>
                        <SectionTitle>{isEs ? 'Uso de la Información' : 'Use of Information'}</SectionTitle>
                        <P>
                            {isEs
                                ? 'Utilizamos la información recopilada para:'
                                : 'We use the collected information to:'}
                        </P>
                        <P>
                            {isEs
                                ? '- Proveer y mantener el servicio de mensajería omnicanal.'
                                : '- Provide and maintain the omnichannel messaging service.'}
                        </P>
                        <P>
                            {isEs
                                ? '- Procesar y entregar mensajes entre los usuarios y sus clientes a través de WhatsApp, Instagram y Web Chat.'
                                : '- Process and deliver messages between users and their customers through WhatsApp, Instagram and Web Chat.'}
                        </P>
                        <P>
                            {isEs
                                ? '- Ejecutar automatizaciones configuradas por el usuario (chatbots, agentes de IA).'
                                : '- Execute user-configured automations (chatbots, AI agents).'}
                        </P>
                        <P>
                            {isEs
                                ? '- Generar análisis e insights sobre las conversaciones mediante inteligencia artificial.'
                                : '- Generate analytics and insights about conversations using artificial intelligence.'}
                        </P>
                        <P>
                            {isEs
                                ? '- Gestionar la facturación y suscripciones.'
                                : '- Manage billing and subscriptions.'}
                        </P>
                    </SectionCard>

                    <SectionCard number={4} icon={Share2}>
                        <SectionTitle>{isEs ? 'Compartir Información con Terceros' : 'Sharing Information with Third Parties'}</SectionTitle>
                        <P>
                            {isEs
                                ? 'Compartimos información con los siguientes terceros únicamente para proveer el servicio:'
                                : 'We share information with the following third parties solely to provide the service:'}
                        </P>
                        <P>
                            {isEs
                                ? '- Meta Platforms (Facebook/Instagram/WhatsApp): para enviar y recibir mensajes a través de sus APIs.'
                                : '- Meta Platforms (Facebook/Instagram/WhatsApp): to send and receive messages through their APIs.'}
                        </P>
                        <P>
                            {isEs
                                ? '- OpenAI: para procesar conversaciones con agentes de inteligencia artificial, cuando el usuario lo configure.'
                                : '- OpenAI: to process conversations with AI agents, when configured by the user.'}
                        </P>
                        <P>
                            {isEs
                                ? '- Supabase: para almacenamiento de base de datos y archivos multimedia.'
                                : '- Supabase: for database and media file storage.'}
                        </P>
                        <P>
                            {isEs
                                ? '- Wompi: para procesamiento de pagos (no almacenamos datos de tarjetas).'
                                : '- Wompi: for payment processing (we do not store card data).'}
                        </P>
                        <P>
                            {isEs
                                ? 'No vendemos ni compartimos información personal con terceros para fines publicitarios.'
                                : 'We do not sell or share personal information with third parties for advertising purposes.'}
                        </P>
                    </SectionCard>

                    <SectionCard number={5} icon={Lock}>
                        <SectionTitle>{isEs ? 'Seguridad de los Datos' : 'Data Security'}</SectionTitle>
                        <P>
                            {isEs
                                ? 'Implementamos medidas de seguridad para proteger su información:'
                                : 'We implement security measures to protect your information:'}
                        </P>
                        <P>
                            {isEs
                                ? '- Contraseñas almacenadas con hash bcrypt.'
                                : '- Passwords stored with bcrypt hashing.'}
                        </P>
                        <P>
                            {isEs
                                ? '- Comunicaciones cifradas mediante HTTPS/TLS.'
                                : '- Communications encrypted via HTTPS/TLS.'}
                        </P>
                        <P>
                            {isEs
                                ? '- Verificación de firmas en webhooks de plataformas externas.'
                                : '- Signature verification on external platform webhooks.'}
                        </P>
                        <P>
                            {isEs
                                ? '- Acceso a datos restringido por roles (administrador, agente) y por empresa (multi-tenant).'
                                : '- Data access restricted by roles (admin, agent) and by company (multi-tenant).'}
                        </P>
                    </SectionCard>

                    <SectionCard number={6} icon={Clock}>
                        <SectionTitle>{isEs ? 'Retención de Datos' : 'Data Retention'}</SectionTitle>
                        <P>
                            {isEs
                                ? 'Conservamos los datos mientras la cuenta del usuario esté activa. Los documentos capturados en conversaciones se eliminan automáticamente después de 73 horas. Los usuarios pueden solicitar la eliminación de su cuenta y datos asociados en cualquier momento.'
                                : 'We retain data as long as the user account is active. Documents captured in conversations are automatically deleted after 73 hours. Users can request deletion of their account and associated data at any time.'}
                        </P>
                    </SectionCard>

                    <SectionCard number={7} icon={UserCheck}>
                        <SectionTitle>{isEs ? 'Derechos del Usuario' : 'User Rights'}</SectionTitle>
                        <P>
                            {isEs
                                ? 'De acuerdo con la Ley 1581 de 2012 de Colombia y el RGPD cuando aplique, usted tiene derecho a:'
                                : 'In accordance with Colombian Law 1581 of 2012 and GDPR where applicable, you have the right to:'}
                        </P>
                        <P>
                            {isEs
                                ? '- Acceder a sus datos personales almacenados en la plataforma.'
                                : '- Access your personal data stored on the platform.'}
                        </P>
                        <P>
                            {isEs
                                ? '- Rectificar datos inexactos o incompletos.'
                                : '- Rectify inaccurate or incomplete data.'}
                        </P>
                        <P>
                            {isEs
                                ? '- Solicitar la eliminación de sus datos personales.'
                                : '- Request deletion of your personal data.'}
                        </P>
                        <P>
                            {isEs
                                ? '- Revocar el consentimiento para el tratamiento de datos.'
                                : '- Revoke consent for data processing.'}
                        </P>
                    </SectionCard>

                    <SectionCard number={8} icon={Globe}>
                        <SectionTitle>{isEs ? 'Integraciones con Plataformas de Terceros' : 'Third-Party Platform Integrations'}</SectionTitle>
                        <P>
                            {isEs
                                ? 'Varylo se integra con Meta (WhatsApp e Instagram) mediante sus APIs oficiales. Al conectar su cuenta de WhatsApp o Instagram a Varylo, usted autoriza a nuestra plataforma a:'
                                : 'Varylo integrates with Meta (WhatsApp and Instagram) through their official APIs. By connecting your WhatsApp or Instagram account to Varylo, you authorize our platform to:'}
                        </P>
                        <P>
                            {isEs
                                ? '- Recibir mensajes entrantes de sus clientes.'
                                : '- Receive incoming messages from your customers.'}
                        </P>
                        <P>
                            {isEs
                                ? '- Enviar mensajes en su nombre.'
                                : '- Send messages on your behalf.'}
                        </P>
                        <P>
                            {isEs
                                ? '- Acceder a información básica de su cuenta y página.'
                                : '- Access basic information from your account and page.'}
                        </P>
                        <P>
                            {isEs
                                ? 'Puede revocar el acceso en cualquier momento desconectando el canal desde la configuración de Varylo o desde la configuración de su cuenta de Meta.'
                                : 'You can revoke access at any time by disconnecting the channel from Varylo settings or from your Meta account settings.'}
                        </P>
                    </SectionCard>

                    <SectionCard number={9} icon={Mail}>
                        <SectionTitle>{isEs ? 'Contacto' : 'Contact'}</SectionTitle>
                        <P>
                            {isEs
                                ? 'Si tiene preguntas sobre esta Política de Privacidad o desea ejercer sus derechos, puede contactarnos:'
                                : 'If you have questions about this Privacy Policy or wish to exercise your rights, you can contact us:'}
                        </P>
                        <P>
                            {isEs
                                ? '- Empresa: Altotrafico SAS'
                                : '- Company: Altotrafico SAS'}
                        </P>
                        <P>
                            {isEs
                                ? '- Correo: soporte@varylo.app'
                                : '- Email: soporte@varylo.app'}
                        </P>
                        <P>
                            {isEs
                                ? '- País: Colombia'
                                : '- Country: Colombia'}
                        </P>
                    </SectionCard>
                </div>
            </div>
        </div>
    );
}
