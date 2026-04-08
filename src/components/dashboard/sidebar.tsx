'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import {
    LayoutDashboard,
    MessageSquare,
    Settings,
    CreditCard,
    BarChart3,
    Inbox,
    Bot,
    Sparkles,
    Contact,
    UsersRound,
    Building2,
    UserCircle,
    Globe,
    Megaphone,
    Puzzle,
    CalendarDays,
    Kanban,
    Package,
    FileText as FileTextIcon,
} from 'lucide-react';
import { SidebarUnreadBadge } from './unread-badge';

export interface NavItem {
    title: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    children?: NavItem[];
    unreadBadge?: boolean;
}

export interface SectionGroup {
    label?: string;
    items: NavItem[];
}

export interface TagData {
    id: string;
    name: string;
    color: string;
    showInSidebar: boolean;
}

export interface SidebarDict {
    dashboard: string;
    communication: string;
    conversations: string;
    all: string;
    contacts: string;
    broadcasts: string;
    automation: string;
    chatbots: string;
    aiAgents: string;
    crm: string;
    pipeline: string;
    products: string;
    quotes: string;
    management: string;
    team: string;
    calendar: string;
    analytics: string;
    settings: string;
    administration: string;
    companies: string;
    billing: string;
    siteSettings: string;
    metrics: string;
    inbox: string;
    myProfile: string;
    footer: string;
}

type SidebarRole = 'super-admin' | 'company' | 'agent';

interface SidebarProps {
    role: SidebarRole;
    lang: string;
    tags?: TagData[];
    className?: string;
    onLinkClick?: () => void;
    dict?: SidebarDict;
}

function buildSections(role: SidebarRole, t: SidebarDict, tags?: TagData[]): { sections: SectionGroup[]; bottomItems: NavItem[] } {
    let sections: SectionGroup[] = [];
    let bottomItems: NavItem[] = [];

    switch (role) {
        case 'super-admin':
            sections = [
                { items: [{ title: t.dashboard, href: '/super-admin', icon: LayoutDashboard }] },
                {
                    label: t.administration, items: [
                        { title: t.companies, href: '/super-admin/companies', icon: Building2 },
                        { title: t.billing, href: '/super-admin/billing', icon: CreditCard },
                        { title: t.siteSettings, href: '/super-admin/site-settings', icon: Globe },
                    ]
                },
                {
                    label: t.metrics, items: [
                        { title: t.analytics, href: '/super-admin/analytics', icon: BarChart3 },
                    ]
                },
            ];
            break;
        case 'company': {
            const commItems: NavItem[] = [
                { title: t.conversations, href: '/company/conversations', icon: MessageSquare, unreadBadge: true },
                { title: t.contacts, href: '/company/contacts', icon: Contact },
                { title: t.broadcasts, href: '/company/broadcasts', icon: Megaphone },
            ];
            if (tags && tags.length > 0) {
                const sidebarTags = tags.filter(tg => tg.showInSidebar);
                if (sidebarTags.length > 0) {
                    const convIndex = commItems.findIndex(i => i.href === '/company/conversations');
                    if (convIndex !== -1) {
                        const baseItem = commItems[convIndex];
                        commItems[convIndex] = {
                            ...baseItem,
                            children: [
                                { title: t.all, href: '/company/conversations', icon: MessageSquare },
                                ...sidebarTags.map(tag => ({
                                    title: tag.name,
                                    href: `/company/conversations?filter=all&tag=${tag.id}`,
                                    icon: ({ className }: { className?: string }) => (
                                        <div
                                            className={className}
                                            style={{ backgroundColor: tag.color, borderRadius: '50%', border: '1px solid rgba(0,0,0,0.1)' }}
                                        />
                                    )
                                }))
                            ]
                        };
                    }
                }
            }
            sections = [
                { items: [{ title: t.dashboard, href: '/company', icon: LayoutDashboard }] },
                { label: t.communication, items: commItems },
                {
                    label: t.automation, items: [
                        { title: t.chatbots, href: '/company/chatbots', icon: Bot },
                        { title: t.aiAgents, href: '/company/ai-agents', icon: Sparkles },
                    ]
                },
                {
                    label: t.crm, items: [
                        { title: t.pipeline, href: '/company/crm/pipeline', icon: Kanban },
                        { title: t.products, href: '/company/crm/products', icon: Package },
                        { title: t.quotes, href: '/company/crm/quotes', icon: FileTextIcon },
                    ]
                },
                {
                    label: t.management, items: [
                        { title: t.team, href: '/company/agents', icon: UsersRound },
                        { title: t.calendar, href: '/company/calendar', icon: CalendarDays },
                        { title: t.analytics, href: '/company/analytics', icon: BarChart3 },
                    ]
                },
            ];
            bottomItems = [{ title: t.settings, href: '/company/settings', icon: Settings }];
            break;
        }
        case 'agent':
            sections = [
                { items: [{ title: t.inbox, href: '/agent', icon: Inbox, unreadBadge: true }] },
                { items: [{ title: t.myProfile, href: '/agent/profile', icon: UserCircle }] },
            ];
            break;
    }

    return { sections, bottomItems };
}

