import Link from 'next/link';
import ResetPasswordForm from './reset-password-form';
import { getDictionary, Locale } from '@/lib/dictionary';

export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: Locale }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { lang } = await params;
  const { token } = await searchParams;
  const dict = await getDictionary(lang);
  const d = dict.auth.resetPassword;

  if (!token) {
    return (
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 backdrop-blur-sm">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-white">{d.title}</h2>
          <p className="mt-2 text-sm text-red-400">{d.invalidToken}</p>
        </div>
        <p className="text-center text-sm text-zinc-500">
          <Link href={`/${lang}/forgot-password`} className="font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
            {dict.auth.forgotPassword.backToLogin}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 backdrop-blur-sm">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-white">{d.title}</h2>
        <p className="mt-2 text-sm text-zinc-400">{d.subtitle}</p>
      </div>
      <ResetPasswordForm dict={d} token={token} lang={lang} />
    </div>
  );
}
