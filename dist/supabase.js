"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const url = process.env.SUPABASE_URL ?? '';
const key = process.env.SUPABASE_ANON_KEY ?? '';
if (!url || !key) {
    console.warn('[Supabase] SUPABASE_URL or SUPABASE_ANON_KEY not set — DB calls will fail');
}
exports.supabase = (0, supabase_js_1.createClient)(url, key);
//# sourceMappingURL=supabase.js.map