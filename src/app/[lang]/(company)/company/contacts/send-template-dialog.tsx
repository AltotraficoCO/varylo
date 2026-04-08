'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
    Search,
    ChevronRight,
    ChevronLeft,
    Send,
    Loader2,
    FileText,
    User,
    Phone,
} from 'lucide-react';
import { getWhatsAppTemplates, sendTemplateMessage } from '@/lib/template-actions';
import { useDictionary } from '@/lib/i18n-context';

interface Contact {
    id: string;
    name: string | null;
    phone: string;
}

interface TemplateComponent {
    type: string;
    text?: string;
    format?: string;
    parameters?: { type: string; text?: string }[];
    example?: { body_text?: string[][] };
}

interface Template {
    name: string;
    language: string;
    status: string;
    category: string;
    components: TemplateComponent[];
}

type Step = 'recipient' | 'template' | 'params';

export function SendTemplateDialog({
    open,
    onOpenChange,
    contacts,
    lang,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    contacts: Contact[];
    lang: string;
}) {
    const dict = useDictionary();
    const t = dict.contacts || {};
    const ui = dict.ui || {};
    const router = useRouter();
    const pathname = usePathname();
    const isAgentRoute = pathname.includes('/agent');
    const [step, setStep] = useState<Step>('recipient');

    // Recipient state
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [newPhone, setNewPhone] = useState('');
    const [newName, setNewName] = useState('');
    const [contactSearch, setContactSearch] = useState('');

    // Template state
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [templateError, setTemplateError] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

    // Params state
    const [paramValues, setParamValues] = useState<Record<string, string>>({});
    const [sending, setSending] = useState(false);

    // Reset state when dialog closes
    useEffect(() => {
        if (!open) {
            setStep('recipient');
            setSelectedContact(null);
            setNewPhone('');
            setNewName('');
            setContactSearch('');
            setTemplates([]);
            setSelectedTemplate(null);
            setParamValues({});
            setTemplateError('');
        }
    }, [open]);

    // Load templates when entering step 2
    const loadTemplates = useCallback(async () => {
        setLoadingTemplates(true);
        setTemplateError('');
        const result = await getWhatsAppTemplates();
        if (result.success && result.templates) {
            setTemplates(result.templates);
        } else {
            setTemplateError(result.error || ui.unknown || 'Error desconocido');
        }
        setLoadingTemplates(false);
    }, []);

    const filteredContacts = contacts.filter((c) => {
        if (!contactSearch) return true;
        const q = contactSearch.toLowerCase();
        return (
            c.name?.toLowerCase().includes(q) ||
            c.phone.toLowerCase().includes(q)
        );
    });

    // Extract body param placeholders from selected template
    const getBodyParams = (template: Template): string[] => {
        const bodyComponent = template.components.find((c) => c.type === 'BODY');
        if (!bodyComponent?.text) return [];
        const matches = bodyComponent.text.match(/\{\{(\d+)\}\}/g);
        if (!matches) return [];
        return [...new Set(matches)].sort();
    };

    // Build preview text
    const getPreviewText = (template: Template): string => {
        const bodyComponent = template.components.find((c) => c.type === 'BODY');
        if (!bodyComponent?.text) return '';
        let text = bodyComponent.text;
        const params = getBodyParams(template);
        params.forEach((p) => {
            const idx = p.replace(/[{}]/g, '');
            const value = paramValues[idx] || p;
            text = text.replace(p, value);
        });
        return text;
    };

    const canProceedFromRecipient = selectedContact || newPhone.replace(/[^0-9]/g, '').length >= 8;

    const handleGoToTemplates = () => {
        setStep('template');
        if (templates.length === 0) {
            loadTemplates();
        }
    };

    const handleSelectTemplate = (t: Template) => {
        setSelectedTemplate(t);
        setParamValues({});
        const params = getBodyParams(t);
        if (params.length > 0) {
            setStep('params');
        }
        // If no params, user can send directly from template step
    };

    const handleSend = async () => {
        if (!selectedTemplate) return;

        setSending(true);

        // Build components array for Meta API
        const bodyParams = getBodyParams(selectedTemplate);
        const components: any[] = [];
        if (bodyParams.length > 0) {
            components.push({
                type: 'body',
                parameters: bodyParams.map((p) => ({
                    type: 'text',
                    text: paramValues[p.replace(/[{}]/g, '')] || '',
                })),
            });
        }

        const result = await sendTemplateMessage({
            contactId: selectedContact?.id,
            phone: selectedContact ? undefined : newPhone,
            contactName: selectedContact ? undefined : newName || undefined,
            templateName: selectedTemplate.name,
            templateLanguage: selectedTemplate.language,
            templateComponents: components,
            templateBody: getPreviewText(selectedTemplate),
        });

        setSending(false);

        if (result.success && result.conversationId) {
            toast.success(t.templateSent || 'Plantilla enviada correctamente');
            onOpenChange(false);
            const basePath = isAgentRoute ? 'agent' : 'company/conversations';
            router.push(`/${lang}/${basePath}?conversationId=${result.conversationId}`);
            router.refresh();
        } else {
            toast.error(result.error || ui.errorOccurred || 'Error al enviar');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>
                        {step === 'recipient' && (ui.select || 'Seleccionar')}
                        {step === 'template' && (t.selectTemplate || 'Seleccionar plantilla')}
                        {step === 'params' && (ui.configure || 'Completar parámetros')}
                    </DialogTitle>
                    <DialogDescription>
                        {step === 'recipient' && (t.noContactsDesc || 'Elige un contacto existente o ingresa un número nuevo.')}
                        {step === 'template' && (t.selectTemplate || 'Elige una plantilla aprobada de WhatsApp.')}
                        {step === 'params' && (ui.configure || 'Completa los valores de los parámetros de la plantilla.')}
                    </DialogDescription>
                </DialogHeader>

                {/* Step 1: Recipient */}
                {step === 'recipient' && (
                    <div className="flex-1 overflow-hidden flex flex-col gap-4">
                        {/* Existing contact search */}
                        <div>
                            <Label className="text-xs text-muted-foreground mb-1.5 block">{t.contactDetails || 'Contacto existente'}</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder={t.search || 'Buscar contacto...'}
                                    className="pl-9"
                                    value={contactSearch}
                                    onChange={(e) => setContactSearch(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto max-h-40 border rounded-md">
                            {filteredContacts.length === 0 ? (
                                <p className="text-xs text-muted-foreground p-3 text-center">{t.noContacts || 'No hay contactos.'}</p>
                            ) : (
                                filteredContacts.map((c) => (
                                    <button
                                        key={c.id}
                                        className={cn(
                                            'w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm',
                                            selectedContact?.id === c.id && 'bg-primary/5 border-l-2 border-primary'
                                        )}
                                        onClick={() => {
                                            setSelectedContact(c);
                                            setNewPhone('');
                                            setNewName('');
                                        }}
                                    >
                                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <div className="min-w-0">
                                            <p className="font-medium truncate">{c.name || c.phone}</p>
                                            <p className="text-xs text-muted-foreground">{c.phone}</p>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>

                        {/* Or new number */}
                        <div className="border-t pt-4">
                            <Label className="text-xs text-muted-foreground mb-1.5 block">{t.phone || 'O ingresa un número nuevo'}</Label>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <Input
                                        placeholder="57300123456"
                                        value={newPhone}
                                        onChange={(e) => {
                                            setNewPhone(e.target.value);
                                            setSelectedContact(null);
                                        }}
                                    />
                                </div>
                                <Input
                                    placeholder={`${ui.name || 'Nombre'} (${ui.optional || 'opcional'})`}
                                    className="w-36"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Incluye código de país sin + (ej. 573001234567)
                            </p>
                        </div>
                    </div>
                )}

                {/* Step 2: Template selection */}
                {step === 'template' && (
                    <div className="flex-1 overflow-hidden flex flex-col gap-3">
                        {loadingTemplates ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                <span className="ml-2 text-sm text-muted-foreground">{ui.loading || 'Cargando...'}</span>
                            </div>
                        ) : templateError ? (
                            <div className="text-center py-8">
                                <p className="text-sm text-destructive">{templateError}</p>
                                <Button variant="outline" size="sm" className="mt-3" onClick={loadTemplates}>
                                    {ui.retry || 'Reintentar'}
                                </Button>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto max-h-72 border rounded-md divide-y">
                                {templates.map((t) => {
                                    const body = t.components.find((c) => c.type === 'BODY');
                                    const isSelected = selectedTemplate?.name === t.name && selectedTemplate?.language === t.language;
                                    return (
                                        <button
                                            key={`${t.name}-${t.language}`}
                                            className={cn(
                                                'w-full text-left px-3 py-3 hover:bg-gray-50 transition-colors',
                                                isSelected && 'bg-primary/5 border-l-2 border-primary'
                                            )}
                                            onClick={() => handleSelectTemplate(t)}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                                <span className="font-medium text-sm">{t.name}</span>
                                                <Badge variant="outline" className="text-[10px] px-1.5 h-4">
                                                    {t.language}
                                                </Badge>
                                                <Badge variant="secondary" className="text-[10px] px-1.5 h-4 ml-auto">
                                                    {t.category}
                                                </Badge>
                                            </div>
                                            {body?.text && (
                                                <p className="text-xs text-muted-foreground line-clamp-2 pl-6">
                                                    {body.text}
                                                </p>
                                            )}
                                        </button>
                                    );
                                })}
                                {templates.length === 0 && (
                                    <p className="text-xs text-muted-foreground p-3 text-center">
                                        {t.noTemplatesAvailable || 'No hay plantillas aprobadas.'}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Step 3: Parameters */}
                {step === 'params' && selectedTemplate && (
                    <div className="flex-1 overflow-hidden flex flex-col gap-4">
                        <div className="space-y-3">
                            {getBodyParams(selectedTemplate).map((p) => {
                                const idx = p.replace(/[{}]/g, '');
                                return (
                                    <div key={idx} className="space-y-1">
                                        <Label className="text-sm">Parámetro {idx}</Label>
                                        <Input
                                            placeholder={`Valor para ${p}`}
                                            value={paramValues[idx] || ''}
                                            onChange={(e) =>
                                                setParamValues((prev) => ({ ...prev, [idx]: e.target.value }))
                                            }
                                        />
                                    </div>
                                );
                            })}
                        </div>

                        {/* Preview */}
                        <div className="border rounded-md p-3 bg-gray-50">
                            <Label className="text-xs text-muted-foreground mb-1 block">{ui.description || 'Vista previa'}</Label>
                            <p className="text-sm whitespace-pre-wrap">{getPreviewText(selectedTemplate)}</p>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <DialogFooter className="gap-2 sm:gap-0">
                    {step !== 'recipient' && (
                        <Button
                            variant="outline"
                            onClick={() => {
                                if (step === 'params') setStep('template');
                                else setStep('recipient');
                            }}
                            className="mr-auto"
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            {ui.back || 'Atrás'}
                        </Button>
                    )}

                    {step === 'recipient' && (
                        <Button
                            onClick={handleGoToTemplates}
                            disabled={!canProceedFromRecipient}
                        >
                            {ui.next || 'Siguiente'}
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    )}

                    {step === 'template' && selectedTemplate && getBodyParams(selectedTemplate).length === 0 && (
                        <Button onClick={handleSend} disabled={sending}>
                            {sending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                                <Send className="h-4 w-4 mr-1" />
                            )}
                            {sending ? (ui.sending || 'Enviando...') : (ui.send || 'Enviar')}
                        </Button>
                    )}

                    {step === 'params' && (
                        <Button onClick={handleSend} disabled={sending}>
                            {sending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                                <Send className="h-4 w-4 mr-1" />
                            )}
                            {sending ? (ui.sending || 'Enviando...') : (t.sendTemplate || 'Enviar plantilla')}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
