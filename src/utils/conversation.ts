import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), process.env.DATA_DIR || './data');
const CONVERSATIONS_PATH = path.join(DATA_DIR, 'conversations.json');
const MAX_MESSAGES = 15;
const EXPIRY_MS = 24 * 60 * 60 * 1000;

interface ConversationEntry {
  lastActivity: number;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

type ConversationStore = Record<string, ConversationEntry>;

function loadStore(): ConversationStore {
  if (!fs.existsSync(CONVERSATIONS_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(CONVERSATIONS_PATH, 'utf-8')) as ConversationStore;
  } catch {
    return {};
  }
}

function saveStore(store: ConversationStore): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(CONVERSATIONS_PATH, JSON.stringify(store, null, 2), 'utf-8');
}

export function loadHistory(phone: string): Array<{ role: 'user' | 'assistant'; content: string }> {
  const store = loadStore();
  const entry = store[phone];
  if (!entry || Date.now() - entry.lastActivity > EXPIRY_MS) return [];
  return entry.messages;
}

export function saveHistory(phone: string, userMessage: string, assistantMessage: string): void {
  const store = loadStore();
  const existing = store[phone];
  const now = Date.now();

  const prior: Array<{ role: 'user' | 'assistant'; content: string }> =
    existing && now - existing.lastActivity <= EXPIRY_MS ? [...existing.messages] : [];

  prior.push({ role: 'user', content: userMessage });
  prior.push({ role: 'assistant', content: assistantMessage });

  // Keep last MAX_MESSAGES, always starting with a user turn
  let trimmed = prior.slice(-MAX_MESSAGES);
  while (trimmed.length > 0 && trimmed[0].role === 'assistant') trimmed = trimmed.slice(1);

  store[phone] = { lastActivity: now, messages: trimmed };
  saveStore(store);
}

export function cleanExpiredConversations(): void {
  const store = loadStore();
  const now = Date.now();
  let changed = false;
  for (const key of Object.keys(store)) {
    if (now - store[key].lastActivity > EXPIRY_MS) {
      delete store[key];
      changed = true;
    }
  }
  if (changed) saveStore(store);
}