const defaultDict: SidebarDict = {
    dashboard: 'Dashboard',
    communication: 'COMUNICACIÓN',
    conversations: 'Conversaciones',
    all: 'Todas',
    contacts: 'Contactos',
    broadcasts: 'Difusiones',
    automation: 'AUTOMATIZACIÓN',
    chatbots: 'Chatbots',
    aiAgents: 'Agentes IA',
    crm: 'CRM',
    pipeline: 'Pipeline',
    products: 'Productos',
    quotes: 'Cotizaciones',
    management: 'GESTIÓN',
    team: 'Equipo',
    calendar: 'Calendario',
    analytics: 'Analíticas',
    settings: 'Configuración',
    administration: 'ADMINISTRACIÓN',
    companies: 'Empresas',
    billing: 'Planes & Facturación',
    siteSettings: 'Sitio Web',
    metrics: 'MÉTRICAS',
    inbox: 'Inbox',
    myProfile: 'Mi Perfil',
    footer: 'Desarrollado con IA y con ❤️',
};

export function Sidebar({ role, lang, tags, className, onLinkClick, dict }: SidebarProps) {
    const pathname = usePathname();
    const t = dict || defaultDict;
    const { sections, bottomItems } = buildSections(role, t, tags);

    return (
        <div className={clsx("border-r bg-sidebar w-[240px] flex flex-col h-screen sticky top-0", className)}>
            {/* Logo */}
            <div className="flex h-14 items-center border-b border-sidebar-border px-6 lg:h-[60px] shrink-0">
                <Link href={`/${lang}`} className="flex items-center font-semibold" onClick={onLinkClick}>
                    <Image src="/logo.png" alt="Varylo" width={140} height={79} className="brightness-0 invert" />
                </Link>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-3">
                <nav className="grid items-start px-3 text-sm font-medium">
                    {sections.map((section, sIdx) => (
                        <div key={sIdx} className={sIdx > 0 ? "mt-4" : ""}>
                            {section.label && (
                                <span className="text-[10px] uppercase tracking-wider text-sidebar-foreground/40 px-3 mb-1.5 block font-semibold">
                                    {section.label}
                                </span>
                            )}
                            {section.items.map((item, index) => (
                                <SidebarItem key={index} item={item} lang={lang} pathname={pathname} onLinkClick={onLinkClick} />
                            ))}
                        </div>
                    ))}
                </nav>
            </div>

            {/* Bottom pinned items */}
            {bottomItems.length > 0 && (
                <div className="border-t border-sidebar-border px-3 py-3 shrink-0">
                    <nav className="grid items-start text-sm font-medium">
                        {bottomItems.map((item, index) => (
                            <SidebarItem key={index} item={item} lang={lang} pathname={pathname} onLinkClick={onLinkClick} />
                        ))}
                    </nav>
                </div>
            )}

            {/* Footer */}
            <div className="border-t border-sidebar-border px-4 py-3 shrink-0">
                <p className="text-[10px] text-sidebar-foreground/40 text-center leading-relaxed">
                    {t.footer}
                </p>
            </div>
        </div>
    );
}

function SidebarItem({ item, lang, pathname, onLinkClick }: { item: NavItem, lang: string, pathname: string, onLinkClick?: () => void }) {
    const localizedHref = `/${lang}${item.href}`;
    const isActive = pathname === localizedHref || (item.children && item.children.some(child => pathname === `/${lang}${child.href}`));

    if (item.children) {
        return (
            <div className="w-full">
                <Link
                    href={localizedHref}
                    onClick={onLinkClick}
                    className={clsx(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-all",
                        isActive ? "bg-sidebar-accent text-sidebar-primary font-medium" : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                    )}
                >
                    <item.icon className="h-4 w-4" />
                    {item.title}
                    {item.unreadBadge && <SidebarUnreadBadge />}
                </Link>
                <div className="pl-6 space-y-0.5 mt-0.5">
                    {item.children.map((child, index) => {
                        const childHref = `/${lang}${child.href}`;
                        const isChildActive = pathname === childHref;
                        return (
                            <Link
                                key={index}
                                href={childHref}
                                onClick={onLinkClick}
                                className={clsx(
                                    "flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-all",
                                    isChildActive ? "text-sidebar-primary font-medium bg-sidebar-accent/50" : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30"
                                )}
                            >
                                {child.icon && <child.icon className="h-3.5 w-3.5" />}
                                {child.title}
                            </Link>
                        )
                    })}
                </div>
            </div>
        )
    }

    return (
        <Link
            href={localizedHref}
            onClick={onLinkClick}
            className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
                isActive ? "bg-sidebar-accent text-sidebar-primary font-medium" : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
        >
            <item.icon className="h-4 w-4" />
            {item.title}
            {item.unreadBadge && <SidebarUnreadBadge />}
        </Link>
    );
}


// Keep these exports for backwards compatibility with layouts that import them
export const superAdminItems: NavItem[] = [
    { title: 'Dashboard', href: '/super-admin', icon: LayoutDashboard },
    { title: 'Empresas', href: '/super-admin/companies', icon: Building2 },
    { title: 'Analíticas', href: '/super-admin/analytics', icon: BarChart3 },
    { title: 'Planes & Facturación', href: '/super-admin/billing', icon: CreditCard },
];

export const companyAdminItems: NavItem[] = [
    { title: 'Dashboard', href: '/company', icon: LayoutDashboard },
    { title: 'Conversaciones', href: '/company/conversations', icon: MessageSquare },
    { title: 'Contactos', href: '/company/contacts', icon: Contact },
    { title: 'Chatbots', href: '/company/chatbots', icon: Bot },
    { title: 'Agentes IA', href: '/company/ai-agents', icon: Sparkles },
    { title: 'Equipo', href: '/company/agents', icon: UsersRound },
    { title: 'Analíticas', href: '/company/analytics', icon: BarChart3 },
    { title: 'Configuración', href: '/company/settings', icon: Settings },
];

export const agentItems: NavItem[] = [
    { title: 'Inbox', href: '/agent', icon: Inbox },
    { title: 'Mi Perfil', href: '/agent/profile', icon: UserCircle },
];
