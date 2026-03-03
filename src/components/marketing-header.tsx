"use client"

import * as React from "react"
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetTrigger,
} from "@/components/ui/sheet";
import { LanguageSwitcher } from '@/components/language-switcher';

interface NavDict {
    home: string;
    features: string;
    pricing: string;
    login: string;
    getStarted: string;
}

interface MarketingHeaderProps {
    lang: string;
    nav: NavDict;
}

export function MarketingHeader({ lang, nav }: MarketingHeaderProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [scrolled, setScrolled] = React.useState(false);

    React.useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header className={`fixed top-0 z-50 w-full transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm' : 'bg-white/80 backdrop-blur-sm'}`}>
            <div className="container mx-auto flex h-16 max-w-screen-2xl items-center px-4">
                <Link href={`/${lang}`} className="mr-8 flex items-center gap-2.5 group">
                    <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-sm group-hover:bg-emerald-700 transition-colors">V</div>
                    <span className="font-bold text-xl text-gray-900 tracking-tight">VARYLO</span>
                </Link>

                <nav className="hidden md:flex items-center gap-8 text-sm">
                    <Link href={`/${lang}/#hero`} className="text-gray-500 hover:text-gray-900 transition-colors font-medium">{nav.home}</Link>
                    <Link href={`/${lang}/#features`} className="text-gray-500 hover:text-gray-900 transition-colors font-medium">{nav.features}</Link>
                    <Link href={`/${lang}/#pricing`} className="text-gray-500 hover:text-gray-900 transition-colors font-medium">{nav.pricing}</Link>
                </nav>

                <div className="flex flex-1 items-center justify-end gap-3">
                    <div className="hidden md:flex items-center gap-3">
                        <LanguageSwitcher />
                        <Link href={`/${lang}/login`}>
                            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 font-medium">{nav.login}</Button>
                        </Link>
                        <Link href={`/${lang}/register`}>
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm">{nav.getStarted}</Button>
                        </Link>
                    </div>

                    <Sheet open={isOpen} onOpenChange={setIsOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" className="px-0 text-gray-700 hover:bg-transparent focus-visible:bg-transparent md:hidden">
                                <Menu className="h-6 w-6" />
                                <span className="sr-only">Toggle Menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="bg-white border-gray-200 text-gray-900">
                            <div className="flex flex-col gap-6 mt-8 px-2">
                                <Link href={`/${lang}/#hero`} className="text-lg font-medium text-gray-700 hover:text-gray-900 transition-colors" onClick={() => setIsOpen(false)}>{nav.home}</Link>
                                <Link href={`/${lang}/#features`} className="text-lg font-medium text-gray-700 hover:text-gray-900 transition-colors" onClick={() => setIsOpen(false)}>{nav.features}</Link>
                                <Link href={`/${lang}/#pricing`} className="text-lg font-medium text-gray-700 hover:text-gray-900 transition-colors" onClick={() => setIsOpen(false)}>{nav.pricing}</Link>
                                <div className="h-px bg-gray-200" />
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-500">Idioma</span>
                                    <LanguageSwitcher />
                                </div>
                                <div className="h-px bg-gray-200" />
                                <Link href={`/${lang}/login`} onClick={() => setIsOpen(false)}>
                                    <Button variant="outline" className="w-full border-gray-300 text-gray-700 hover:bg-gray-50">{nav.login}</Button>
                                </Link>
                                <Link href={`/${lang}/register`} onClick={() => setIsOpen(false)}>
                                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">{nav.getStarted}</Button>
                                </Link>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </header>
    );
}
