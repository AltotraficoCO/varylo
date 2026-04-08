'use client';

import { Button } from '@/components/ui/button';
import { User, Menu } from 'lucide-react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar, TagData, SidebarDict } from './sidebar';
import { StatusSelector } from './status-selector';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useState } from 'react';
import { updateUserStatus } from '@/lib/user-status';

export interface HeaderDict {
    myAccount: string;
    profile: string;
    signOut: string;
}

interface DashboardHeaderProps {
    title: string;
    lang: string;
    role: 'super-admin' | 'company' | 'agent';
    tags?: TagData[];
    userStatus?: 'ONLINE' | 'BUSY' | 'OFFLINE';
    userName?: string;
    userEmail?: string;
    dict?: HeaderDict;
    sidebarDict?: SidebarDict;
}

const defaultDict: HeaderDict = {
    myAccount: 'Mi Cuenta',
    profile: 'Perfil',
    signOut: 'Cerrar sesión',
};

export function DashboardHeader({ title, lang, role, tags = [], userStatus = 'OFFLINE', userName, userEmail, dict, sidebarDict }: DashboardHeaderProps) {
    const [open, setOpen] = useState(false);
    const initial = userName ? userName.charAt(0).toUpperCase() : null;
    const t = dict || defaultDict;

    return (
        <header className="flex h-14 items-center gap-4 border-b bg-background px-6 lg:h-[60px] justify-between lg:justify-end">
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 lg:hidden"
                    >
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle navigation menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="flex flex-col p-0 w-[280px]">
                    <Sidebar
                        role={role}
                        lang={lang}
                        tags={tags}
                        className="border-none w-full"
                        onLinkClick={() => setOpen(false)}
                        dict={sidebarDict}
                    />
                </SheetContent>
            </Sheet>

            <div className="w-full flex-1 lg:hidden">
                <div className="flex items-center ml-2">
                    <Image src="/logo.png" alt="Varylo" width={120} height={67} />
                </div>
            </div>

            <div className="hidden lg:flex w-full flex-1">
                <h1 className="text-lg font-semibold">{title}</h1>
            </div>

            <LanguageSwitcher />

            {role !== 'super-admin' && (
                <StatusSelector initialStatus={userStatus} />
            )}

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full bg-primary/10 text-primary hover:bg-primary/20">
                        {initial ? (
                            <span className="text-sm font-semibold">{initial}</span>
                        ) : (
                            <User className="h-5 w-5" />
                        )}
                        <span className="sr-only">Toggle user menu</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>
                        <div>
                            <p>{t.myAccount}</p>
                            {userEmail && <p className="text-xs font-normal text-muted-foreground">{userEmail}</p>}
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                        <Link href={role === 'agent' ? `/${lang}/agent/profile` : `/${lang}/company/settings`} className="w-full">
                            {t.profile}
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={async () => {
                        await updateUserStatus('OFFLINE');
                        signOut();
                    }}>
                        {t.signOut}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </header>
    );
}
