import { MarketingHeader } from '@/components/marketing-header';
import { getDictionary, Locale } from '@/lib/dictionary';
import Link from 'next/link';
import Image from 'next/image';

export default async function MarketingLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ lang: string }>;
}) {
    const { lang } = await params;
    const dict = await getDictionary(lang as Locale);
    const nav = dict.nav;
    const footer = dict.footer;

    return (
        <div className="flex min-h-screen flex-col">
            <MarketingHeader lang={lang} nav={nav} />
            <main className="flex-1 pt-16">{children}</main>
            <footer className="bg-gray-900 text-white border-t border-gray-800">
                <div className="container mx-auto px-4 py-16">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        <div className="col-span-2 md:col-span-1">
                            <div className="mb-4">
                                <Image src="/logo.png" alt="Varylo" width={140} height={79} className="brightness-0 invert" />
                            </div>
                            <p className="text-sm text-gray-400 leading-relaxed">
                                {lang === 'es'
                                    ? 'La plataforma que unifica tu atención al cliente con IA.'
                                    : 'The platform that unifies your customer support with AI.'}
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-sm text-gray-300 mb-4">{footer.product}</h4>
                            <ul className="space-y-2.5 text-sm text-gray-400">
                                <li><Link href="#features" className="hover:text-emerald-400 transition-colors">{nav.features}</Link></li>
                                <li><Link href="#pricing" className="hover:text-emerald-400 transition-colors">{nav.pricing}</Link></li>
                                <li><Link href="#faq" className="hover:text-emerald-400 transition-colors">FAQ</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold text-sm text-gray-300 mb-4">{footer.company}</h4>
                            <ul className="space-y-2.5 text-sm text-gray-400">
                                <li><Link href="#contact" className="hover:text-emerald-400 transition-colors">{footer.about}</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold text-sm text-gray-300 mb-4">{footer.legal}</h4>
                            <ul className="space-y-2.5 text-sm text-gray-400">
                                <li><Link href={`/${lang}/terms`} className="hover:text-emerald-400 transition-colors">{footer.privacy}</Link></li>
                                <li><Link href={`/${lang}/terms`} className="hover:text-emerald-400 transition-colors">{footer.terms}</Link></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-gray-800 mt-12 pt-8">
                        <p className="text-center text-sm text-gray-500">
                            &copy; {new Date().getFullYear()} {footer.rights}
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
