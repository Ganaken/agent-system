"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.daysUntil = daysUntil;
exports.addMonths = addMonths;
exports.getBuildings = getBuildings;
exports.getUnits = getUnits;
exports.getTenants = getTenants;
exports.getCheques = getCheques;
exports.allData = allData;
const supabase_1 = require("../supabase");
function daysUntil(dateStr) {
    if (!dateStr)
        return Infinity;
    const now = new Date();
    const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const parts = dateStr.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN))
        return Infinity;
    const [y, m, d] = parts;
    const targetUTC = Date.UTC(y, m - 1, d);
    return Math.round((targetUTC - todayUTC) / 86400000);
}
function addMonths(dateStr, months) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setMonth(d.getMonth() + months);
    return d.toISOString().split('T')[0];
}
async function getBuildings() {
    const { data, error } = await supabase_1.supabase.from('buildings').select('*');
    if (error) {
        console.error('[DB] buildings:', error.message);
        return [];
    }
    return data ?? [];
}
async function getUnits() {
    const { data, error } = await supabase_1.supabase.from('units').select('*');
    if (error) {
        console.error('[DB] units:', error.message);
        return [];
    }
    return data ?? [];
}
async function getTenants() {
    const { data, error } = await supabase_1.supabase.from('tenants').select('*');
    if (error) {
        console.error('[DB] tenants:', error.message);
        return [];
    }
    return data ?? [];
}
async function getCheques() {
    const { data, error } = await supabase_1.supabase.from('cheques').select('*');
    if (error) {
        console.error('[DB] cheques:', error.message);
        return [];
    }
    return data ?? [];
}
async function allData() {
    const [buildings, units, tenants, cheques] = await Promise.all([
        getBuildings(),
        getUnits(),
        getTenants(),
        getCheques(),
    ]);
    return { buildings, units, tenants, cheques };
}
//# sourceMappingURL=data.js.map