import { getSiteConfigAction, ensureSiteConfigTable, getTrustedLogos } from './actions';
import { SiteSettingsClient } from './site-settings-client';

export default async function SiteSettingsPage() {
    await ensureSiteConfigTable();
    const [result, logos] = await Promise.all([
        getSiteConfigAction(),
        getTrustedLogos().catch(() => []),
    ]);
    const config = result.data;

    return (
        <SiteSettingsClient
            logos={logos}
            footerSections={config?.footerSections || null}
            copyrightText={config?.copyrightText || null}
        />
    );
}
