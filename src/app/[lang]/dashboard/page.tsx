import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Locale } from '@/lib/dictionary';

// Compare against raw strings (not the Prisma `Role` enum) so a JWT carrying a
// role unknown to the currently-loaded Prisma client doesn't silently fall
// through and render a blank page.
export default async function DashboardPage({ params }: { params: Promise<{ lang: Locale }> }) {
    const { lang } = await params;
    const session = await auth();

    if (!session || !session.user) {
        redirect(`/${lang}/login`);
    }

    const role = (session.user.role as string | undefined) ?? null;
    console.log('[dashboard-redirect] role=', role, 'lang=', lang);

    let target: string | null = null;
    if (role === 'SUPER_ADMIN') target = `/${lang}/super-admin`;
    else if (role === 'COMPANY_ADMIN' || role === 'SUPERVISOR') target = `/${lang}/company`;
    else if (role === 'AGENT') target = `/${lang}/agent`;

    if (target) {
        redirect(target);
    }

    // Unknown role — show a visible debug page instead of a blank one so the
    // user can copy the role string and report it. The "log out" link clears
    // the stale session.
    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui, sans-serif', background: '#fafafa', color: '#0f172a' }}>
            <div style={{ maxWidth: 520, background: 'white', border: '1px solid #e4e4e7', borderRadius: 16, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
                <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Sesión sin rol reconocido</h1>
                <p style={{ fontSize: 14, color: '#52525b', marginBottom: 16 }}>
                    Tu sesión carga el rol <code style={{ background: '#f4f4f5', padding: '2px 6px', borderRadius: 4 }}>{String(role)}</code>, pero el panel no sabe a dónde llevarte.
                    Cierra sesión y vuelve a entrar para refrescar tus permisos.
                </p>
                <Link
                    href="/api/auth/signout"
                    style={{ display: 'inline-block', background: '#10B981', color: 'white', padding: '10px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
                >
                    Cerrar sesión
                </Link>
            </div>
        </div>
    );
}
