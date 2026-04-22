'use client';

import { Globe, Image as ImageIcon, Link2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

export function SiteSettingsClient({
    logos,
    footerSections,
    copyrightText,
}: {
    logos: TrustedLogo[];
    footerSections: FooterSection[] | null;
    copyrightText: string | null;
}) {
    const dict = useDictionary();
    const t = dict.superAdminUI?.siteSettingsClient || {};

    const logosCount = logos.length;
    const footerCount = (footerSections as any[])?.length || 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-1">
                <h1 className="text-[28px] font-bold text-foreground flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                        <Globe className="h-5 w-5 text-primary" />
                    </div>
                    {t.siteTitle || 'Sitio Web'}
                </h1>
                <p className="text-sm text-muted-foreground ml-11">
                    {t.siteDesc || 'Personaliza la landing page de Varylo.'}
                </p>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="logos" className="space-y-6">
                <TabsList className="h-auto p-1">
                    <TabsTrigger value="logos" className="flex items-center gap-2 px-4 py-2">
                        <ImageIcon className="h-4 w-4" />
                        <span>{t.logosTitle || 'Logos de confianza'}</span>
                        {logosCount > 0 && (
                            <span className="ml-1 text-xs bg-primary/10 text-primary font-semibold rounded-full px-1.5 py-0.5">
                                {logosCount}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="footer" className="flex items-center gap-2 px-4 py-2">
                        <Link2 className="h-4 w-4" />
                        <span>{t.footerTitle || 'Footer'}</span>
                        {footerCount > 0 && (
                            <span className="ml-1 text-xs bg-primary/10 text-primary font-semibold rounded-full px-1.5 py-0.5">
                                {footerCount}
                            </span>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="logos" className="space-y-4 mt-0">
                    <div className="bg-card rounded-xl border p-5">
                        <div className="flex items-start gap-3 mb-5 pb-5 border-b border-[#F4F4F5] dark:border-[#27272A]">
                            <div className="p-2 rounded-lg bg-violet-50 text-violet-600">
                                <ImageIcon className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-foreground">{t.logosTitle || 'Logos de confianza'}</p>
                                <p className="text-[13px] text-muted-foreground mt-0.5">
                                    {t.logosFullDesc || 'Empresas que confían en Varylo. Se muestran en la landing page en escala de grises.'}
                                </p>
                            </div>
                        </div>
                        <TrustedLogosManager logos={logos} />
                    </div>
                </TabsContent>

                <TabsContent value="footer" className="space-y-4 mt-0">
                    <FooterLinksCard
                        initialSections={footerSections}
                        initialCopyright={copyrightText}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
