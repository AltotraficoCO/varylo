'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Globe, Image as ImageIcon, Link2, ArrowLeft, ArrowRight } from 'lucide-react';
import { TrustedLogosManager } from './trusted-logos';
import { FooterLinksCard } from './footer-links-card';
import type { FooterSection } from '@/lib/site-config';
import { useDictionary } from '@/lib/i18n-context';

interface TrustedLogo {
    id: string;
    name: string;
    imageUrl: string;
    sortOrder: number;
    active: boolean;
}

type View = 'menu' | 'logos' | 'footer';

export function SiteSettingsClient({
    logos,
    footerSections,
    copyrightText,
}: {
    logos: TrustedLogo[];
    footerSections: FooterSection[] | null;
    copyrightText: string | null;
}) {
    const [view, setView] = useState<View>('menu');
    const dict = useDictionary();
    const t = dict.superAdminUI?.siteSettingsClient || {};
    const ui = dict.ui || {};

    if (view === 'logos') {
        return (
            <div className="space-y-6">
                <div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setView('menu')}
                        className="gap-2 -ml-2 text-muted-foreground hover:text-foreground mb-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {ui.back || 'Volver'}
                    </Button>
                    <h2 className="text-2xl font-bold tracking-tight">{t.logosTitle || 'Logos de confianza'}</h2>
                    <p className="text-muted-foreground text-sm mt-1">
                        {t.logosFullDesc || 'Empresas que confían en Varylo. Se muestran en la landing page en escala de grises.'}
                    </p>
                </div>
                <TrustedLogosManager logos={logos} />
            </div>
        );
    }

    if (view === 'footer') {
        return (
            <div className="space-y-6">
                <div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setView('menu')}
                        className="gap-2 -ml-2 text-muted-foreground hover:text-foreground mb-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {ui.back || 'Volver'}
                    </Button>
                    <h2 className="text-2xl font-bold tracking-tight">{t.footerTitle || 'Enlaces del Footer'}</h2>
                    <p className="text-muted-foreground text-sm mt-1">
                        {t.footerFullDesc || 'Configura las secciones y enlaces del pie de página de la landing.'}
                    </p>
                </div>
                <FooterLinksCard
                    initialSections={footerSections}
                    initialCopyright={copyrightText}
                />
            </div>
        );
    }

    // Menu view
    const menuItems = [
        {
            id: 'logos' as View,
            icon: ImageIcon,
            title: t.logosTitle || 'Logos de confianza',
            description: t.logosDesc || 'Empresas que confían en Varylo, mostrados en la landing.',
            count: logos.length,
            countLabel: logos.length === 1 ? 'logo' : 'logos',
            color: 'bg-violet-50 text-violet-600 border-violet-100',
            iconBg: 'bg-violet-100',
        },
        {
            id: 'footer' as View,
            icon: Link2,
            title: t.footerTitle || 'Enlaces del Footer',
            description: t.footerDesc || 'Secciones y enlaces del pie de página de la landing.',
            count: (footerSections as any[])?.length || 0,
            countLabel: 'secciones',
            color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
            iconBg: 'bg-emerald-100',
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <Globe className="h-6 w-6 text-primary" />
                    {t.siteTitle || 'Sitio Web'}
                </h2>
                <p className="text-muted-foreground mt-1">
                    {t.siteDesc || 'Personaliza la landing page de Varylo.'}
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                {menuItems.map((item) => (
                    <Card
                        key={item.id}
                        className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group"
                        onClick={() => setView(item.id)}
                    >
                        <CardContent className="pt-6 pb-5">
                            <div className="flex items-start justify-between mb-4">
                                <div className={`p-3 rounded-xl ${item.iconBg}`}>
                                    <item.icon className={`h-6 w-6 ${item.color.split(' ')[1]}`} />
                                </div>
                                <span className="text-2xl font-bold text-foreground">
                                    {item.count}
                                    <span className="text-xs font-normal text-muted-foreground ml-1">
                                        {item.countLabel}
                                    </span>
                                </span>
                            </div>
                            <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {item.description}
                            </p>
                            <div className="mt-4 flex items-center text-sm text-primary font-medium gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {ui.configure || 'Configurar'}
                                <ArrowRight className="h-3.5 w-3.5" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
