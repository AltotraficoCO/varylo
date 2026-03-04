import { Locale } from '@/lib/dictionary';
import { FileText, Scale, ShieldCheck, CreditCard, Users, Ban, Brain, Lock, AlertTriangle, Gavel, Mail } from 'lucide-react';

const sections = [
    { icon: ShieldCheck, color: 'emerald' },
    { icon: FileText, color: 'blue' },
    { icon: Users, color: 'violet' },
    { icon: ShieldCheck, color: 'emerald' },
    { icon: CreditCard, color: 'amber' },
    { icon: CreditCard, color: 'amber' },
    { icon: Users, color: 'violet' },
    { icon: Ban, color: 'red' },
    { icon: Lock, color: 'blue' },
    { icon: Brain, color: 'violet' },
    { icon: Lock, color: 'blue' },
    { icon: AlertTriangle, color: 'amber' },
    { icon: Scale, color: 'red' },
    { icon: ShieldCheck, color: 'emerald' },
    { icon: Gavel, color: 'red' },
    { icon: AlertTriangle, color: 'amber' },
    { icon: Lock, color: 'blue' },
    { icon: FileText, color: 'violet' },
    { icon: Ban, color: 'red' },
    { icon: Scale, color: 'emerald' },
] as const;

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

function UL({ children }: { children: React.ReactNode }) {
    return <ul className="space-y-2 my-4">{children}</ul>;
}

function LI({ children }: { children: React.ReactNode }) {
    return (
        <li className="flex items-start gap-2.5 text-[15px] text-gray-600">
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>{children}</span>
        </li>
    );
}

function DefItem({ term, children }: { term: string; children: React.ReactNode }) {
    return (
        <li className="flex items-start gap-2.5 text-[15px] text-gray-600">
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span><strong className="text-gray-900">{term}</strong> — {children}</span>
        </li>
    );
}

