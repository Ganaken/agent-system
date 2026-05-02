"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.importExcelBuffer = importExcelBuffer;
const XLSX = __importStar(require("xlsx"));
const crypto_1 = require("crypto");
const supabase_1 = require("../supabase");
function normalize(s) {
    return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}
function findVal(row, field) {
    const needle = normalize(field);
    for (const key of Object.keys(row)) {
        if (normalize(key) === needle)
            return row[key];
    }
    return undefined;
}
function str(row, ...fields) {
    for (const f of fields) {
        const val = findVal(row, f);
        if (val !== null && val !== undefined && val !== '') {
            if (val instanceof Date)
                return val.toISOString().split('T')[0];
            return String(val).trim();
        }
    }
    return '';
}
function num(row, ...fields) {
    for (const f of fields) {
        const val = findVal(row, f);
        if (typeof val === 'number' && !isNaN(val))
            return val;
        if (val !== null && val !== undefined && val !== '') {
            const n = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
            if (!isNaN(n))
                return n;
        }
    }
    return 0;
}
function toISODate(val) {
    if (val instanceof Date) {
        return new Date(Date.UTC(val.getUTCFullYear(), val.getUTCMonth(), val.getUTCDate()))
            .toISOString().split('T')[0];
    }
    if (typeof val === 'number' && val > 0) {
        const d = new Date((val - 25569) * 86400 * 1000);
        return d.toISOString().split('T')[0];
    }
    if (typeof val === 'string' && val.trim()) {
        const s = val.trim();
        const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (dmy)
            return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
        const dmy2 = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
        if (dmy2)
            return `${dmy2[3]}-${dmy2[2].padStart(2, '0')}-${dmy2[1].padStart(2, '0')}`;
        const d = new Date(s);
        if (!isNaN(d.getTime()))
            return d.toISOString().split('T')[0];
    }
    return '';
}
function dateField(row, ...fields) {
    for (const f of fields) {
        const val = findVal(row, f);
        if (val !== null && val !== undefined && val !== '') {
            const d = toISODate(val);
            if (d)
                return d;
        }
    }
    return '';
}
function getRows(wb, sheetName) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet)
        return [];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    return rows.filter(r => Object.values(r).some(v => v !== '' && v !== null && v !== undefined));
}
function findSheet(wb, target) {
    if (wb.SheetNames.includes(target))
        return target;
    const t = target.toLowerCase().trim();
    return wb.SheetNames.find(s => s.toLowerCase().trim() === t);
}
async function importExcelBuffer(buffer) {
    const errors = [];
    // Delete all rows from data tables before import
    await Promise.all([
        supabase_1.supabase.from('buildings').delete().not('id', 'is', null),
        supabase_1.supabase.from('units').delete().not('id', 'is', null),
        supabase_1.supabase.from('tenants').delete().not('id', 'is', null),
        supabase_1.supabase.from('cheques').delete().not('id', 'is', null),
    ]);
    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    console.log('[EXCEL IMPORT] Sheets found:', wb.SheetNames);
    // ── Buildings ──────────────────────────────────────────────────────────────
    let buildingCount = 0;
    const buildingSheet = findSheet(wb, '🏢 Buildings');
    if (buildingSheet) {
        const rows = getRows(wb, buildingSheet);
        const data = rows
            .filter(r => str(r, 'Name', 'Building Name'))
            .map(r => ({
            id: (0, crypto_1.randomUUID)(),
            name: str(r, 'Name', 'Building Name'),
            location: str(r, 'Location'),
            total_units: Math.round(num(r, 'Total Units', 'Units')),
            type: str(r, 'Type'),
            developer: str(r, 'Developer'),
            notes: str(r, 'Notes'),
        }));
        if (data.length > 0) {
            const { error } = await supabase_1.supabase.from('buildings').insert(data);
            if (error)
                errors.push(`Buildings: ${error.message}`);
            else
                buildingCount = data.length;
        }
        console.log(`[EXCEL IMPORT] Buildings: ${buildingCount}`);
    }
    else {
        errors.push('Sheet "🏢 Buildings" not found');
    }
    // ── Units ──────────────────────────────────────────────────────────────────
    let unitCount = 0;
    const unitSheet = findSheet(wb, '🏠 Units');
    if (unitSheet) {
        const rows = getRows(wb, unitSheet);
        const data = rows
            .filter(r => str(r, 'Unit Number', 'Unit No') || str(r, 'Building Name'))
            .map(r => ({
            id: (0, crypto_1.randomUUID)(),
            building_name: str(r, 'Building Name', 'Building'),
            unit_number: str(r, 'Unit Number', 'Unit No', 'Unit'),
            type: str(r, 'Type'),
            area_sqm: num(r, 'Area (sqm)', 'Area sqm', 'Area'),
            floor: Math.round(num(r, 'Floor')),
            annual_rent: num(r, 'Annual Rent (AED)', 'Annual Rent', 'Rent'),
            service_charge: num(r, 'Service Charge (AED)', 'Service Charge', 'SC'),
            notes: str(r, 'Notes'),
        }));
        if (data.length > 0) {
            const { error } = await supabase_1.supabase.from('units').insert(data);
            if (error)
                errors.push(`Units: ${error.message}`);
            else
                unitCount = data.length;
        }
        console.log(`[EXCEL IMPORT] Units: ${unitCount}`);
    }
    else {
        errors.push('Sheet "🏠 Units" not found');
    }
    // ── Tenants ────────────────────────────────────────────────────────────────
    let tenantCount = 0;
    const tenantSheet = findSheet(wb, '👤 Tenants');
    if (tenantSheet) {
        const rows = getRows(wb, tenantSheet);
        const data = rows
            .filter(r => str(r, 'Full Name', 'Name'))
            .map(r => ({
            id: (0, crypto_1.randomUUID)(),
            full_name: str(r, 'Full Name', 'Name'),
            building_name: str(r, 'Building Name', 'Building'),
            unit_number: str(r, 'Unit Number', 'Unit No', 'Unit'),
            email: str(r, 'Email', 'Email Address'),
            phone: str(r, 'Phone', 'Phone Number', 'WhatsApp'),
            nationality: str(r, 'Nationality'),
            contract_start: dateField(r, 'Contract Start', 'Contract Start Date', 'Start Date'),
            contract_end: dateField(r, 'Contract End', 'Contract End Date', 'End Date'),
            number_of_cheques: Math.round(num(r, 'Number of Cheques', 'Cheques', 'No of Cheques')),
            notes: str(r, 'Notes'),
            status: str(r, 'Status') || 'active',
        }));
        if (data.length > 0) {
            const { error } = await supabase_1.supabase.from('tenants').insert(data);
            if (error)
                errors.push(`Tenants: ${error.message}`);
            else
                tenantCount = data.length;
        }
        console.log(`[EXCEL IMPORT] Tenants: ${tenantCount}`);
    }
    else {
        errors.push('Sheet "👤 Tenants" not found');
    }
    // ── Cheques ────────────────────────────────────────────────────────────────
    let chequeCount = 0;
    const chequeSheet = findSheet(wb, '🧾 Cheques');
    if (chequeSheet) {
        const rows = getRows(wb, chequeSheet);
        const data = rows
            .filter(r => str(r, 'Tenant Name', 'Tenant'))
            .map(r => ({
            id: (0, crypto_1.randomUUID)(),
            tenant_name: str(r, 'Tenant Name', 'Tenant'),
            building_name: str(r, 'Building Name', 'Building'),
            unit_number: str(r, 'Unit Number', 'Unit No', 'Unit'),
            amount: num(r, 'Amount (AED)', 'Cheque Amount (AED)', 'Amount', 'Cheque Amount'),
            due_date: dateField(r, 'Due Date', 'Date'),
            bank_name: str(r, 'Bank Name', 'Bank'),
            cheque_number: str(r, 'Cheque Number', 'Cheque No', 'Cheque #'),
            status: 'pending',
            reminder_sent_7: false,
            reminder_sent_1: false,
        }));
        if (data.length > 0) {
            const { error } = await supabase_1.supabase.from('cheques').insert(data);
            if (error)
                errors.push(`Cheques: ${error.message}`);
            else
                chequeCount = data.length;
        }
        console.log(`[EXCEL IMPORT] Cheques: ${chequeCount}`);
    }
    else {
        errors.push('Sheet "🧾 Cheques" not found');
    }
    // ── Owner Details (log only) ───────────────────────────────────────────────
    const ownerSheet = findSheet(wb, '⚙️ Your Details');
    if (ownerSheet) {
        const rows = getRows(wb, ownerSheet);
        console.log(`[EXCEL IMPORT] Owner details sheet found — ${rows.length} rows (not imported)`);
    }
    return { buildings: buildingCount, units: unitCount, tenants: tenantCount, cheques: chequeCount, errors };
}
//# sourceMappingURL=excel-import.js.map