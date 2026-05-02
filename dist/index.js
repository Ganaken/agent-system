"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const scheduler_1 = require("./services/scheduler");
const tenants_1 = __importDefault(require("./routes/tenants"));
const properties_1 = __importDefault(require("./routes/properties"));
const cheques_1 = __importDefault(require("./routes/cheques"));
const contracts_1 = __importDefault(require("./routes/contracts"));
const service_charges_1 = __importDefault(require("./routes/service-charges"));
const chat_1 = __importDefault(require("./routes/chat"));
const rera_1 = __importDefault(require("./routes/rera"));
const whatsapp_1 = __importDefault(require("./routes/whatsapp"));
const notify_1 = __importDefault(require("./routes/notify"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: false }));
app.use('/api/tenants', tenants_1.default);
app.use('/api/properties', properties_1.default);
app.use('/api/cheques', cheques_1.default);
app.use('/api/contracts', contracts_1.default);
app.use('/api/service-charges', service_charges_1.default);
app.use('/api/chat', chat_1.default);
app.use('/api/rera', rera_1.default);
app.use('/api/whatsapp', whatsapp_1.default);
app.use('/api/notify', notify_1.default);
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        routes: [
            'GET  /api/tenants',
            'POST /api/tenants',
            'GET  /api/properties',
            'POST /api/properties',
            'GET  /api/cheques',
            'GET  /api/cheques/due',
            'POST /api/cheques',
            'PATCH /api/cheques/:id/status',
            'GET  /api/contracts',
            'GET  /api/contracts/expiring',
            'POST /api/contracts',
            'GET  /api/service-charges',
            'GET  /api/service-charges/due',
            'POST /api/service-charges',
            'POST /api/chat',
            'POST /api/rera/check',
            'POST /api/whatsapp/incoming',
            'POST /api/notify/cheques',
            'POST /api/notify/contracts',
            'POST /api/notify/service-charges',
        ],
    });
});
const PORT = parseInt(process.env.PORT || '3000', 10);
app.listen(PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════════╗');
    console.log('║   Dubai Landlord Management System  🏙️     ║');
    console.log(`║   Running on http://localhost:${PORT}          ║`);
    console.log('╚════════════════════════════════════════════╝');
    console.log('');
    console.log('  Storage: Supabase (permanent)');
    console.log('  API endpoints:');
    console.log('  GET  /api/cheques/due         — cheques due in 30 days');
    console.log('  GET  /api/contracts/expiring  — contracts expiring in 120 days');
    console.log('  GET  /api/service-charges/due — service charges due');
    console.log('  POST /api/chat                — ask in Arabic or English');
    console.log('  POST /api/rera/check          — RERA rent increase calculator');
    console.log('  POST /api/whatsapp/incoming   — Twilio WhatsApp chatbot webhook');
    console.log('  GET  /api/whatsapp/test-email — send a test email');
    console.log('  POST /api/notify/cheques      — WhatsApp alert: cheques due today / in 7 days');
    console.log('  POST /api/notify/contracts    — WhatsApp alert: contracts expiring in 120 days');
    console.log('  POST /api/notify/service-charges — WhatsApp alert: service charges due');
    console.log('  GET  /health                  — all routes');
    console.log('');
    console.log('  Env vars:');
    console.log(`  SUPABASE_URL: ${process.env.SUPABASE_URL ? '✓ set' : '✗ NOT SET'}`);
    console.log(`  SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? '✓ set' : '✗ NOT SET'}`);
    console.log(`  ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✓ set' : '✗ NOT SET'}`);
    console.log('');
    (0, scheduler_1.startScheduler)();
});
//# sourceMappingURL=index.js.map