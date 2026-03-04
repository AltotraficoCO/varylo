import { Locale } from '@/lib/dictionary';

export default async function TermsPage({ params }: { params: Promise<{ lang: Locale }> }) {
    const { lang } = await params;
    const isEs = lang === 'es';

    return (
        <div className="bg-white">
            <div className="container mx-auto px-4 py-20 max-w-3xl">
                <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-2">
                    {isEs ? 'Términos y Condiciones' : 'Terms and Conditions'}
                </h1>
                <p className="text-sm text-gray-400 mb-12">
                    {isEs ? 'Última actualización: 2026' : 'Last updated: 2026'}
                </p>

                <div className="prose prose-gray max-w-none prose-headings:text-gray-900 prose-h2:text-2xl prose-h2:font-semibold prose-h2:mt-12 prose-h2:mb-4 prose-h3:text-lg prose-h3:font-semibold prose-p:text-gray-600 prose-p:leading-relaxed prose-li:text-gray-600 prose-strong:text-gray-900">

                    <p className="text-lg text-gray-500 border-l-4 border-emerald-500 pl-4 mb-10">
                        <strong className="text-gray-900">VARYLO</strong><br />
                        {isEs
                            ? 'Operado por ALTO TRÁFICO S.A.S.'
                            : 'Operated by ALTO TRÁFICO S.A.S.'}
                    </p>

                    {/* 1 */}
                    <h2>1. {isEs ? 'Aceptación de los Términos y Elegibilidad' : 'Acceptance of Terms and Eligibility'}</h2>
                    <p>
                        {isEs
                            ? 'Estos Términos y Condiciones ("Términos") constituyen un acuerdo legalmente vinculante entre usted ("Usuario", "usted") y ALTO TRÁFICO S.A.S., sociedad comercial constituida bajo las leyes de la República de Colombia, que opera la plataforma bajo la marca Varylo ("Varylo", "nosotros", "la Empresa").'
                            : 'These Terms and Conditions ("Terms") constitute a legally binding agreement between you ("User", "you") and ALTO TRÁFICO S.A.S., a commercial company incorporated under the laws of the Republic of Colombia, operating the platform under the brand Varylo ("Varylo", "we", "the Company").'}
                    </p>
                    <p>
                        {isEs
                            ? 'Al registrarse, acceder o utilizar la plataforma Varylo (el "Servicio"), usted acepta quedar obligado por estos Términos en su totalidad.'
                            : 'By registering, accessing, or using the Varylo platform (the "Service"), you agree to be bound by these Terms in their entirety.'}
                    </p>
                    <p>{isEs ? 'El Servicio está destinado exclusivamente a:' : 'The Service is intended exclusively for:'}</p>
                    <ul>
                        <li>{isEs ? 'Personas mayores de dieciocho (18) años' : 'Persons over eighteen (18) years of age'}</li>
                        <li>{isEs ? 'Empresas o entidades legalmente constituidas' : 'Legally constituted companies or entities'}</li>
                    </ul>
                    <p>{isEs ? 'Al utilizar el Servicio usted declara que:' : 'By using the Service you declare that:'}</p>
                    <ul>
                        <li>{isEs ? 'a) Tiene al menos dieciocho (18) años de edad' : 'a) You are at least eighteen (18) years of age'}</li>
                        <li>{isEs ? 'b) Tiene la capacidad legal para celebrar contratos vinculantes' : 'b) You have the legal capacity to enter into binding contracts'}</li>
                        <li>{isEs ? 'c) Si actúa en nombre de una empresa, tiene la autoridad para obligar a dicha entidad' : 'c) If acting on behalf of a company, you have the authority to bind said entity'}</li>
                        <li>{isEs ? 'd) Ha leído, comprendido y acepta estos Términos y la Política de Privacidad' : 'd) You have read, understood, and accept these Terms and the Privacy Policy'}</li>
                    </ul>
                    <p>
                        {isEs
                            ? 'Si no está de acuerdo con alguna parte de estos Términos, no debe utilizar el Servicio.'
                            : 'If you do not agree with any part of these Terms, you should not use the Service.'}
                    </p>
                    <p>
                        {isEs
                            ? 'El uso continuado del Servicio después de cualquier modificación constituye aceptación de dichos cambios.'
                            : 'Continued use of the Service after any modification constitutes acceptance of such changes.'}
                    </p>

                    {/* 2 */}
                    <h2>2. {isEs ? 'Definiciones' : 'Definitions'}</h2>
                    <p>{isEs ? 'Para efectos de estos Términos:' : 'For the purposes of these Terms:'}</p>
                    <ul>
                        <li><strong>{isEs ? 'Servicio' : 'Service'}</strong> — {isEs ? 'La plataforma SaaS Varylo, incluyendo software, APIs, sitio web, aplicaciones, integraciones y documentación.' : 'The Varylo SaaS platform, including software, APIs, website, applications, integrations, and documentation.'}</li>
                        <li><strong>{isEs ? 'Usuario' : 'User'}</strong> — {isEs ? 'Persona natural o jurídica que utiliza el Servicio.' : 'Natural or legal person who uses the Service.'}</li>
                        <li><strong>{isEs ? 'Contenido del Usuario' : 'User Content'}</strong> — {isEs ? 'Datos, mensajes, contactos, archivos, configuraciones o cualquier información ingresada en la plataforma.' : 'Data, messages, contacts, files, configurations, or any information entered into the platform.'}</li>
                        <li><strong>{isEs ? 'Datos de Terceros' : 'Third-Party Data'}</strong> — {isEs ? 'Datos provenientes de servicios externos como Meta (WhatsApp Business API), proveedores de IA, pasarelas de pago u otras integraciones.' : 'Data from external services such as Meta (WhatsApp Business API), AI providers, payment gateways, or other integrations.'}</li>
                        <li><strong>{isEs ? 'Agencia' : 'Agency'}</strong> — {isEs ? 'Usuario que administra múltiples cuentas o clientes dentro de la plataforma.' : 'User who manages multiple accounts or clients within the platform.'}</li>
                        <li><strong>{isEs ? 'Cuenta Cliente' : 'Client Account'}</strong> — {isEs ? 'Cuenta individual administrada por una agencia dentro de la plataforma.' : 'Individual account managed by an agency within the platform.'}</li>
                        <li><strong>{isEs ? 'IA (Inteligencia Artificial)' : 'AI (Artificial Intelligence)'}</strong> — {isEs ? 'Funcionalidades automatizadas basadas en modelos de inteligencia artificial.' : 'Automated functionalities based on artificial intelligence models.'}</li>
                        <li><strong>{isEs ? 'Periodo de Prueba' : 'Trial Period'}</strong> — {isEs ? 'Periodo gratuito inicial otorgado al registrarse, si aplica.' : 'Initial free period granted upon registration, if applicable.'}</li>
                    </ul>

                    {/* 3 */}
                    <h2>3. {isEs ? 'Descripción del Servicio' : 'Service Description'}</h2>
                    <p>
                        {isEs
                            ? 'Varylo es una plataforma de software como servicio (SaaS) que puede incluir funcionalidades como:'
                            : 'Varylo is a software as a service (SaaS) platform that may include features such as:'}
                    </p>
                    <ul>
                        <li>{isEs ? 'CRM integrado' : 'Integrated CRM'}</li>
                        <li>{isEs ? 'Bandeja de entrada omnicanal' : 'Omnichannel inbox'}</li>
                        <li>{isEs ? 'Integración con WhatsApp Business API' : 'WhatsApp Business API integration'}</li>
                        <li>{isEs ? 'Automatización de conversaciones' : 'Conversation automation'}</li>
                        <li>{isEs ? 'Agentes de inteligencia artificial' : 'Artificial intelligence agents'}</li>
                        <li>{isEs ? 'Embudos de ventas' : 'Sales funnels'}</li>
                        <li>{isEs ? 'Gestión de contactos' : 'Contact management'}</li>
                        <li>{isEs ? 'Automatizaciones' : 'Automations'}</li>
                        <li>{isEs ? 'Integraciones con APIs externas' : 'External API integrations'}</li>
                        <li>{isEs ? 'Panel de agencias' : 'Agency panel'}</li>
                        <li>{isEs ? 'Webhooks e integraciones' : 'Webhooks and integrations'}</li>
                    </ul>
                    <p>{isEs ? 'El Servicio depende del funcionamiento de servicios de terceros incluyendo, pero no limitado a:' : 'The Service depends on the operation of third-party services including, but not limited to:'}</p>
                    <ul>
                        <li>Meta (WhatsApp Business API)</li>
                        <li>{isEs ? 'Proveedores de modelos de inteligencia artificial' : 'Artificial intelligence model providers'}</li>
                        <li>{isEs ? 'Pasarelas de pago' : 'Payment gateways'}</li>
                        <li>{isEs ? 'Infraestructura cloud' : 'Cloud infrastructure'}</li>
                    </ul>
                    <p>{isEs ? 'No garantizamos disponibilidad ininterrumpida de dichos servicios externos.' : 'We do not guarantee uninterrupted availability of such external services.'}</p>

                    {/* 4 */}
                    <h2>4. {isEs ? 'Registro y Cuenta' : 'Registration and Account'}</h2>
                    <p>{isEs ? 'Para utilizar el Servicio debe crear una cuenta proporcionando información veraz y actualizada.' : 'To use the Service you must create an account providing truthful and up-to-date information.'}</p>
                    <p>{isEs ? 'El Usuario es responsable de:' : 'The User is responsible for:'}</p>
                    <ul>
                        <li>{isEs ? 'Mantener la confidencialidad de sus credenciales' : 'Maintaining the confidentiality of their credentials'}</li>
                        <li>{isEs ? 'Todas las actividades realizadas bajo su cuenta' : 'All activities carried out under their account'}</li>
                        <li>{isEs ? 'Configurar correctamente sus integraciones externas' : 'Correctly configuring their external integrations'}</li>
                        <li>{isEs ? 'Proteger tokens, claves API y accesos' : 'Protecting tokens, API keys, and access credentials'}</li>
                    </ul>
                    <p>{isEs ? 'Debe notificarnos inmediatamente si detecta uso no autorizado de su cuenta.' : 'You must notify us immediately if you detect unauthorized use of your account.'}</p>
                    <p>{isEs ? 'Nos reservamos el derecho de suspender o cancelar cuentas que:' : 'We reserve the right to suspend or cancel accounts that:'}</p>
                    <ul>
                        <li>{isEs ? 'Proporcionen información falsa' : 'Provide false information'}</li>
                        <li>{isEs ? 'Incumplan estos Términos' : 'Breach these Terms'}</li>
                        <li>{isEs ? 'Realicen actividades ilegales' : 'Engage in illegal activities'}</li>
                        <li>{isEs ? 'Representen riesgo para la plataforma' : 'Pose a risk to the platform'}</li>
                    </ul>

                    {/* 5 */}
                    <h2>5. {isEs ? 'Planes y Facturación' : 'Plans and Billing'}</h2>
                    <p>{isEs ? 'El acceso a ciertas funcionalidades puede requerir una suscripción de pago.' : 'Access to certain features may require a paid subscription.'}</p>
                    <p>{isEs ? 'Las condiciones generales incluyen:' : 'General conditions include:'}</p>
                    <ul>
                        <li>{isEs ? 'Facturación recurrente' : 'Recurring billing'}</li>
                        <li>{isEs ? 'Procesamiento mediante pasarelas de pago externas' : 'Processing through external payment gateways'}</li>
                        <li>{isEs ? 'Cobro automático por ciclo de facturación' : 'Automatic charges per billing cycle'}</li>
                        <li>{isEs ? 'Posible existencia de periodos de prueba' : 'Possible trial periods'}</li>
                    </ul>
                    <p>{isEs ? 'Los precios pueden modificarse con previo aviso.' : 'Prices may be modified with prior notice.'}</p>
                    <p>{isEs ? 'Los impuestos aplicables según jurisdicción del Usuario son responsabilidad exclusiva del Usuario.' : 'Applicable taxes according to the User\'s jurisdiction are the sole responsibility of the User.'}</p>
                    <p>{isEs ? 'La falta de pago puede resultar en suspensión del Servicio.' : 'Failure to pay may result in suspension of the Service.'}</p>

                    {/* 6 */}
                    <h2>6. {isEs ? 'Cancelación y Reembolsos' : 'Cancellation and Refunds'}</h2>
                    <p>{isEs ? 'El Usuario puede cancelar su suscripción en cualquier momento desde el panel de configuración.' : 'The User may cancel their subscription at any time from the settings panel.'}</p>
                    <p>{isEs ? 'Al cancelar:' : 'Upon cancellation:'}</p>
                    <ul>
                        <li>{isEs ? 'La cuenta permanecerá activa hasta finalizar el periodo pagado' : 'The account will remain active until the end of the paid period'}</li>
                        <li>{isEs ? 'No se realizarán reembolsos proporcionales' : 'No prorated refunds will be issued'}</li>
                        <li>{isEs ? 'El acceso al Servicio finalizará al terminar el periodo activo' : 'Access to the Service will end when the active period expires'}</li>
                    </ul>
                    <p>{isEs ? 'Los datos del Usuario podrán mantenerse temporalmente para permitir exportación.' : 'User data may be temporarily retained to allow export.'}</p>

                    {/* 7 */}
                    <h2>7. {isEs ? 'Términos para Agencias' : 'Agency Terms'}</h2>
                    <p>{isEs ? 'Si el Usuario utiliza Varylo como agencia:' : 'If the User uses Varylo as an agency:'}</p>
                    <ul>
                        <li>{isEs ? 'Es responsable de la gestión de sus clientes' : 'Is responsible for managing their clients'}</li>
                        <li>{isEs ? 'Debe contar con autorización para manejar cuentas de terceros' : 'Must have authorization to manage third-party accounts'}</li>
                        <li>{isEs ? 'Debe garantizar cumplimiento legal de sus clientes' : 'Must ensure legal compliance of their clients'}</li>
                        <li>{isEs ? 'Debe cumplir políticas de proveedores externos' : 'Must comply with external provider policies'}</li>
                    </ul>
                    <p>{isEs ? 'Varylo no es parte de la relación contractual entre la agencia y sus clientes.' : 'Varylo is not part of the contractual relationship between the agency and its clients.'}</p>

                    {/* 8 */}
                    <h2>8. {isEs ? 'Uso Aceptable' : 'Acceptable Use'}</h2>
                    <p>{isEs ? 'El Usuario se compromete a:' : 'The User agrees to:'}</p>
                    <ul>
                        <li>{isEs ? 'Cumplir leyes aplicables' : 'Comply with applicable laws'}</li>
                        <li>{isEs ? 'Cumplir políticas de Meta y otros proveedores' : 'Comply with Meta and other provider policies'}</li>
                        <li>{isEs ? 'No enviar spam' : 'Not send spam'}</li>
                        <li>{isEs ? 'No realizar actividades fraudulentas' : 'Not engage in fraudulent activities'}</li>
                        <li>{isEs ? 'No intentar vulnerar el sistema' : 'Not attempt to breach the system'}</li>
                        <li>{isEs ? 'No usar el Servicio para actividades ilegales' : 'Not use the Service for illegal activities'}</li>
                    </ul>
                    <p>{isEs ? 'El incumplimiento puede resultar en suspensión inmediata.' : 'Non-compliance may result in immediate suspension.'}</p>

                    {/* 9 */}
                    <h2>9. {isEs ? 'Contenido del Usuario' : 'User Content'}</h2>
                    <p>{isEs ? 'El Usuario conserva la propiedad de su contenido. Al utilizar el Servicio otorga a ALTO TRÁFICO S.A.S. una licencia limitada para:' : 'The User retains ownership of their content. By using the Service, the User grants ALTO TRÁFICO S.A.S. a limited license to:'}</p>
                    <ul>
                        <li>{isEs ? 'Procesar' : 'Process'}</li>
                        <li>{isEs ? 'Almacenar' : 'Store'}</li>
                        <li>{isEs ? 'Transmitir' : 'Transmit'}</li>
                    </ul>
                    <p>{isEs ? 'su contenido únicamente para operar la plataforma.' : 'their content solely to operate the platform.'}</p>
                    <p>{isEs ? 'El Usuario es responsable de la legalidad de los datos que maneja.' : 'The User is responsible for the legality of the data they handle.'}</p>
                    <p>{isEs ? 'Podremos utilizar datos anonimizados para mejorar el Servicio.' : 'We may use anonymized data to improve the Service.'}</p>

                    {/* 10 */}
                    <h2>10. {isEs ? 'Inteligencia Artificial — Descargo' : 'Artificial Intelligence — Disclaimer'}</h2>
                    <p>{isEs ? 'El Servicio puede incluir herramientas de inteligencia artificial.' : 'The Service may include artificial intelligence tools.'}</p>
                    <p>{isEs ? 'El Usuario acepta que:' : 'The User accepts that:'}</p>
                    <ul>
                        <li>{isEs ? 'La IA puede generar errores' : 'AI may generate errors'}</li>
                        <li>{isEs ? 'No constituye asesoría profesional' : 'It does not constitute professional advice'}</li>
                        <li>{isEs ? 'Debe ser supervisada por humanos' : 'It must be supervised by humans'}</li>
                        <li>{isEs ? 'El Usuario es responsable del uso que haga de la IA' : 'The User is responsible for their use of AI'}</li>
                    </ul>
                    <p>{isEs ? 'No garantizamos exactitud de respuestas generadas por IA.' : 'We do not guarantee accuracy of AI-generated responses.'}</p>

                    {/* 11 */}
                    <h2>11. {isEs ? 'Propiedad Intelectual' : 'Intellectual Property'}</h2>
                    <p>{isEs ? 'Todo el software, código, diseño, marca, tecnología y documentación del Servicio son propiedad de ALTO TRÁFICO S.A.S.' : 'All software, code, design, brand, technology, and documentation of the Service are the property of ALTO TRÁFICO S.A.S.'}</p>
                    <p>{isEs ? 'Se prohíbe:' : 'It is prohibited to:'}</p>
                    <ul>
                        <li>{isEs ? 'Copiar el software' : 'Copy the software'}</li>
                        <li>{isEs ? 'Descompilar' : 'Decompile'}</li>
                        <li>{isEs ? 'Crear derivados' : 'Create derivatives'}</li>
                        <li>{isEs ? 'Revender sin autorización' : 'Resell without authorization'}</li>
                    </ul>
                    <p>{isEs ? 'El uso del Servicio no concede derechos de propiedad sobre la plataforma.' : 'Use of the Service does not grant ownership rights over the platform.'}</p>

                    {/* 12 */}
                    <h2>12. {isEs ? 'Descargo de Garantías' : 'Disclaimer of Warranties'}</h2>
                    <p className="uppercase font-semibold">{isEs ? 'El Servicio se proporciona "tal cual". No garantizamos:' : 'The Service is provided "as is". We do not guarantee:'}</p>
                    <ul>
                        <li>{isEs ? 'Disponibilidad continua' : 'Continuous availability'}</li>
                        <li>{isEs ? 'Ausencia de errores' : 'Absence of errors'}</li>
                        <li>{isEs ? 'Resultados específicos' : 'Specific results'}</li>
                        <li>{isEs ? 'Funcionamiento de terceros' : 'Third-party functionality'}</li>
                    </ul>
                    <p>{isEs ? 'El uso del Servicio es bajo su propio riesgo.' : 'Use of the Service is at your own risk.'}</p>

                    {/* 13 */}
                    <h2>13. {isEs ? 'Limitación de Responsabilidad' : 'Limitation of Liability'}</h2>
                    <p>{isEs ? 'En la máxima medida permitida por la ley:' : 'To the maximum extent permitted by law:'}</p>
                    <p>{isEs ? 'Varylo y ALTO TRÁFICO S.A.S. no serán responsables por:' : 'Varylo and ALTO TRÁFICO S.A.S. shall not be liable for:'}</p>
                    <ul>
                        <li>{isEs ? 'Daños indirectos' : 'Indirect damages'}</li>
                        <li>{isEs ? 'Pérdida de ingresos' : 'Loss of revenue'}</li>
                        <li>{isEs ? 'Pérdida de datos' : 'Loss of data'}</li>
                        <li>{isEs ? 'Daños reputacionales' : 'Reputational damages'}</li>
                    </ul>
                    <p>{isEs ? 'La responsabilidad máxima no excederá el monto pagado por el Usuario en los últimos doce meses.' : 'Maximum liability shall not exceed the amount paid by the User in the last twelve months.'}</p>

                    {/* 14 */}
                    <h2>14. {isEs ? 'Indemnización' : 'Indemnification'}</h2>
                    <p>{isEs ? 'El Usuario acepta indemnizar a ALTO TRÁFICO S.A.S. frente a cualquier reclamación derivada de:' : 'The User agrees to indemnify ALTO TRÁFICO S.A.S. against any claim arising from:'}</p>
                    <ul>
                        <li>{isEs ? 'Uso indebido del Servicio' : 'Misuse of the Service'}</li>
                        <li>{isEs ? 'Violación de leyes' : 'Violation of laws'}</li>
                        <li>{isEs ? 'Violación de derechos de terceros' : 'Violation of third-party rights'}</li>
                        <li>{isEs ? 'Contenido enviado a través de la plataforma' : 'Content sent through the platform'}</li>
                    </ul>

                    {/* 15 */}
                    <h2>15. {isEs ? 'Resolución de Disputas' : 'Dispute Resolution'}</h2>
                    <p>{isEs ? 'Estos Términos se rigen por las leyes de la República de Colombia.' : 'These Terms are governed by the laws of the Republic of Colombia.'}</p>
                    <p>{isEs ? 'Las disputas intentarán resolverse mediante negociación directa.' : 'Disputes will be attempted to be resolved through direct negotiation.'}</p>
                    <p>{isEs ? 'En caso de no llegar a acuerdo, podrán resolverse mediante arbitraje conforme a la legislación colombiana.' : 'If no agreement is reached, they may be resolved through arbitration in accordance with Colombian legislation.'}</p>

                    {/* 16 */}
                    <h2>16. {isEs ? 'Fuerza Mayor' : 'Force Majeure'}</h2>
                    <p>{isEs ? 'ALTO TRÁFICO S.A.S. no será responsable por retrasos o fallos derivados de:' : 'ALTO TRÁFICO S.A.S. shall not be liable for delays or failures arising from:'}</p>
                    <ul>
                        <li>{isEs ? 'Desastres naturales' : 'Natural disasters'}</li>
                        <li>{isEs ? 'Fallas de infraestructura' : 'Infrastructure failures'}</li>
                        <li>{isEs ? 'Ataques cibernéticos' : 'Cyber attacks'}</li>
                        <li>{isEs ? 'Cambios regulatorios' : 'Regulatory changes'}</li>
                        <li>{isEs ? 'Fallas de servicios externos' : 'External service failures'}</li>
                    </ul>

                    {/* 17 */}
                    <h2>17. {isEs ? 'Protección de Datos' : 'Data Protection'}</h2>
                    <p>{isEs ? 'El tratamiento de datos personales se rige por nuestra Política de Privacidad.' : 'The processing of personal data is governed by our Privacy Policy.'}</p>
                    <p>{isEs ? 'El Usuario es responsable de cumplir con las leyes de protección de datos aplicables a la información de sus contactos.' : 'The User is responsible for complying with applicable data protection laws regarding their contacts\' information.'}</p>
                    <p>{isEs ? 'Los datos pueden ser almacenados en infraestructura internacional.' : 'Data may be stored on international infrastructure.'}</p>

                    {/* 18 */}
                    <h2>18. {isEs ? 'Modificaciones a los Términos' : 'Modifications to the Terms'}</h2>
                    <p>{isEs ? 'Podemos modificar estos Términos en cualquier momento.' : 'We may modify these Terms at any time.'}</p>
                    <p>{isEs ? 'En caso de cambios sustanciales se notificará con anticipación.' : 'In case of substantial changes, notice will be given in advance.'}</p>
                    <p>{isEs ? 'El uso continuado del Servicio constituye aceptación de los cambios.' : 'Continued use of the Service constitutes acceptance of the changes.'}</p>

                    {/* 19 */}
                    <h2>19. {isEs ? 'Terminación del Servicio' : 'Service Termination'}</h2>
                    <p>{isEs ? 'Podemos suspender o terminar cuentas en caso de:' : 'We may suspend or terminate accounts in case of:'}</p>
                    <ul>
                        <li>{isEs ? 'Incumplimiento de Términos' : 'Breach of Terms'}</li>
                        <li>{isEs ? 'Actividad ilegal' : 'Illegal activity'}</li>
                        <li>{isEs ? 'Falta de pago' : 'Non-payment'}</li>
                        <li>{isEs ? 'Requerimiento legal' : 'Legal requirement'}</li>
                    </ul>

                    {/* 20 */}
                    <h2>20. {isEs ? 'Disposiciones Generales' : 'General Provisions'}</h2>
                    <p>{isEs ? 'Estos Términos constituyen el acuerdo completo entre el Usuario y ALTO TRÁFICO S.A.S.' : 'These Terms constitute the entire agreement between the User and ALTO TRÁFICO S.A.S.'}</p>
                    <p>{isEs ? 'Si alguna cláusula se considera inválida, las demás permanecerán vigentes.' : 'If any clause is deemed invalid, the remaining clauses shall remain in effect.'}</p>

                    {/* Contacto */}
                    <h2>{isEs ? 'Contacto' : 'Contact'}</h2>
                    <p>{isEs ? 'Para consultas relacionadas con estos Términos:' : 'For inquiries related to these Terms:'}</p>
                    <p>
                        {isEs ? 'Correo electrónico: ' : 'Email: '}
                        <a href="mailto:hello@varylo.app" className="text-emerald-600 hover:text-emerald-500 transition-colors">hello@varylo.app</a>
                    </p>
                    <p>{isEs ? 'También puede contactarnos a través de los canales de soporte disponibles dentro de la plataforma.' : 'You may also contact us through the support channels available within the platform.'}</p>
                    <p className="mt-8 pt-6 border-t border-gray-200 text-sm text-gray-400">
                        {isEs ? 'Operado por:' : 'Operated by:'}<br />
                        <strong className="text-gray-600">ALTO TRÁFICO S.A.S.</strong><br />
                        {isEs ? 'República de Colombia' : 'Republic of Colombia'}
                    </p>
                </div>
            </div>
        </div>
    );
}
