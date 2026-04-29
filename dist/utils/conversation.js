"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadHistory = loadHistory;
exports.saveHistory = saveHistory;
exports.cleanExpiredConversations = cleanExpiredConversations;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const DATA_DIR = path_1.default.resolve(process.cwd(), process.env.DATA_DIR || './data');
const CONVERSATIONS_PATH = path_1.default.join(DATA_DIR, 'conversations.json');
const MAX_MESSAGES = 15;
const EXPIRY_MS = 24 * 60 * 60 * 1000;
function loadStore() {
    if (!fs_1.default.existsSync(CONVERSATIONS_PATH))
        return {};
    try {
        return JSON.parse(fs_1.default.readFileSync(CONVERSATIONS_PATH, 'utf-8'));
    }
    catch {
        return {};
    }
}
function saveStore(store) {
    if (!fs_1.default.existsSync(DATA_DIR))
        fs_1.default.mkdirSync(DATA_DIR, { recursive: true });
    fs_1.default.writeFileSync(CONVERSATIONS_PATH, JSON.stringify(store, null, 2), 'utf-8');
}
function loadHistory(phone) {
    const store = loadStore();
    const entry = store[phone];
    if (!entry || Date.now() - entry.lastActivity > EXPIRY_MS)
        return [];
    return entry.messages;
}
function saveHistory(phone, userMessage, assistantMessage) {
    const store = loadStore();
    const existing = store[phone];
    const now = Date.now();
    const prior = existing && now - existing.lastActivity <= EXPIRY_MS ? [...existing.messages] : [];
    prior.push({ role: 'user', content: userMessage });
    prior.push({ role: 'assistant', content: assistantMessage });
    // Keep last MAX_MESSAGES, always starting with a user turn
    let trimmed = prior.slice(-MAX_MESSAGES);
    while (trimmed.length > 0 && trimmed[0].role === 'assistant')
        trimmed = trimmed.slice(1);
    store[phone] = { lastActivity: now, messages: trimmed };
    saveStore(store);
}
function cleanExpiredConversations() {
    const store = loadStore();
    const now = Date.now();
    let changed = false;
    for (const key of Object.keys(store)) {
        if (now - store[key].lastActivity > EXPIRY_MS) {
            delete store[key];
            changed = true;
        }
    }
    if (changed)
        saveStore(store);
}
//# sourceMappingURL=conversation.js.map