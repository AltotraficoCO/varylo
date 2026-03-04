import { getWompiConfig, getWompiBaseUrl, type WompiConfigData } from './wompi-config';

async function getConfig(): Promise<WompiConfigData> {
    const config = await getWompiConfig();
    if (!config) throw new Error('Wompi not configured');
    return config;
}

function baseUrl(config: WompiConfigData): string {
    return getWompiBaseUrl(config.isSandbox);
}

// ============ Card Tokenization ============

export async function tokenizeCard(cardData: {
    number: string;
    cvc: string;
    exp_month: string;
    exp_year: string;
    card_holder: string;
}) {
    const config = await getConfig();
    const res = await fetch(`${baseUrl(config)}/v1/tokens/cards`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.publicKey}`,
        },
        body: JSON.stringify(cardData),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.reason || 'Error tokenizing card');
    return json.data as {
        id: string;
        brand: string;
        name: string;
        last_four: string;
        exp_month: string;
        exp_year: string;
    };
}

// ============ Payment Sources ============

export async function createPaymentSource(
    customerEmail: string,
    token: string,
    acceptanceToken: string,
) {
    const config = await getConfig();
    const res = await fetch(`${baseUrl(config)}/v1/payment_sources`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.privateKey}`,
        },
        body: JSON.stringify({
            type: 'CARD',
            token,
            customer_email: customerEmail,
            acceptance_token: acceptanceToken,
        }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.reason || 'Error creating payment source');
    return json.data as {
        id: number;
        type: string;
        token: { brand: string; last_four: string; exp_month: string; exp_year: string };
        customer_email: string;
        status: string;
    };
}

// ============ Transactions ============

export async function createTransaction(params: {
    amountInCents: number;
    paymentSourceId: number | string;
    reference: string;
    customerEmail: string;
    currency?: string;
}) {
    const config = await getConfig();
    const res = await fetch(`${baseUrl(config)}/v1/transactions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.privateKey}`,
        },
        body: JSON.stringify({
            amount_in_cents: params.amountInCents,
            currency: params.currency || 'COP',
            payment_source_id: Number(params.paymentSourceId),
            reference: params.reference,
            customer_email: params.customerEmail,
            recurrent: true,
        }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.reason || 'Error creating transaction');
    return json.data as {
        id: string;
        status: string;
        amount_in_cents: number;
        reference: string;
        payment_source_id: number;
    };
}

export async function getTransaction(transactionId: string) {
    const config = await getConfig();
    const res = await fetch(`${baseUrl(config)}/v1/transactions/${transactionId}`, {
        headers: { Authorization: `Bearer ${config.privateKey}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.reason || 'Error getting transaction');
    return json.data as {
        id: string;
        status: string;
        amount_in_cents: number;
        reference: string;
        payment_source_id: number;
        status_message: string;
    };
}

// ============ Acceptance Token ============

export async function getAcceptanceToken() {
    const config = await getConfig();
    const res = await fetch(`${baseUrl(config)}/v1/merchants/${config.publicKey}`);
    const json = await res.json();
    if (!res.ok) throw new Error('Error getting acceptance token');
    return json.data.presigned_acceptance.acceptance_token as string;
}

// ============ Void Transaction ============

export async function voidTransaction(transactionId: string) {
    const config = await getConfig();
    const res = await fetch(`${baseUrl(config)}/v1/transactions/${transactionId}/void`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.privateKey}`,
        },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.reason || 'Error voiding transaction');
    return json.data;
}
