import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

/**
 * Generates a deterministic DiceBear avatar URL based on a seed string.
 * Uses the "notionists" style for clean, professional avatars.
 */
function getAvatarUrl(seed: string): string {
    const encoded = encodeURIComponent(seed);
    return `https://api.dicebear.com/9.x/notionists/svg?seed=${encoded}&backgroundColor=transparent`;
}

interface ContactAvatarProps {
    name: string | null | undefined;
    phone?: string | null;
    imageUrl?: string | null;
    className?: string;
    fallbackClassName?: string;
}

export function ContactAvatar({
    name,
    phone,
    imageUrl,
    className,
    fallbackClassName,
}: ContactAvatarProps) {
    const seed = name || phone || 'unknown';
    const initials = (name || phone || '?').substring(0, 1).toUpperCase();
    const src = imageUrl || getAvatarUrl(seed);

    return (
        <Avatar className={cn('h-10 w-10', className)}>
            <AvatarImage src={src} alt={name || phone || 'Avatar'} />
            <AvatarFallback className={cn('bg-primary/10 text-primary font-medium', fallbackClassName)}>
                {initials}
            </AvatarFallback>
        </Avatar>
    );
}
