'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
import {
  ChevronRight,
  ChevronLeft,
  Megaphone,
  Loader2,
  FileText,
  Users,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getWhatsAppTemplates } from '@/lib/template-actions';
import { createBroadcast } from './actions';

interface ContactList {
  id: string;
  name: string;
  _count: { contacts: number };
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

type Step = 'list' | 'template' | 'params' | 'confirm';

export function SendBroadcastDialog({
  open,
  onOpenChange,
  contactLists,
  lang,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactLists: ContactList[];
  lang: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('list');

  const [selectedList, setSelectedList] = useState<ContactList | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateError, setTemplateError] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep('list');
      setSelectedList(null);
      setTemplates([]);
      setSelectedTemplate(null);
      setParamValues({});
      setTemplateError('');
    }
  }, [open]);

  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    setTemplateError('');
    const result = await getWhatsAppTemplates();
    if (result.success && result.templates) {
      setTemplates(result.templates);
    } else {
      setTemplateError(result.error || 'Error desconocido');
    }
    setLoadingTemplates(false);
  }, []);

  const getBodyParams = (template: Template): string[] => {
    const body = template.components.find((c) => c.type === 'BODY');
    if (!body?.text) return [];
    const matches = body.text.match(/\{\{(\d+)\}\}/g);
    if (!matches) return [];
    return [...new Set(matches)].sort();
  };

  const getPreviewText = (template: Template): string => {
    const body = template.components.find((c) => c.type === 'BODY');
    if (!body?.text) return '';
    let text = body.text;
    getBodyParams(template).forEach((p) => {
      const idx = p.replace(/[{}]/g, '');
      text = text.replace(p, paramValues[idx] || p);
    });
    return text;
  };

  const handleSelectList = (list: ContactList) => {
    setSelectedList(list);
    setStep('template');
    if (templates.length === 0) loadTemplates();
  };

  const handleSelectTemplate = (t: Template) => {
    setSelectedTemplate(t);
    setParamValues({});
    const params = getBodyParams(t);
    if (params.length > 0) {
      setStep('params');
    } else {
      setStep('confirm');
    }
  };

  const handleSend = async () => {
    if (!selectedList || !selectedTemplate) return;

    setSending(true);

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

    const result = await createBroadcast({
      contactListId: selectedList.id,
      templateName: selectedTemplate.name,
      templateLang: selectedTemplate.language,
      templateComponents: components,
      templateBody: getPreviewText(selectedTemplate),
    });

    if (result.success && result.broadcastId) {
      toast.success(
        `Enviando a ${selectedList._count.contacts} contactos... Esto puede tomar unos minutos.`
      );
      onOpenChange(false);

      // Execute broadcast (awaited on server) and refresh when done
      fetch(`/api/broadcast/${result.broadcastId}`, { method: 'POST' })
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            toast.success(`Difusión completada: ${data.sentCount} enviados, ${data.failedCount} fallidos.`);
          } else {
            toast.error(data.error || 'Error en la difusión.');
          }
          router.refresh();
        })
        .catch(() => {
          toast.error('Error al ejecutar la difusión.');
          router.refresh();
        });

      // Refresh immediately to show IN_PROGRESS status
      router.refresh();
    } else {
      toast.error(result.error || 'Error al crear la difusión.');
    }

    setSending(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === 'list' && 'Seleccionar lista'}
            {step === 'template' && 'Seleccionar plantilla'}
            {step === 'params' && 'Completar parámetros'}
            {step === 'confirm' && 'Confirmar difusión'}
          </DialogTitle>
          <DialogDescription>
            {step === 'list' && 'Elige la lista de contactos a la que enviar.'}
            {step === 'template' && 'Elige una plantilla aprobada de WhatsApp.'}
            {step === 'params' && 'Completa los valores de los parámetros.'}
            {step === 'confirm' && 'Revisa los detalles antes de enviar.'}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Select list */}
        {step === 'list' && (
          <div className="flex-1 overflow-y-auto max-h-72 border rounded-md divide-y">
            {contactLists.map((list) => (
              <button
                key={list.id}
                className={cn(
                  'w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center justify-between',
                  selectedList?.id === list.id && 'bg-primary/5 border-l-2 border-primary'
                )}
                onClick={() => handleSelectList(list)}
              >
                <div>
                  <p className="font-medium text-sm">{list.name}</p>
                </div>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {list._count.contacts}
                </Badge>
              </button>
            ))}
            {contactLists.length === 0 && (
              <p className="text-xs text-muted-foreground p-3 text-center">
                No hay listas. Crea una primero.
              </p>
            )}
          </div>
        )}

        {/* Step 2: Select template */}
        {step === 'template' && (
          <div className="flex-1 overflow-hidden flex flex-col gap-3">
            {loadingTemplates ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Cargando plantillas...</span>
              </div>
            ) : templateError ? (
              <div className="text-center py-8">
                <p className="text-sm text-destructive">{templateError}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={loadTemplates}>
                  Reintentar
                </Button>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto max-h-72 border rounded-md divide-y">
                {templates.map((t) => {
                  const body = t.components.find((c) => c.type === 'BODY');
                  return (
                    <button
                      key={`${t.name}-${t.language}`}
                      className="w-full text-left px-3 py-3 hover:bg-gray-50 transition-colors"
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
            <div className="border rounded-md p-3 bg-gray-50">
              <Label className="text-xs text-muted-foreground mb-1 block">Vista previa</Label>
              <p className="text-sm whitespace-pre-wrap">{getPreviewText(selectedTemplate)}</p>
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 'confirm' && selectedList && selectedTemplate && (
          <div className="flex-1 flex flex-col gap-4">
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Lista</span>
                <span className="text-sm font-medium">{selectedList.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Contactos</span>
                <Badge variant="secondary">{selectedList._count.contacts}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Plantilla</span>
                <span className="text-sm font-medium">{selectedTemplate.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Idioma</span>
                <Badge variant="outline">{selectedTemplate.language}</Badge>
              </div>
            </div>

            <div className="border rounded-md p-3 bg-gray-50">
              <Label className="text-xs text-muted-foreground mb-1 block">Mensaje</Label>
              <p className="text-sm whitespace-pre-wrap">{getPreviewText(selectedTemplate)}</p>
            </div>

            <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                Se enviará esta plantilla a <strong>{selectedList._count.contacts} contactos</strong>.
                Esto consumirá mensajes de tu cuota de WhatsApp Business. Esta acción no se puede deshacer.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <DialogFooter className="gap-2 sm:gap-0">
          {step !== 'list' && (
            <Button
              variant="outline"
              onClick={() => {
                if (step === 'confirm') {
                  const params = getBodyParams(selectedTemplate!);
                  setStep(params.length > 0 ? 'params' : 'template');
                } else if (step === 'params') setStep('template');
                else setStep('list');
              }}
              className="mr-auto"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Atrás
            </Button>
          )}

          {step === 'params' && (
            <Button onClick={() => setStep('confirm')}>
              Siguiente
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}

          {step === 'confirm' && (
            <Button onClick={handleSend} disabled={sending}>
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Megaphone className="h-4 w-4 mr-1" />
              )}
              {sending ? 'Iniciando...' : 'Enviar difusión'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
