import { AlertTriangle } from 'lucide-react';

export function DeprecationBanner() {
    return (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 flex items-center gap-2 text-sm text-red-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="flex-1 min-w-0">
                <strong>Aviso importante:</strong> esta herramienta será deprecada el{' '}
                <strong>31 de agosto de 2026</strong>. Después de esa fecha tendrás acceso a tus
                chats hasta el <strong>29 de septiembre de 2026</strong>. La herramienta no
                continuará; a quienes tengan membresías anuales los contactaremos por correo.
            </span>
        </div>
    );
}
