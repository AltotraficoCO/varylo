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
            <div className="flex w-full h-screen overflow-hidden">
                <div className="hidden lg:block shrink-0">
                    <Sidebar role="super-admin" lang={lang} dict={dict.dashboard.sidebar} />
                </div>
                <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
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
