import { prisma } from '@/lib/prisma';
import { unstable_noStore as noStore } from 'next/cache';

export type FooterLink = {
    label: string;
    href: string;
};

export type FooterSection = {
    title: string;
    links: FooterLink[];
};

export type SiteConfigData = {
    footerSections: FooterSection[];
    copyrightText: string;
};

const DEFAULT_FOOTER_SECTIONS: FooterSection[] = [
    {
        title: 'Producto',
        links: [
            { label: 'Funciones', href: '#features' },
            { label: 'Precios', href: '#pricing' },
            { label: 'FAQ', href: '#faq' },
        ],
    },
    {
        title: 'Empresa',
        links: [
            { label: 'Nosotros', href: '#contact' },
        ],
    },
    {
        title: 'Legal',
        links: [
            { label: 'Privacidad', href: '/privacy' },
            { label: 'Términos', href: '/terms' },
        ],
    },
];

const DEFAULT_COPYRIGHT = 'Varylo. Todos los derechos reservados.';

export async function getSiteConfig(): Promise<SiteConfigData> {
    noStore();
    try {
        const config = await prisma.siteConfig.findFirst();
        if (config) {
            return {
                footerSections: (config.footerSections as FooterSection[]) || DEFAULT_FOOTER_SECTIONS,
                copyrightText: config.copyrightText || DEFAULT_COPYRIGHT,
            };
        }
    } catch {
        // Table may not exist yet — fall through to defaults
    }

    return {
        footerSections: DEFAULT_FOOTER_SECTIONS,
        copyrightText: DEFAULT_COPYRIGHT,
    };
}
