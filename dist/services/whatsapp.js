"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendToNumber = sendToNumber;
exports.sendAlert = sendAlert;
const twilio_1 = __importDefault(require("twilio"));
function getClient() {
    return (0, twilio_1.default)(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}
async function sendToNumber(to, message) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM;
    if (!sid || !token || !from) {
        console.log(`[WHATSAPP SKIPPED — no credentials] To: ${to} | ${message.slice(0, 80)}`);
        return;
    }
    try {
        const client = getClient();
        await client.messages.create({ from, to, body: message });
        console.log(`[WHATSAPP SENT] To: ${to} | ${message.slice(0, 80)}`);
    }
    catch (err) {
        console.error('[WHATSAPP ERROR]', err instanceof Error ? err.message : err);
    }
}
async function sendAlert(message) {
    const to = process.env.MY_WHATSAPP;
    if (!to) {
        console.log(`[WHATSAPP SKIPPED — no MY_WHATSAPP] | ${message.slice(0, 80)}`);
        return;
    }
    await sendToNumber(to, message);
}
//# sourceMappingURL=whatsapp.js.map