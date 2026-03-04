import { getSiteConfigAction, ensureSiteConfigTable } from './actions';
import { FaviconCard } from './favicon-card';
import { FooterLinksCard } from './footer-links-card';

export default async function SiteSettingsPage() {
    await ensureSiteConfigTable();
    const result = await getSiteConfigAction();
    const config = result.data;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Sitio Web</h2>
                <p className="text-muted-foreground">
                    Configura el favicon y los enlaces del footer de la landing page.
                </p>
            </div>
            <div className="grid gap-6">
                <FaviconCard currentFavicon={config?.faviconUrl || '/favicon.png'} />
                <FooterLinksCard
                    initialSections={config?.footerSections || null}
                    initialCopyright={config?.copyrightText || null}
                />
            </div>
        </div>
    );
}
