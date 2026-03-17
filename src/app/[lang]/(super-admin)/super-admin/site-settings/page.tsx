import { getSiteConfigAction, ensureSiteConfigTable, getTrustedLogos } from './actions';
import { FooterLinksCard } from './footer-links-card';
import { TrustedLogosManager } from './trusted-logos';

export default async function SiteSettingsPage() {
    await ensureSiteConfigTable();
    const [result, logos] = await Promise.all([
        getSiteConfigAction(),
        getTrustedLogos().catch(() => []),
    ]);
    const config = result.data;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Sitio Web</h2>
                <p className="text-muted-foreground">
                    Configura los enlaces del footer de la landing page.
                </p>
            </div>
            <div className="grid gap-6">
                <TrustedLogosManager logos={logos} />
                <FooterLinksCard
                    initialSections={config?.footerSections || null}
                    initialCopyright={config?.copyrightText || null}
                />
            </div>
        </div>
    );
}
