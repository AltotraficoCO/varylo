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
    {
        type: 'function',
        function: {
            name: 'get_payment_methods',
            description:
                'Obtiene los métodos de pago disponibles en la tienda online (ej: tarjeta de crédito, transferencia, contra entrega, PSE, etc.).',
            parameters: {
                type: 'object',
                properties: {},
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'create_order',
            description:
                'Crea un pedido/orden en la tienda online y devuelve el link de pago para que el cliente complete la compra. Debes tener al menos el nombre del cliente y un producto. Si el producto es variable, necesitas el ID de la variante.',
            parameters: {
                type: 'object',
                properties: {
                    customer_name: {
                        type: 'string',
                        description: 'Nombre completo del cliente',
                    },
                    customer_email: {
                        type: 'string',
                        description: 'Email del cliente (opcional, para enviarle confirmación)',
                    },
                    customer_phone: {
                        type: 'string',
                        description: 'Teléfono del cliente (opcional)',
                    },
                    items: {
                        type: 'array',
                        description: 'Lista de productos a comprar',
                        items: {
                            type: 'object',
                            properties: {
                                product_id: {
                                    type: 'string',
                                    description: 'ID del producto',
                                },
                                variation_id: {
                                    type: 'string',
                                    description: 'ID de la variante (obligatorio para productos variables, obtenerlo de get_product_details)',
                                },
                                quantity: {
                                    type: 'number',
                                    description: 'Cantidad (default: 1)',
                                },
                            },
                            required: ['product_id'],
                        },
                    },
                },
                required: ['customer_name', 'items'],
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
    type?: string;
    variationCount?: number;
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
    attributes?: {
        name: string;
        options: string[];
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

async function shopifyFetch(config: EcommerceConfig, endpoint: string, options?: { method?: string; body?: unknown }) {
    const url = `https://${config.storeUrl}/admin/api/2024-01/${endpoint}`;
    const res = await fetch(url, {
        method: options?.method || 'GET',
        headers: {
            'X-Shopify-Access-Token': config.apiKey,
            'Content-Type': 'application/json',
        },
        ...(options?.body ? { body: JSON.stringify(options.body) } : {}),
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

async function wooFetch(config: EcommerceConfig, endpoint: string, options?: { method?: string; body?: unknown }) {
    const baseUrl = config.storeUrl.startsWith('http') ? config.storeUrl : `https://${config.storeUrl}`;
    const url = `${baseUrl}/wp-json/wc/v3/${endpoint}`;

    const res = await fetch(url, {
        method: options?.method || 'GET',
        headers: {
            Authorization: `Basic ${wooAuth(config)}`,
            'Content-Type': 'application/json',
        },
        ...(options?.body ? { body: JSON.stringify(options.body) } : {}),
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
        const variations = (p.variations as number[]) || [];
        const productType = p.type as string || 'simple';
        // Variable products may have price as range or empty — use price or regular_price
        const price = (p.price as string) || (p.regular_price as string) || '0';
        return {
            id: String(p.id),
            title: p.name as string,
            price,
            currency: 'COP',
            available: p.stock_status === 'instock' || (productType === 'variable' && variations.length > 0),
            image: images[0]?.src as string | undefined,
            type: productType,
            variationCount: variations.length,
        };
    });
}

async function wooGetProductDetails(config: EcommerceConfig, productId: string): Promise<ProductDetail> {
    const p = await wooFetch(config, `products/${productId}`);
    const images = (p.images || []) as Record<string, unknown>[];
    const variations = (p.variations || []) as number[];
    const productAttributes = (p.attributes || []) as Record<string, unknown>[];

    let variants: ProductDetail['variants'] = [];

    if (variations.length > 0) {
        const variationsData = await wooFetch(config, `products/${productId}/variations?per_page=100`);
        variants = (variationsData || []).map((v: Record<string, unknown>) => {
            const attributes = (v.attributes as Record<string, unknown>[]) || [];
            const variantTitle = attributes.map((a) => `${a.name}: ${a.option}`).join(' / ');
            return {
                id: String(v.id),
                title: variantTitle || 'Default',
                price: (v.price as string) || (v.regular_price as string) || '0',
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
                price: (p.price as string) || (p.regular_price as string) || '0',
                available: p.stock_status === 'instock',
                inventory_quantity: (p.stock_quantity as number) || 0,
                sku: p.sku as string | undefined,
            },
        ];
    }

    // Parse product-level attributes (e.g., Color, Talla) with their options
    const attributes = productAttributes.map((a) => ({
        name: a.name as string,
        options: (a.options as string[]) || [],
    }));

    return {
        id: String(p.id),
        title: p.name as string,
        description: stripHtml(p.description || p.short_description || ''),
        price: (p.price as string) || (p.regular_price as string) || '0',
        currency: 'COP',
        available: p.stock_status === 'instock' || (variations.length > 0 && variants.some(v => v.available)),
        images: images.map((img) => img.src as string),
        variants,
        attributes: attributes.length > 0 ? attributes : undefined,
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
            const variantTitle = attributes.map((a) => `${a.name}: ${a.option}`).join(' / ');
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

// --- Payment methods ---

async function wooGetPaymentMethods(config: EcommerceConfig) {
    const data = await wooFetch(config, 'payment_gateways');
    return (data || [])
        .filter((g: Record<string, unknown>) => g.enabled === true)
        .map((g: Record<string, unknown>) => ({
            id: g.id as string,
            title: g.title as string,
            description: stripHtml((g.description as string) || ''),
        }));
}

async function shopifyGetPaymentMethods(_config: EcommerceConfig) {
    // Shopify doesn't expose payment gateways via REST Admin API easily
    // Return a generic response — the checkout page will show available methods
    return [
        { id: 'shopify_payments', title: 'Pago online', description: 'Tarjeta de crédito/débito y otros métodos disponibles en el checkout.' },
    ];
}

// --- Create order ---

interface OrderItem {
    product_id: string;
    variation_id?: string;
    quantity?: number;
}

interface OrderResult {
    order_id: string;
    order_number: string;
    total: string;
    currency: string;
    payment_url: string;
    status: string;
}

async function wooCreateOrder(
    config: EcommerceConfig,
    customerName: string,
    customerEmail: string | undefined,
    customerPhone: string | undefined,
    items: OrderItem[],
): Promise<OrderResult> {
    const nameParts = customerName.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const lineItems = items.map((item) => ({
        product_id: parseInt(item.product_id, 10),
        ...(item.variation_id ? { variation_id: parseInt(item.variation_id, 10) } : {}),
        quantity: item.quantity || 1,
    }));

    const orderData: Record<string, unknown> = {
        status: 'pending',
        billing: {
            first_name: firstName,
            last_name: lastName,
            ...(customerEmail ? { email: customerEmail } : {}),
            ...(customerPhone ? { phone: customerPhone } : {}),
        },
        line_items: lineItems,
        set_paid: false,
    };

    const order = await wooFetch(config, 'orders', { method: 'POST', body: orderData });

    // WooCommerce returns payment_url for pending orders
    const baseUrl = config.storeUrl.startsWith('http') ? config.storeUrl : `https://${config.storeUrl}`;
    const paymentUrl = (order.payment_url as string) || `${baseUrl}/checkout/order-pay/${order.id}/?key=${order.order_key}`;

    return {
        order_id: String(order.id),
        order_number: String(order.number || order.id),
        total: order.total as string,
        currency: (order.currency as string) || 'COP',
        payment_url: paymentUrl,
        status: order.status as string,
    };
}

async function shopifyCreateOrder(
    config: EcommerceConfig,
    customerName: string,
    customerEmail: string | undefined,
    _customerPhone: string | undefined,
    items: OrderItem[],
): Promise<OrderResult> {
    const lineItems = items.map((item) => ({
        variant_id: parseInt(item.variation_id || item.product_id, 10),
        quantity: item.quantity || 1,
    }));

    // For Shopify we need variant IDs. If only product_id given, get the first variant
    for (let i = 0; i < lineItems.length; i++) {
        const item = items[i];
        if (!item.variation_id) {
            const productData = await shopifyFetch(config, `products/${item.product_id}.json`);
            const variants = (productData.product?.variants || []) as Record<string, unknown>[];
            if (variants[0]) {
                lineItems[i].variant_id = variants[0].id as number;
            }
        }
    }

    const draftOrder = await shopifyFetch(config, 'draft_orders.json', {
        method: 'POST',
        body: {
            draft_order: {
                line_items: lineItems,
                ...(customerEmail ? { email: customerEmail } : {}),
                ...(customerName ? { customer: { first_name: customerName } } : {}),
                use_customer_default_address: false,
            },
        },
    });

    const order = draftOrder.draft_order;
    const invoiceUrl = order.invoice_url as string;

    return {
        order_id: String(order.id),
        order_number: String(order.name || order.id),
        total: order.total_price as string,
        currency: (order.currency as string) || 'COP',
        payment_url: invoiceUrl,
        status: order.status as string,
    };
}

// --- Unified executor ---

export async function executeEcommerceTool(
    toolName: string,
    args: Record<string, unknown>,
    companyId: string,
): Promise<string> {
    try {
        const config = await getEcommerceConfig(companyId);
        if (!config) {
            return JSON.stringify({ error: 'No hay tienda online configurada para esta empresa.' });
        }

        const isShopify = config.platform === 'shopify';

        const str = (key: string) => (args[key] as string) || '';

        switch (toolName) {
            case 'search_products': {
                const products = isShopify
                    ? await shopifySearchProducts(config, str('query'))
                    : await wooSearchProducts(config, str('query'));

                if (products.length === 0) {
                    return JSON.stringify({
                        products: [],
                        message: `No se encontraron productos para "${str('query')}".`,
                    });
                }

                return JSON.stringify({
                    products: products.map((p) => ({
                        id: p.id,
                        title: p.title,
                        price: `$${p.price} ${p.currency}`,
                        available: p.available ? 'Disponible' : 'Agotado',
                        ...(p.type === 'variable' ? { type: 'Variable', variations: p.variationCount } : {}),
                    })),
                    message: `${products.length} producto(s) encontrado(s).${products.some(p => p.type === 'variable') ? ' Usa get_product_details para ver las variantes (tallas, colores, etc.) de los productos variables.' : ''}`,
                });
            }

            case 'get_product_details': {
                const product = isShopify
                    ? await shopifyGetProductDetails(config, str('product_id'))
                    : await wooGetProductDetails(config, str('product_id'));

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
                        ...(product.attributes && product.attributes.length > 0
                            ? { attributes: product.attributes.map(a => ({ name: a.name, options: a.options })) }
                            : {}),
                        type: product.product_type || 'N/A',
                        tags: product.tags || [],
                    },
                    message: `Detalles del producto "${product.title}".`,
                });
            }

            case 'check_inventory': {
                const inventory = isShopify
                    ? await shopifyCheckInventory(config, str('product_id'))
                    : await wooCheckInventory(config, str('product_id'));

                let variants = inventory.variants;

                if (str('variant_name')) {
                    const lower = str('variant_name').toLowerCase();
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

            case 'get_payment_methods': {
                const methods = isShopify
                    ? await shopifyGetPaymentMethods(config)
                    : await wooGetPaymentMethods(config);

                if (methods.length === 0) {
                    return JSON.stringify({
                        methods: [],
                        message: 'No hay métodos de pago habilitados en la tienda.',
                    });
                }

                return JSON.stringify({
                    methods: methods.map((m) => ({
                        id: m.id,
                        name: m.title,
                        description: m.description,
                    })),
                    message: `${methods.length} método(s) de pago disponible(s).`,
                });
            }

            case 'create_order': {
                // args.items comes already parsed from OpenAI function calling
                const rawItems = args.items;
                const orderItems: OrderItem[] = Array.isArray(rawItems)
                    ? rawItems as unknown as OrderItem[]
                    : typeof rawItems === 'string'
                        ? JSON.parse(rawItems) as OrderItem[]
                        : [];

                if (orderItems.length === 0) {
                    return JSON.stringify({ error: 'Se necesita al menos un producto para crear el pedido.' });
                }

                const result = isShopify
                    ? await shopifyCreateOrder(config, str('customer_name'), str('customer_email') || undefined, str('customer_phone') || undefined, orderItems)
                    : await wooCreateOrder(config, str('customer_name'), str('customer_email') || undefined, str('customer_phone') || undefined, orderItems);

                return JSON.stringify({
                    order: {
                        id: result.order_id,
                        number: result.order_number,
                        total: `$${result.total} ${result.currency}`,
                        status: result.status,
                        payment_url: result.payment_url,
                    },
                    message: `Pedido #${result.order_number} creado exitosamente. Total: $${result.total} ${result.currency}. Envíale al cliente el link de pago para que complete su compra.`,
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
