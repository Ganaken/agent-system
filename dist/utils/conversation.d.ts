type Message = {
    role: 'user' | 'assistant';
    content: string;
};
export declare function loadHistory(phone: string): Promise<Message[]>;
export declare function saveHistory(phone: string, userMessage: string, assistantMessage: string): Promise<void>;
export declare function cleanExpiredConversations(): Promise<void>;
export {};
//# sourceMappingURL=conversation.d.ts.map