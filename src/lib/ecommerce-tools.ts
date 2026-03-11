import type { ChatCompletionTool } from 'openai/resources/chat/completions';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';

// --- Tool definitions for OpenAI function calling ---

export const ECOMMERCE_TOOLS: ChatCompletionTool[] = [
    {
        type: 'function',
        function: {
            name: 'search_products',
            description:
                'Busca productos en la tienda online por nombre, categoría o palabra clave. Devuelve una lista de productos con nombre, precio y disponibilidad.',
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description:
                            'Término de búsqueda: nombre del producto, categoría o palabra clave (ej: "aretes", "collar oro", "anillo plata")',
                    },
                },
                required: ['query'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_product_details',
            description:
                'Obtiene los detalles completos de un producto específico: descripción, variantes, precios, imágenes e inventario.',
            parameters: {
                type: 'object',
                properties: {
                    product_id: {
                        type: 'string',
                        description: 'ID del producto obtenido de search_products',
                    },
                },
                required: ['product_id'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'check_inventory',
            description:
                'Verifica la disponibilidad/stock de un producto o variante específica.',
            parameters: {
                type: 'object',
                properties: {
                    product_id: {
                        type: 'string',
                        description: 'ID del producto',
                    },
                    variant_name: {
                        type: 'string',
                        description:
                            'Nombre de la variante específica (ej: "Talla M", "Color Rojo"). Si no se especifica, devuelve el stock de todas las variantes.',
                    },
                },
                required: ['product_id'],
            },
        },
    },
];

// --- Types ---

interface EcommerceConfig {
    platform: 'shopify' | 'woocommerce';
    storeUrl: string;
    apiKey: string;
    apiSecret?: string;
}

interface ProductSummary {
    id: string;
    title: string;
    price: string;
    currency: string;
    available: boolean;
    image?: string;
}

interface ProductDetail {
    id: string;
    title: string;
    description: string;
    price: string;
    currency: string;
    available: boolean;
    images: string[];
    variants: {
        id: string;
        title: string;
        price: string;
        available: boolean;
        inventory_quantity: number;
        sku?: string;
    }[];
    vendor?: string;
    product_type?: string;
    tags?: string[];
}

interface InventoryInfo {
    product_id: string;
    title: string;
    variants: {
        id: string;
        title: string;
        inventory_quantity: number;
        available: boolean;
        sku?: string;
    }[];
}

// --- Get config for company ---

async function getEcommerceConfig(companyId: string): Promise<EcommerceConfig | null> {
    const integration = await prisma.ecommerceIntegration.findUnique({
        where: { companyId },
    });

    if (!integration || !integration.active) return null;

    return {
        platform: integration.platform as 'shopify' | 'woocommerce',
        storeUrl: integration.storeUrl,
        apiKey: decrypt(integration.apiKey),
        apiSecret: integration.apiSecret ? decrypt(integration.apiSecret) : undefined,
    };
}

// --- Shopify API ---

async function shopifyFetch(config: EcommerceConfig, endpoint: string) {
    const url = `https://${config.storeUrl}/admin/api/2024-01/${endpoint}`;
    const res = await fetch(url, {
        headers: {
            'X-Shopify-Access-Token': config.apiKey,
            'Content-Type': 'application/json',
        },
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Shopify API error ${res.status}: ${text}`);
    }

    return res.json();
}

async function shopifySearchProducts(config: EcommerceConfig, query: string): Promise<ProductSummary[]> {
    const data = await shopifyFetch(config, `products.json?title=${encodeURIComponent(query)}&limit=10`);

    return (data.products || []).map((p: Record<string, unknown>) => {
        const variants = p.variants as Record<string, unknown>[] || [];
        const firstVariant = variants[0] || {};
        const images = p.images as Record<string, unknown>[] || [];
        return {
            id: String(p.id),
            title: p.title as string,
            price: firstVariant.price as string || '0',
            currency: 'COP',
            available: p.status === 'active',
            image: images[0]?.src as string | undefined,
        };
    });
}

async function shopifyGetProductDetails(config: EcommerceConfig, productId: string): Promise<ProductDetail> {
    const data = await shopifyFetch(config, `products/${productId}.json`);
    const p = data.product;
    const variants = (p.variants || []) as Record<string, unknown>[];
    const images = (p.images || []) as Record<string, unknown>[];

    return {
        id: String(p.id),
        title: p.title,
        description: stripHtml(p.body_html || ''),
        price: variants[0]?.price as string || '0',
        currency: 'COP',
        available: p.status === 'active',
        images: images.map((img) => img.src as string),
        variants: variants.map((v) => ({
            id: String(v.id),
            title: v.title as string,
            price: v.price as string,
            available: v.inventory_quantity as number > 0,
            inventory_quantity: v.inventory_quantity as number,
            sku: v.sku as string | undefined,
        })),
        vendor: p.vendor,
        product_type: p.product_type,
        tags: p.tags ? (p.tags as string).split(', ') : [],
    };
}

async function shopifyCheckInventory(config: EcommerceConfig, productId: string): Promise<InventoryInfo> {
    const data = await shopifyFetch(config, `products/${productId}.json`);
    const p = data.product;
    const variants = (p.variants || []) as Record<string, unknown>[];

    return {
        product_id: String(p.id),
        title: p.title,
        variants: variants.map((v) => ({
            id: String(v.id),
            title: v.title as string,
            inventory_quantity: v.inventory_quantity as number,
            available: (v.inventory_quantity as number) > 0,
            sku: v.sku as string | undefined,
        })),
    };
}

// --- WooCommerce API ---

function wooAuth(config: EcommerceConfig): string {
    return Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64');
}

async function wooFetch(config: EcommerceConfig, endpoint: string) {
    const baseUrl = config.storeUrl.startsWith('http') ? config.storeUrl : `https://${config.storeUrl}`;
    const url = `${baseUrl}/wp-json/wc/v3/${endpoint}`;

    const res = await fetch(url, {
        headers: {
            Authorization: `Basic ${wooAuth(config)}`,
            'Content-Type': 'application/json',
        },
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`WooCommerce API error ${res.status}: ${text}`);
    }

    return res.json();
}

async function wooSearchProducts(config: EcommerceConfig, query: string): Promise<ProductSummary[]> {
    const data = await wooFetch(config, `products?search=${encodeURIComponent(query)}&per_page=10`);

    return (data || []).map((p: Record<string, unknown>) => {
        const images = p.images as Record<string, unknown>[] || [];
        return {
            id: String(p.id),
            title: p.name as string,
            price: (p.price as string) || '0',
            currency: 'COP',
            available: p.stock_status === 'instock',
            image: images[0]?.src as string | undefined,
        };
    });
}

async function wooGetProductDetails(config: EcommerceConfig, productId: string): Promise<ProductDetail> {
    const p = await wooFetch(config, `products/${productId}`);
    const images = (p.images || []) as Record<string, unknown>[];
    const variations = (p.variations || []) as number[];

    let variants: ProductDetail['variants'] = [];

    if (variations.length > 0) {
        const variationsData = await wooFetch(config, `products/${productId}/variations?per_page=100`);
        variants = (variationsData || []).map((v: Record<string, unknown>) => {
            const attributes = (v.attributes as Record<string, unknown>[]) || [];
            const variantTitle = attributes.map((a) => a.option).join(' / ');
            return {
                id: String(v.id),
                title: variantTitle || 'Default',
                price: (v.price as string) || '0',
                available: v.stock_status === 'instock',
                inventory_quantity: (v.stock_quantity as number) || 0,
                sku: v.sku as string | undefined,
            };
        });
    } else {
        variants = [
            {
                id: String(p.id),
                title: 'Default',
                price: (p.price as string) || '0',
                available: p.stock_status === 'instock',
                inventory_quantity: (p.stock_quantity as number) || 0,
                sku: p.sku as string | undefined,
            },
        ];
    }

    return {
        id: String(p.id),
        title: p.name as string,
        description: stripHtml(p.description || p.short_description || ''),
        price: (p.price as string) || '0',
        currency: 'COP',
        available: p.stock_status === 'instock',
        images: images.map((img) => img.src as string),
        variants,
        vendor: undefined,
        product_type: (p.categories as Record<string, unknown>[])?.[0]?.name as string | undefined,
        tags: ((p.tags as Record<string, unknown>[]) || []).map((t) => t.name as string),
    };
}

async function wooCheckInventory(config: EcommerceConfig, productId: string): Promise<InventoryInfo> {
    const p = await wooFetch(config, `products/${productId}`);
    const variations = (p.variations || []) as number[];

    let variants: InventoryInfo['variants'] = [];

    if (variations.length > 0) {
        const variationsData = await wooFetch(config, `products/${productId}/variations?per_page=100`);
        variants = (variationsData || []).map((v: Record<string, unknown>) => {
            const attributes = (v.attributes as Record<string, unknown>[]) || [];
            const variantTitle = attributes.map((a) => a.option).join(' / ');
            return {
                id: String(v.id),
                title: variantTitle || 'Default',
                inventory_quantity: (v.stock_quantity as number) || 0,
                available: v.stock_status === 'instock',
                sku: v.sku as string | undefined,
            };
        });
    } else {
        variants = [
            {
                id: String(p.id),
                title: 'Default',
                inventory_quantity: (p.stock_quantity as number) || 0,
                available: p.stock_status === 'instock',
                sku: p.sku as string | undefined,
            },
        ];
    }

    return {
        product_id: String(p.id),
        title: p.name,
        variants,
    };
}

// --- Unified executor ---

export async function executeEcommerceTool(
    toolName: string,
    args: Record<string, string>,
    companyId: string,
): Promise<string> {
    try {
        const config = await getEcommerceConfig(companyId);
        if (!config) {
            return JSON.stringify({ error: 'No hay tienda online configurada para esta empresa.' });
        }

        const isShopify = config.platform === 'shopify';

        switch (toolName) {
            case 'search_products': {
                const products = isShopify
                    ? await shopifySearchProducts(config, args.query)
                    : await wooSearchProducts(config, args.query);

                if (products.length === 0) {
                    return JSON.stringify({
                        products: [],
                        message: `No se encontraron productos para "${args.query}".`,
                    });
                }

                return JSON.stringify({
                    products: products.map((p) => ({
                        id: p.id,
                        title: p.title,
                        price: `$${p.price} ${p.currency}`,
                        available: p.available ? 'Disponible' : 'Agotado',
                    })),
                    message: `${products.length} producto(s) encontrado(s).`,
                });
            }

            case 'get_product_details': {
                const product = isShopify
                    ? await shopifyGetProductDetails(config, args.product_id)
                    : await wooGetProductDetails(config, args.product_id);

                return JSON.stringify({
                    product: {
                        id: product.id,
                        title: product.title,
                        description: product.description.substring(0, 500),
                        price: `$${product.price} ${product.currency}`,
                        available: product.available ? 'Disponible' : 'Agotado',
                        variants: product.variants.map((v) => ({
                            title: v.title,
                            price: `$${v.price}`,
                            stock: v.inventory_quantity,
                            available: v.available ? 'Disponible' : 'Agotado',
                        })),
                        type: product.product_type || 'N/A',
                        tags: product.tags || [],
                    },
                    message: `Detalles del producto "${product.title}".`,
                });
            }

            case 'check_inventory': {
                const inventory = isShopify
                    ? await shopifyCheckInventory(config, args.product_id)
                    : await wooCheckInventory(config, args.product_id);

                let variants = inventory.variants;

                if (args.variant_name) {
                    const lower = args.variant_name.toLowerCase();
                    const filtered = variants.filter(
                        (v) => v.title.toLowerCase().includes(lower),
                    );
                    if (filtered.length > 0) variants = filtered;
                }

                return JSON.stringify({
                    product: inventory.title,
                    variants: variants.map((v) => ({
                        title: v.title,
                        stock: v.inventory_quantity,
                        available: v.available ? 'Disponible' : 'Agotado',
                        sku: v.sku || 'N/A',
                    })),
                    message: `Inventario de "${inventory.title}".`,
                });
            }

            default:
                return JSON.stringify({ error: `Herramienta "${toolName}" no encontrada.` });
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido';
        console.error(`[EcommerceTool] ${toolName} error:`, message);
        return JSON.stringify({ error: `Error al consultar la tienda: ${message}` });
    }
}

// --- Helper ---

function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}
