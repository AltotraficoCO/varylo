import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ProfileForm } from './profile-form';
import { getDictionary, Locale } from '@/lib/dictionary';

export default async function AgentProfilePage({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params;
    const dict = await getDictionary(lang as Locale);
    const t = dict.dashboard.agentProfile;
    const session = await auth();
    if (!session?.user?.id) return null;

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, name: true, email: true, createdAt: true },
    });

    if (!user) return null;

    return (
        <div className="max-w-2xl mx-auto w-full">
            <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    {t.subtitle}
                </p>
            </div>

            <ProfileForm user={user} />
        </div>
    );
}
