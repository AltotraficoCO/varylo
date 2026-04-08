import { Sidebar, superAdminItems } from '@/components/dashboard/sidebar';
import { DashboardHeader } from '@/components/dashboard/header';
import { getDictionary, Locale } from '@/lib/dictionary';

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
        <div className="grid min-h-screen w-full lg:grid-cols-[240px_1fr]">
            <Sidebar role="super-admin" lang={lang} className="hidden lg:block" dict={dict.dashboard.sidebar} />
            <div className="flex flex-col min-h-screen">
                <DashboardHeader
                    title={dict.dashboard.superAdminTitle}
                    lang={lang}
                    role="super-admin"
                    dict={dict.dashboard}
                    sidebarDict={dict.dashboard.sidebar}
                />
                <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
