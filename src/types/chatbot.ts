export interface ChatbotFlowOption {
    label: string;
    match: string[];
    nextNodeId: string;
}

export interface ChatbotFlowAction {
    type: 'transfer_to_human' | 'transfer_to_ai_agent' | 'end_conversation' | 'send_to_webhook';
}

export interface ChatbotDataCapture {
    fieldName: string;    // e.g. "nombre", "cedula", "email"
    fieldLabel: string;   // Display label e.g. "Nombre completo"
    nextNodeId: string;   // Where to go after capturing
    validation?: 'text' | 'email' | 'phone' | 'number' | 'document'; // Optional validation
}

export interface ChatbotFlowNode {
    id: string;
    message: string;
    options?: ChatbotFlowOption[];
    action?: ChatbotFlowAction;
    dataCapture?: ChatbotDataCapture;
}

export interface WebhookConfig {
    url: string;          // ERP endpoint URL
    secret?: string;      // HMAC secret for signing payloads
    headers?: Record<string, string>; // Custom headers (e.g. API key)
}

export interface ChatbotFlow {
    startNodeId: string;
    nodes: Record<string, ChatbotFlowNode>;
    webhookConfig?: WebhookConfig;
}
