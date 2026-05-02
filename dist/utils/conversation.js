"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadHistory = loadHistory;
exports.saveHistory = saveHistory;
exports.cleanExpiredConversations = cleanExpiredConversations;
const supabase_1 = require("../supabase");
const crypto_1 = require("crypto");
const MAX_MESSAGES = 15;
const EXPIRY_MS = 24 * 60 * 60 * 1000;
async function loadHistory(phone) {
    const { data } = await supabase_1.supabase
        .from('conversations')
        .select('messages, updated_at')
        .eq('phone', phone)
        .maybeSingle();
    if (!data)
        return [];
    const updatedAt = new Date(data.updated_at).getTime();
    if (Date.now() - updatedAt > EXPIRY_MS)
        return [];
    return data.messages ?? [];
}
async function saveHistory(phone, userMessage, assistantMessage) {
    const { data: existing } = await supabase_1.supabase
        .from('conversations')
        .select('id, messages, updated_at')
        .eq('phone', phone)
        .maybeSingle();
    const now = Date.now();
    let prior = [];
    if (existing) {
        const updatedAt = new Date(existing.updated_at).getTime();
        if (now - updatedAt <= EXPIRY_MS) {
            prior = existing.messages ?? [];
        }
    }
    prior.push({ role: 'user', content: userMessage });
    prior.push({ role: 'assistant', content: assistantMessage });
    let trimmed = prior.slice(-MAX_MESSAGES);
    while (trimmed.length > 0 && trimmed[0].role === 'assistant')
        trimmed = trimmed.slice(1);
    const nowIso = new Date(now).toISOString();
    if (existing) {
        await supabase_1.supabase.from('conversations')
            .update({ messages: trimmed, updated_at: nowIso })
            .eq('phone', phone);
    }
    else {
        await supabase_1.supabase.from('conversations')
            .insert({ id: (0, crypto_1.randomUUID)(), phone, messages: trimmed, updated_at: nowIso });
    }
}
async function cleanExpiredConversations() {
    const cutoff = new Date(Date.now() - EXPIRY_MS).toISOString();
    await supabase_1.supabase.from('conversations').delete().lt('updated_at', cutoff);
}
//# sourceMappingURL=conversation.js.map