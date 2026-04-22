import { Sidebar, superAdminItems } from '@/components/dashboard/sidebar';
import { DashboardHeader } from '@/components/dashboard/header';
import { getDictionary, Locale } from '@/lib/dictionary';
import { DictionaryProvider } from '@/lib/i18n-context';

export default async function SuperAdminLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ lang: string }>;
}) {
    const { lang } = await params;
    const dict = await getDictionary(lang as Locale);

    return (
        <DictionaryProvider dictionary={dict}>
            <div className="grid min-h-screen w-full lg:grid-cols-[240px_1fr]">
                <div className="hidden lg:block bg-sidebar">
                    <Sidebar role="super-admin" lang={lang} dict={dict.dashboard.sidebar} />
                </div>
                <div className="flex flex-col min-h-screen min-w-0">
                    <DashboardHeader
                        title={dict.dashboard.superAdminTitle}
                        lang={lang}
                        role="super-admin"
                        dict={dict.dashboard}
                        sidebarDict={dict.dashboard.sidebar}
                    />
                    <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 min-w-0 overflow-x-hidden">
                        {children}
                    </main>
                </div>
            </div>

        </DictionaryProvider>
    );
}
