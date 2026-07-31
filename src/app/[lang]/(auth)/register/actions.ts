'use server';

// El registro de nuevas cuentas está cerrado: la herramienta será deprecada
// el 31 de agosto de 2026 y los chats quedan accesibles hasta el 29 de
// septiembre de 2026.
export async function register(
    _prevState: { success?: boolean; error?: string } | undefined,
    _formData: FormData,
): Promise<{ success?: boolean; error?: string }> {
    return { error: 'El registro de nuevas cuentas está cerrado.' };
}
