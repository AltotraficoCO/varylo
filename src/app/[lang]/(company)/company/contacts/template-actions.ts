'use server';

export {
    getWhatsAppTemplates,
    sendTemplateMessage,
} from '@/lib/template-actions';

export type { WhatsAppTemplate, TemplateComponent } from '@/lib/template-actions';
