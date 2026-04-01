import { cn } from '@/lib/utils';

const AVATAR_COLORS = [
    '#3B82F6', // blue
    '#8B5CF6', // purple
    '#F59E0B', // amber
    '#10B981', // emerald
    '#EC4899', // pink
    '#EF4444', // red
    '#F97316', // orange
    '#06B6D4', // cyan
    '#6366F1', // indigo
    '#14B8A6', // teal
];

function getColor(seed: string): string {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string | null | undefined, phone?: string | null): string {
    if (name && name.trim()) {
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return parts[0].substring(0, 2).toUpperCase();
    }
    if (phone) {
        return phone.substring(phone.length - 2);
    }
    return '?';
}

export interface ContactAvatarProps {
    name: string | null | undefined;
    phone?: string | null;
    imageUrl?: string | null;
    className?: string;
    fallbackClassName?: string;
}

export function ContactAvatar({
    name,
    phone,
    className,
}: ContactAvatarProps) {
    const seed = name || phone || 'unknown';
    const initials = getInitials(name, phone);
    const bgColor = getColor(seed);

    return (
        <div
            className={cn('h-10 w-10 rounded-full flex items-center justify-center shrink-0', className)}
            style={{ backgroundColor: bgColor }}
        >
            <span className="text-white font-semibold text-xs leading-none">
                {initials}
            </span>
        </div>
    );
}
