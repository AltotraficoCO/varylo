/**
 * Shared utilities for data capture — used by both chatbot and AI agent.
 */

const FIELD_TO_CONTACT_MAPPING: Record<string, string> = {
    nombre: 'name',
    name: 'name',
    nombre_completo: 'name',
    email: 'email',
    correo: 'email',
    correo_electronico: 'email',
    celular: 'phone',
    telefono: 'phone',
    phone: 'phone',
    empresa: 'companyName',
    company: 'companyName',
    ciudad: 'city',
    city: 'city',
    pais: 'country',
    country: 'country',
};

export function mapFieldToContact(fieldName: string, value: string): Record<string, string> | null {
    const key = fieldName.toLowerCase().replace(/\s+/g, '_');
    const contactField = FIELD_TO_CONTACT_MAPPING[key];
    if (!contactField) return null;
    return { [contactField]: value };
}

export function validateCapturedValue(value: string, type: string): { valid: boolean; hint?: string } {
    const trimmed = value.trim();
    if (!trimmed) return { valid: false, hint: 'El valor no puede estar vacío.' };

    switch (type) {
        case 'email':
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
                ? { valid: true }
                : { valid: false, hint: 'Debe ser un email válido (ej: nombre@dominio.com).' };
        case 'phone':
            return /^[\d\s\+\-\(\)]{7,20}$/.test(trimmed)
                ? { valid: true }
                : { valid: false, hint: 'Debe ser un número de teléfono válido (7-20 dígitos).' };
        case 'number':
            return /^\d+$/.test(trimmed)
                ? { valid: true }
                : { valid: false, hint: 'Debe ser un número.' };
        case 'document':
            return { valid: false, hint: 'La validación de documentos se maneja por separado.' };
        default:
            return { valid: true };
    }
}

const FIELD_VALIDATION_MAP: Record<string, string> = {
    email: 'email',
    correo: 'email',
    correo_electronico: 'email',
    telefono: 'phone',
    celular: 'phone',
    phone: 'phone',
    numero_telefono: 'phone',
    whatsapp: 'phone',
    edad: 'number',
    cantidad: 'number',
    cedula: 'number',
    nit: 'number',
    documento: 'number',
};

export function inferValidationType(fieldName: string): string {
    const key = fieldName.toLowerCase().replace(/\s+/g, '_');
    return FIELD_VALIDATION_MAP[key] || 'text';
}
