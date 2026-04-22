'use client';

import { ChatbotStatusToggle } from './chatbot-status-toggle';
import { DeleteChatbotDialog } from './delete-chatbot-dialog';

interface Props {
    chatbotId: string;
    chatbotName: string;
    isActive: boolean;
}

export function ChatbotCardControls({ chatbotId, chatbotName, isActive }: Props) {
    return (
        <div
            className="absolute top-3 right-3 z-10 flex items-center gap-1"
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
            }}
        >
            <ChatbotStatusToggle id={chatbotId} initialStatus={isActive} />
            <DeleteChatbotDialog chatbotId={chatbotId} chatbotName={chatbotName} />
        </div>
    );
}
