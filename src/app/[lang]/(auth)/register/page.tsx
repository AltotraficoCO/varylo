import Link from 'next/link';
import RegisterForm from './register-form';
import { getDictionary, Locale } from '@/lib/dictionary';

export default async function RegisterPage({ params }: { params: Promise<{ lang: Locale }> }) {
    const { lang } = await params;
    const dict = await getDictionary(lang);
    const d = dict.auth.register;

    return (
        <div className="w-full max-w-md space-y-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 backdrop-blur-sm">
            <div className="text-center">
                <h2 className="text-2xl font-semibold tracking-tight text-white">{d.title}</h2>
                <p className="mt-2 text-sm text-zinc-400">
                    {d.subtitle}
                </p>
            </div>
            <RegisterForm dict={d} />
            <p className="text-center text-sm text-zinc-500">
                {d.hasAccount}{' '}
                <Link href={`/${lang}/login`} className="font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
                    {d.login}
                </Link>
            </p>
        </div>
    );
}
