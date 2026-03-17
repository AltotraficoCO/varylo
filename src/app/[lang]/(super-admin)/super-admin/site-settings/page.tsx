import { getSiteConfigAction, ensureSiteConfigTable, getTrustedLogos } from './actions';
import { FooterLinksCard } from './footer-links-card';
import { TrustedLogosManager } from './trusted-logos';
import { Card, CardContent } from '@/components/ui/card';
import { Globe, Image as ImageIcon, Link2 } from 'lucide-react';

export default async function SiteSettingsPage() {
    await ensureSiteConfigTable();
    const [result, logos] = await Promise.all([
        getSiteConfigAction(),
        getTrustedLogos().catch(() => []),
    ]);
    const config = result.data;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <Globe className="h-6 w-6 text-primary" />
                    Sitio Web
                </h2>
                <p className="text-muted-foreground mt-1">
                    Personaliza la landing page de Varylo.
                </p>
            </div>

            {/* Summary cards */}
            <div className="grid gap-4 sm:grid-cols-2">
                <Card className="bg-gradient-to-br from-violet-50 to-white border-violet-100">
                    <CardContent className="flex items-center gap-4 pt-6">
                        <div className="p-3 rounded-xl bg-violet-100">
                            <ImageIcon className="h-5 w-5 text-violet-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{logos.length}</p>
                            <p className="text-xs text-muted-foreground">Logos de confianza</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
                    <CardContent className="flex items-center gap-4 pt-6">
                        <div className="p-3 rounded-xl bg-emerald-100">
                            <Link2 className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">
                                {(config?.footerSections as any[])?.length || 0}
                            </p>
                            <p className="text-xs text-muted-foreground">Secciones del footer</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Logos section */}
            <section className="space-y-4">
                <TrustedLogosManager logos={logos} />
            </section>

            {/* Footer section */}
            <section>
                <FooterLinksCard
                    initialSections={config?.footerSections || null}
                    initialCopyright={config?.copyrightText || null}
                />
            </section>
        </div>
    );
}