export default async function TermsPage({ params }: { params: Promise<{ lang: Locale }> }) {
    const { lang } = await params;
    const isEs = lang === 'es';

    return (
        <div className="flex flex-col">
            {/* ═══════════ HERO ═══════════ */}
            <section className="relative py-24 md:py-32 bg-white overflow-hidden">
                <div className="absolute top-[10%] right-[5%] w-[500px] h-[500px] rounded-full bg-emerald-100/50 blur-[120px]" />
                <div className="absolute bottom-[10%] left-[10%] w-[400px] h-[400px] rounded-full bg-emerald-50/60 blur-[100px]" />
                <div className="relative container mx-auto px-4 text-center max-w-3xl">
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-5 py-2 text-sm text-emerald-700 font-semibold mb-8">
                        <Scale className="h-3.5 w-3.5" />
                        {isEs ? 'Documento legal' : 'Legal document'}
                    </div>
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[0.95] mb-6 text-gray-900">
                        {isEs ? 'Términos y Condiciones' : 'Terms and Conditions'}
                    </h1>
                    <p className="text-lg text-gray-500 max-w-xl mx-auto leading-relaxed mb-4">
                        {isEs
                            ? 'Estos términos regulan el uso de la plataforma Varylo, operada por ALTO TRÁFICO S.A.S.'
                            : 'These terms govern the use of the Varylo platform, operated by ALTO TRÁFICO S.A.S.'}
                    </p>
                    <p className="text-sm text-gray-400">
                        {isEs ? 'Última actualización: 2026' : 'Last updated: 2026'}
                    </p>
                </div>
            </section>

            {/* ═══════════ SECTIONS ═══════════ */}
            <section className="py-16 md:py-24 bg-gray-50">
                <div className="container mx-auto px-4 max-w-3xl space-y-6">

                    {/* 1 */}
                    <SectionCard number={1} icon={sections[0].icon}>
                        <SectionTitle>{isEs ? 'Aceptación de los Términos y Elegibilidad' : 'Acceptance of Terms and Eligibility'}</SectionTitle>
                        <P>{isEs
                            ? 'Estos Términos y Condiciones ("Términos") constituyen un acuerdo legalmente vinculante entre usted ("Usuario", "usted") y ALTO TRÁFICO S.A.S., sociedad comercial constituida bajo las leyes de la República de Colombia, que opera la plataforma bajo la marca Varylo ("Varylo", "nosotros", "la Empresa").'
                            : 'These Terms and Conditions ("Terms") constitute a legally binding agreement between you ("User", "you") and ALTO TRÁFICO S.A.S., a commercial company incorporated under the laws of the Republic of Colombia, operating the platform under the brand Varylo ("Varylo", "we", "the Company").'}</P>
                        <P>{isEs
                            ? 'Al registrarse, acceder o utilizar la plataforma Varylo (el "Servicio"), usted acepta quedar obligado por estos Términos en su totalidad.'
                            : 'By registering, accessing, or using the Varylo platform (the "Service"), you agree to be bound by these Terms in their entirety.'}</P>
                        <P>{isEs ? 'El Servicio está destinado exclusivamente a:' : 'The Service is intended exclusively for:'}</P>
                        <UL>
                            <LI>{isEs ? 'Personas mayores de dieciocho (18) años' : 'Persons over eighteen (18) years of age'}</LI>
                            <LI>{isEs ? 'Empresas o entidades legalmente constituidas' : 'Legally constituted companies or entities'}</LI>
                        </UL>
                        <P>{isEs ? 'Al utilizar el Servicio usted declara que:' : 'By using the Service you declare that:'}</P>
                        <UL>
                            <LI>{isEs ? 'Tiene al menos dieciocho (18) años de edad' : 'You are at least eighteen (18) years of age'}</LI>
                            <LI>{isEs ? 'Tiene la capacidad legal para celebrar contratos vinculantes' : 'You have the legal capacity to enter into binding contracts'}</LI>
                            <LI>{isEs ? 'Si actúa en nombre de una empresa, tiene la autoridad para obligar a dicha entidad' : 'If acting on behalf of a company, you have the authority to bind said entity'}</LI>
                            <LI>{isEs ? 'Ha leído, comprendido y acepta estos Términos y la Política de Privacidad' : 'You have read, understood, and accept these Terms and the Privacy Policy'}</LI>
                        </UL>
                        <P>{isEs
                            ? 'Si no está de acuerdo con alguna parte de estos Términos, no debe utilizar el Servicio. El uso continuado del Servicio después de cualquier modificación constituye aceptación de dichos cambios.'
                            : 'If you do not agree with any part of these Terms, you should not use the Service. Continued use of the Service after any modification constitutes acceptance of such changes.'}</P>
                    </SectionCard>

                    {/* 2 */}
                    <SectionCard number={2} icon={sections[1].icon}>
                        <SectionTitle>{isEs ? 'Definiciones' : 'Definitions'}</SectionTitle>
                        <P>{isEs ? 'Para efectos de estos Términos:' : 'For the purposes of these Terms:'}</P>
                        <UL>
                            <DefItem term={isEs ? 'Servicio' : 'Service'}>{isEs ? 'La plataforma SaaS Varylo, incluyendo software, APIs, sitio web, aplicaciones, integraciones y documentación.' : 'The Varylo SaaS platform, including software, APIs, website, applications, integrations, and documentation.'}</DefItem>
                            <DefItem term={isEs ? 'Usuario' : 'User'}>{isEs ? 'Persona natural o jurídica que utiliza el Servicio.' : 'Natural or legal person who uses the Service.'}</DefItem>
                            <DefItem term={isEs ? 'Contenido del Usuario' : 'User Content'}>{isEs ? 'Datos, mensajes, contactos, archivos, configuraciones o cualquier información ingresada en la plataforma.' : 'Data, messages, contacts, files, configurations, or any information entered into the platform.'}</DefItem>
                            <DefItem term={isEs ? 'Datos de Terceros' : 'Third-Party Data'}>{isEs ? 'Datos provenientes de servicios externos como Meta (WhatsApp Business API), proveedores de IA, pasarelas de pago u otras integraciones.' : 'Data from external services such as Meta (WhatsApp Business API), AI providers, payment gateways, or other integrations.'}</DefItem>
                            <DefItem term={isEs ? 'Agencia' : 'Agency'}>{isEs ? 'Usuario que administra múltiples cuentas o clientes dentro de la plataforma.' : 'User who manages multiple accounts or clients within the platform.'}</DefItem>
                            <DefItem term={isEs ? 'Cuenta Cliente' : 'Client Account'}>{isEs ? 'Cuenta individual administrada por una agencia dentro de la plataforma.' : 'Individual account managed by an agency within the platform.'}</DefItem>
                            <DefItem term={isEs ? 'IA (Inteligencia Artificial)' : 'AI (Artificial Intelligence)'}>{isEs ? 'Funcionalidades automatizadas basadas en modelos de inteligencia artificial.' : 'Automated functionalities based on artificial intelligence models.'}</DefItem>
                            <DefItem term={isEs ? 'Periodo de Prueba' : 'Trial Period'}>{isEs ? 'Periodo gratuito inicial otorgado al registrarse, si aplica.' : 'Initial free period granted upon registration, if applicable.'}</DefItem>
                        </UL>
                    </SectionCard>

                    {/* 3 */}
                    <SectionCard number={3} icon={sections[2].icon}>
                        <SectionTitle>{isEs ? 'Descripción del Servicio' : 'Service Description'}</SectionTitle>
                        <P>{isEs
                            ? 'Varylo es una plataforma de software como servicio (SaaS) que puede incluir funcionalidades como:'
                            : 'Varylo is a software as a service (SaaS) platform that may include features such as:'}</P>
                        <div className="grid grid-cols-2 gap-2 my-4">
                            {[
                                isEs ? 'CRM integrado' : 'Integrated CRM',
                                isEs ? 'Bandeja omnicanal' : 'Omnichannel inbox',
                                isEs ? 'WhatsApp Business API' : 'WhatsApp Business API',
                                isEs ? 'Automatización' : 'Automation',
                                isEs ? 'Agentes de IA' : 'AI agents',
                                isEs ? 'Embudos de ventas' : 'Sales funnels',
                                isEs ? 'Gestión de contactos' : 'Contact management',
                                isEs ? 'APIs externas' : 'External APIs',
                                isEs ? 'Panel de agencias' : 'Agency panel',
                                isEs ? 'Webhooks' : 'Webhooks',
                            ].map((f, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm text-gray-600 py-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                                    {f}
                                </div>
                            ))}
                        </div>
                        <P>{isEs ? 'El Servicio depende del funcionamiento de servicios de terceros incluyendo Meta (WhatsApp Business API), proveedores de IA, pasarelas de pago e infraestructura cloud.' : 'The Service depends on third-party services including Meta (WhatsApp Business API), AI providers, payment gateways, and cloud infrastructure.'}</P>
                        <P>{isEs ? 'No garantizamos disponibilidad ininterrumpida de dichos servicios externos.' : 'We do not guarantee uninterrupted availability of such external services.'}</P>
                    </SectionCard>

                    {/* 4 */}
                    <SectionCard number={4} icon={sections[3].icon}>
                        <SectionTitle>{isEs ? 'Registro y Cuenta' : 'Registration and Account'}</SectionTitle>
                        <P>{isEs ? 'Para utilizar el Servicio debe crear una cuenta proporcionando información veraz y actualizada. El Usuario es responsable de:' : 'To use the Service you must create an account providing truthful and up-to-date information. The User is responsible for:'}</P>
                        <UL>
                            <LI>{isEs ? 'Mantener la confidencialidad de sus credenciales' : 'Maintaining the confidentiality of their credentials'}</LI>
                            <LI>{isEs ? 'Todas las actividades realizadas bajo su cuenta' : 'All activities carried out under their account'}</LI>
                            <LI>{isEs ? 'Configurar correctamente sus integraciones externas' : 'Correctly configuring their external integrations'}</LI>
                            <LI>{isEs ? 'Proteger tokens, claves API y accesos' : 'Protecting tokens, API keys, and access credentials'}</LI>
                        </UL>
                        <P>{isEs ? 'Debe notificarnos inmediatamente si detecta uso no autorizado. Nos reservamos el derecho de suspender o cancelar cuentas que proporcionen información falsa, incumplan estos Términos, realicen actividades ilegales o representen riesgo para la plataforma.' : 'You must notify us immediately if you detect unauthorized use. We reserve the right to suspend or cancel accounts that provide false information, breach these Terms, engage in illegal activities, or pose a risk to the platform.'}</P>
                    </SectionCard>

                    {/* 5 */}
                    <SectionCard number={5} icon={sections[4].icon}>
                        <SectionTitle>{isEs ? 'Planes y Facturación' : 'Plans and Billing'}</SectionTitle>
                        <P>{isEs ? 'El acceso a ciertas funcionalidades puede requerir una suscripción de pago. Las condiciones generales incluyen:' : 'Access to certain features may require a paid subscription. General conditions include:'}</P>
                        <UL>
                            <LI>{isEs ? 'Facturación recurrente' : 'Recurring billing'}</LI>
                            <LI>{isEs ? 'Procesamiento mediante pasarelas de pago externas' : 'Processing through external payment gateways'}</LI>
                            <LI>{isEs ? 'Cobro automático por ciclo de facturación' : 'Automatic charges per billing cycle'}</LI>
                            <LI>{isEs ? 'Posible existencia de periodos de prueba' : 'Possible trial periods'}</LI>
                        </UL>
                        <P>{isEs ? 'Los precios pueden modificarse con previo aviso. Los impuestos aplicables son responsabilidad del Usuario. La falta de pago puede resultar en suspensión del Servicio.' : 'Prices may be modified with prior notice. Applicable taxes are the User\'s responsibility. Failure to pay may result in suspension of the Service.'}</P>
                    </SectionCard>

                    {/* 6 */}
                    <SectionCard number={6} icon={sections[5].icon}>
                        <SectionTitle>{isEs ? 'Cancelación y Reembolsos' : 'Cancellation and Refunds'}</SectionTitle>
                        <P>{isEs ? 'El Usuario puede cancelar su suscripción en cualquier momento desde el panel de configuración. Al cancelar:' : 'The User may cancel their subscription at any time from the settings panel. Upon cancellation:'}</P>
                        <UL>
                            <LI>{isEs ? 'La cuenta permanecerá activa hasta finalizar el periodo pagado' : 'The account will remain active until the end of the paid period'}</LI>
                            <LI>{isEs ? 'No se realizarán reembolsos proporcionales' : 'No prorated refunds will be issued'}</LI>
                            <LI>{isEs ? 'El acceso al Servicio finalizará al terminar el periodo activo' : 'Access to the Service will end when the active period expires'}</LI>
                        </UL>
                        <P>{isEs ? 'Los datos del Usuario podrán mantenerse temporalmente para permitir exportación.' : 'User data may be temporarily retained to allow export.'}</P>
                    </SectionCard>

                    {/* 7 */}
                    <SectionCard number={7} icon={sections[6].icon}>
                        <SectionTitle>{isEs ? 'Términos para Agencias' : 'Agency Terms'}</SectionTitle>
                        <P>{isEs ? 'Si el Usuario utiliza Varylo como agencia:' : 'If the User uses Varylo as an agency:'}</P>
                        <UL>
                            <LI>{isEs ? 'Es responsable de la gestión de sus clientes' : 'Is responsible for managing their clients'}</LI>
                            <LI>{isEs ? 'Debe contar con autorización para manejar cuentas de terceros' : 'Must have authorization to manage third-party accounts'}</LI>
                            <LI>{isEs ? 'Debe garantizar cumplimiento legal de sus clientes' : 'Must ensure legal compliance of their clients'}</LI>
                            <LI>{isEs ? 'Debe cumplir políticas de proveedores externos' : 'Must comply with external provider policies'}</LI>
                        </UL>
                        <P>{isEs ? 'Varylo no es parte de la relación contractual entre la agencia y sus clientes.' : 'Varylo is not part of the contractual relationship between the agency and its clients.'}</P>
                    </SectionCard>

                    {/* 8 */}
                    <SectionCard number={8} icon={sections[7].icon}>
                        <SectionTitle>{isEs ? 'Uso Aceptable' : 'Acceptable Use'}</SectionTitle>
                        <P>{isEs ? 'El Usuario se compromete a:' : 'The User agrees to:'}</P>
                        <UL>
                            <LI>{isEs ? 'Cumplir leyes aplicables' : 'Comply with applicable laws'}</LI>
                            <LI>{isEs ? 'Cumplir políticas de Meta y otros proveedores' : 'Comply with Meta and other provider policies'}</LI>
                            <LI>{isEs ? 'No enviar spam' : 'Not send spam'}</LI>
                            <LI>{isEs ? 'No realizar actividades fraudulentas' : 'Not engage in fraudulent activities'}</LI>
                            <LI>{isEs ? 'No intentar vulnerar el sistema' : 'Not attempt to breach the system'}</LI>
                            <LI>{isEs ? 'No usar el Servicio para actividades ilegales' : 'Not use the Service for illegal activities'}</LI>
                        </UL>
                        <P>{isEs ? 'El incumplimiento puede resultar en suspensión inmediata.' : 'Non-compliance may result in immediate suspension.'}</P>
                    </SectionCard>

                    {/* 9 */}
                    <SectionCard number={9} icon={sections[8].icon}>
                        <SectionTitle>{isEs ? 'Contenido del Usuario' : 'User Content'}</SectionTitle>
                        <P>{isEs ? 'El Usuario conserva la propiedad de su contenido. Al utilizar el Servicio otorga a ALTO TRÁFICO S.A.S. una licencia limitada para procesar, almacenar y transmitir su contenido únicamente para operar la plataforma.' : 'The User retains ownership of their content. By using the Service, the User grants ALTO TRÁFICO S.A.S. a limited license to process, store, and transmit their content solely to operate the platform.'}</P>
                        <P>{isEs ? 'El Usuario es responsable de la legalidad de los datos que maneja. Podremos utilizar datos anonimizados para mejorar el Servicio.' : 'The User is responsible for the legality of the data they handle. We may use anonymized data to improve the Service.'}</P>
                    </SectionCard>

                    {/* 10 */}
                    <SectionCard number={10} icon={sections[9].icon}>
                        <SectionTitle>{isEs ? 'Inteligencia Artificial — Descargo' : 'Artificial Intelligence — Disclaimer'}</SectionTitle>
                        <P>{isEs ? 'El Servicio puede incluir herramientas de inteligencia artificial. El Usuario acepta que:' : 'The Service may include artificial intelligence tools. The User accepts that:'}</P>
                        <UL>
                            <LI>{isEs ? 'La IA puede generar errores' : 'AI may generate errors'}</LI>
                            <LI>{isEs ? 'No constituye asesoría profesional' : 'It does not constitute professional advice'}</LI>
                            <LI>{isEs ? 'Debe ser supervisada por humanos' : 'It must be supervised by humans'}</LI>
                            <LI>{isEs ? 'El Usuario es responsable del uso que haga de la IA' : 'The User is responsible for their use of AI'}</LI>
                        </UL>
                        <P>{isEs ? 'No garantizamos exactitud de respuestas generadas por IA.' : 'We do not guarantee accuracy of AI-generated responses.'}</P>
                    </SectionCard>

                    {/* 11 */}
                    <SectionCard number={11} icon={sections[10].icon}>
                        <SectionTitle>{isEs ? 'Propiedad Intelectual' : 'Intellectual Property'}</SectionTitle>
                        <P>{isEs ? 'Todo el software, código, diseño, marca, tecnología y documentación del Servicio son propiedad de ALTO TRÁFICO S.A.S. Se prohíbe:' : 'All software, code, design, brand, technology, and documentation of the Service are the property of ALTO TRÁFICO S.A.S. It is prohibited to:'}</P>
                        <UL>
                            <LI>{isEs ? 'Copiar el software' : 'Copy the software'}</LI>
                            <LI>{isEs ? 'Descompilar' : 'Decompile'}</LI>
                            <LI>{isEs ? 'Crear derivados' : 'Create derivatives'}</LI>
                            <LI>{isEs ? 'Revender sin autorización' : 'Resell without authorization'}</LI>
                        </UL>
                        <P>{isEs ? 'El uso del Servicio no concede derechos de propiedad sobre la plataforma.' : 'Use of the Service does not grant ownership rights over the platform.'}</P>
                    </SectionCard>

                    {/* 12 */}
                    <SectionCard number={12} icon={sections[11].icon}>
                        <SectionTitle>{isEs ? 'Descargo de Garantías' : 'Disclaimer of Warranties'}</SectionTitle>
                        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 mb-4">
                            <p className="text-amber-800 text-sm font-semibold">{isEs ? 'EL SERVICIO SE PROPORCIONA "TAL CUAL".' : 'THE SERVICE IS PROVIDED "AS IS".'}</p>
                        </div>
                        <P>{isEs ? 'No garantizamos:' : 'We do not guarantee:'}</P>
                        <UL>
                            <LI>{isEs ? 'Disponibilidad continua' : 'Continuous availability'}</LI>
                            <LI>{isEs ? 'Ausencia de errores' : 'Absence of errors'}</LI>
                            <LI>{isEs ? 'Resultados específicos' : 'Specific results'}</LI>
                            <LI>{isEs ? 'Funcionamiento de terceros' : 'Third-party functionality'}</LI>
                        </UL>
                        <P>{isEs ? 'El uso del Servicio es bajo su propio riesgo.' : 'Use of the Service is at your own risk.'}</P>
                    </SectionCard>

                    {/* 13 */}
                    <SectionCard number={13} icon={sections[12].icon}>
                        <SectionTitle>{isEs ? 'Limitación de Responsabilidad' : 'Limitation of Liability'}</SectionTitle>
                        <P>{isEs ? 'En la máxima medida permitida por la ley, Varylo y ALTO TRÁFICO S.A.S. no serán responsables por:' : 'To the maximum extent permitted by law, Varylo and ALTO TRÁFICO S.A.S. shall not be liable for:'}</P>
                        <UL>
                            <LI>{isEs ? 'Daños indirectos' : 'Indirect damages'}</LI>
                            <LI>{isEs ? 'Pérdida de ingresos' : 'Loss of revenue'}</LI>
                            <LI>{isEs ? 'Pérdida de datos' : 'Loss of data'}</LI>
                            <LI>{isEs ? 'Daños reputacionales' : 'Reputational damages'}</LI>
                        </UL>
                        <P>{isEs ? 'La responsabilidad máxima no excederá el monto pagado por el Usuario en los últimos doce meses.' : 'Maximum liability shall not exceed the amount paid by the User in the last twelve months.'}</P>
                    </SectionCard>

                    {/* 14 */}
                    <SectionCard number={14} icon={sections[13].icon}>
                        <SectionTitle>{isEs ? 'Indemnización' : 'Indemnification'}</SectionTitle>
                        <P>{isEs ? 'El Usuario acepta indemnizar a ALTO TRÁFICO S.A.S. frente a cualquier reclamación derivada de:' : 'The User agrees to indemnify ALTO TRÁFICO S.A.S. against any claim arising from:'}</P>
                        <UL>
                            <LI>{isEs ? 'Uso indebido del Servicio' : 'Misuse of the Service'}</LI>
                            <LI>{isEs ? 'Violación de leyes' : 'Violation of laws'}</LI>
                            <LI>{isEs ? 'Violación de derechos de terceros' : 'Violation of third-party rights'}</LI>
                            <LI>{isEs ? 'Contenido enviado a través de la plataforma' : 'Content sent through the platform'}</LI>
                        </UL>
                    </SectionCard>

                    {/* 15 */}
                    <SectionCard number={15} icon={sections[14].icon}>
                        <SectionTitle>{isEs ? 'Resolución de Disputas' : 'Dispute Resolution'}</SectionTitle>
                        <P>{isEs ? 'Estos Términos se rigen por las leyes de la República de Colombia.' : 'These Terms are governed by the laws of the Republic of Colombia.'}</P>
                        <P>{isEs ? 'Las disputas intentarán resolverse mediante negociación directa. En caso de no llegar a acuerdo, podrán resolverse mediante arbitraje conforme a la legislación colombiana.' : 'Disputes will be attempted to be resolved through direct negotiation. If no agreement is reached, they may be resolved through arbitration in accordance with Colombian legislation.'}</P>
                    </SectionCard>

                    {/* 16 */}
                    <SectionCard number={16} icon={sections[15].icon}>
                        <SectionTitle>{isEs ? 'Fuerza Mayor' : 'Force Majeure'}</SectionTitle>
                        <P>{isEs ? 'ALTO TRÁFICO S.A.S. no será responsable por retrasos o fallos derivados de:' : 'ALTO TRÁFICO S.A.S. shall not be liable for delays or failures arising from:'}</P>
                        <UL>
                            <LI>{isEs ? 'Desastres naturales' : 'Natural disasters'}</LI>
                            <LI>{isEs ? 'Fallas de infraestructura' : 'Infrastructure failures'}</LI>
                            <LI>{isEs ? 'Ataques cibernéticos' : 'Cyber attacks'}</LI>
                            <LI>{isEs ? 'Cambios regulatorios' : 'Regulatory changes'}</LI>
                            <LI>{isEs ? 'Fallas de servicios externos' : 'External service failures'}</LI>
                        </UL>
                    </SectionCard>

                    {/* 17 */}
                    <SectionCard number={17} icon={sections[16].icon}>
                        <SectionTitle>{isEs ? 'Protección de Datos' : 'Data Protection'}</SectionTitle>
                        <P>{isEs ? 'El tratamiento de datos personales se rige por nuestra Política de Privacidad.' : 'The processing of personal data is governed by our Privacy Policy.'}</P>
                        <P>{isEs ? 'El Usuario es responsable de cumplir con las leyes de protección de datos aplicables a la información de sus contactos.' : 'The User is responsible for complying with applicable data protection laws regarding their contacts\' information.'}</P>
                        <P>{isEs ? 'Los datos pueden ser almacenados en infraestructura internacional.' : 'Data may be stored on international infrastructure.'}</P>
                    </SectionCard>

                    {/* 18 */}
                    <SectionCard number={18} icon={sections[17].icon}>
                        <SectionTitle>{isEs ? 'Modificaciones a los Términos' : 'Modifications to the Terms'}</SectionTitle>
                        <P>{isEs ? 'Podemos modificar estos Términos en cualquier momento. En caso de cambios sustanciales se notificará con anticipación.' : 'We may modify these Terms at any time. In case of substantial changes, notice will be given in advance.'}</P>
                        <P>{isEs ? 'El uso continuado del Servicio constituye aceptación de los cambios.' : 'Continued use of the Service constitutes acceptance of the changes.'}</P>
                    </SectionCard>

                    {/* 19 */}
                    <SectionCard number={19} icon={sections[18].icon}>
                        <SectionTitle>{isEs ? 'Terminación del Servicio' : 'Service Termination'}</SectionTitle>
                        <P>{isEs ? 'Podemos suspender o terminar cuentas en caso de:' : 'We may suspend or terminate accounts in case of:'}</P>
                        <UL>
                            <LI>{isEs ? 'Incumplimiento de Términos' : 'Breach of Terms'}</LI>
                            <LI>{isEs ? 'Actividad ilegal' : 'Illegal activity'}</LI>
                            <LI>{isEs ? 'Falta de pago' : 'Non-payment'}</LI>
                            <LI>{isEs ? 'Requerimiento legal' : 'Legal requirement'}</LI>
                        </UL>
                    </SectionCard>

                    {/* 20 */}
                    <SectionCard number={20} icon={sections[19].icon}>
                        <SectionTitle>{isEs ? 'Disposiciones Generales' : 'General Provisions'}</SectionTitle>
                        <P>{isEs ? 'Estos Términos constituyen el acuerdo completo entre el Usuario y ALTO TRÁFICO S.A.S.' : 'These Terms constitute the entire agreement between the User and ALTO TRÁFICO S.A.S.'}</P>
                        <P>{isEs ? 'Si alguna cláusula se considera inválida, las demás permanecerán vigentes.' : 'If any clause is deemed invalid, the remaining clauses shall remain in effect.'}</P>
                    </SectionCard>

                    {/* Contact */}
                    <div className="rounded-2xl border-2 border-emerald-500 bg-white p-8 md:p-10 text-center shadow-xl shadow-emerald-500/10">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center mx-auto mb-6">
                            <Mail className="h-6 w-6 text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">{isEs ? 'Contacto' : 'Contact'}</h2>
                        <P>{isEs ? 'Para consultas relacionadas con estos Términos:' : 'For inquiries related to these Terms:'}</P>
                        <a href="mailto:hello@varylo.app" className="inline-flex items-center gap-2 mt-2 mb-4 text-emerald-600 hover:text-emerald-700 font-semibold transition-colors">
                            hello@varylo.app
                        </a>
                        <P>{isEs ? 'También puede contactarnos a través de los canales de soporte disponibles dentro de la plataforma.' : 'You may also contact us through the support channels available within the platform.'}</P>
                        <div className="mt-6 pt-6 border-t border-gray-100">
                            <p className="text-sm text-gray-400">
                                {isEs ? 'Operado por' : 'Operated by'}{' '}
                                <strong className="text-gray-600">ALTO TRÁFICO S.A.S.</strong>
                                {' · '}
                                {isEs ? 'República de Colombia' : 'Republic of Colombia'}
                            </p>
                        </div>
                    </div>

                </div>
            </section>
        </div>
    );
}
