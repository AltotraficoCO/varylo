'use server';

export {
    getWhatsAppTemplates,
    sendTemplateMessage,
    createWhatsAppTemplate,
    deleteWhatsAppTemplate,
} from '@/lib/template-actions';

export type { WhatsAppTemplate, TemplateComponent } from '@/lib/template-actions';
