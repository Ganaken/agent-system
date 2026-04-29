export declare function loadHistory(phone: string): Array<{
    role: 'user' | 'assistant';
    content: string;
}>;
export declare function saveHistory(phone: string, userMessage: string, assistantMessage: string): void;
export declare function cleanExpiredConversations(): void;
//# sourceMappingURL=conversation.d.ts.map