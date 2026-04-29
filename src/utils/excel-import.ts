import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { writeJSON } from './data';
import type { Landlord } from '../types';

interface ImportedProperty {
  id: string;
  buildingName: string;
  unitNumber: string;
  area: string;
  type: string;
  landlordName: string;
  serviceCharge: number;
  notes: string;
}

interface ImportedTenant {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  property: string;
  landlordName: string;
  contractStart: string;
  contractEnd: string;
  annualRent: number;
  numberOfCheques: number;
  emiratesId: string;
  notes: string;
}

interface ImportedCheque {
  id: string;
  tenantName: string;
  property: string;
  amount: number;
  dueDate: string;
}

export interface ImportResult {
  landlords: number;
  properties: number;
  tenants: number;
  cheques: number;
  errors: string[];
}

// Normalize a key/field by lowercasing and stripping ALL non-alphanumeric characters
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Case-insensitive, punctuation-tolerant field lookup
function findVal(row: Record<string, unknown>, field: string): unknown {
  const needle = normalize(field);
  for (const key of Object.keys(row)) {
    if (normalize(key) === needle) return row[key];
  }
  return undefined;
}

function str(row: Record<string, unknown>, field: string): string {
  const val = findVal(row, field);
  if (val === null || val === undefined) return '';
  if (val instanceof Date) return val.toISOString().split('T')[0];
  return String(val).trim();
}

function num(row: Record<string, unknown>, field: string): number {
  const val = findVal(row, field);
  if (typeof val === 'number') return val;
  const n = parseFloat(String(val ?? '0').replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
}

function dateStr(row: Record<string, unknown>, field: string): string {
  const val = findVal(row, field);
  if (val instanceof Date) return val.toISOString().split('T')[0];
  if (typeof val === 'number' && val > 0) {
    // Excel serial date: days since 1900-01-01 (25569 days before Unix epoch)
    const ms = (val - 25569) * 86400 * 1000;
    return new Date(ms).toISOString().split('T')[0];
  }
  if (typeof val === 'string' && val.trim()) {
    const s = val.trim();
    // DD/MM/YYYY
    const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmy) {
      const [, dd, mm, yyyy] = dmy;
      return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
    }
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return s;
  }
  return '';
}

// Reads a vertically-structured sheet:
//   Row 1  = title (skip)
//   Row 2  = headers: "Field", "Record 1", "Record 2", ...
//   Row 3+ = data: col A = field name, col B/C/D... = values per record
// Returns one object per record column, with field names as keys.
function getRows(workbook: XLSX.WorkBook, sheetName: string): Record<string, unknown>[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];

  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];

  // Need at least title row + header row + 1 data row
  if (raw.length < 3) return [];

  // raw[0] = title row (skip), raw[1] = header row, raw[2+] = data rows
  const dataRows = raw.slice(2);

  // Determine number of record columns from the widest data row
  const numCols = Math.max(...dataRows.map(r => (r as unknown[]).length));

  const records: Record<string, unknown>[] = [];

  for (let col = 1; col < numCols; col++) {
    const record: Record<string, unknown> = {};
    for (const row of dataRows) {
      const fieldName = String((row as unknown[])[0] ?? '').trim();
      if (fieldName) {
        record[fieldName] = (row as unknown[])[col] ?? '';
      }
    }
    records.push(record);
  }

  return records;
}

function resolveSheetName(workbook: XLSX.WorkBook, target: string): string | undefined {
  return workbook.SheetNames.find(s => s.trim().toLowerCase() === target.toLowerCase());
}

export function importExcelBuffer(buffer: Buffer): ImportResult {
  const errors: string[] = [];
  let landlordCount = 0;
  let propertyCount = 0;
  let tenantCount = 0;
  let chequeCount = 0;

  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

  console.log('[EXCEL IMPORT] Sheets found:', workbook.SheetNames);

  for (const sheetName of workbook.SheetNames) {
    const rows = getRows(workbook, sheetName);
    console.log(`[EXCEL IMPORT] Sheet "${sheetName}": ${rows.length} record columns`);
    if (rows.length > 0) {
      console.log(`[EXCEL IMPORT] Sheet "${sheetName}" fields:`, Object.keys(rows[0]));
      console.log(`[EXCEL IMPORT] Sheet "${sheetName}" first record:`, JSON.stringify(rows[0]));
    }
  }

  // ── Landlords ──────────────────────────────────────────────────────────────
  // Expected columns: Full Name, Relationship, Email Address, WhatsApp Number, Emirates ID / Passport No.
  const landlordSheet = resolveSheetName(workbook, 'Landlords');
  if (landlordSheet) {
    const rows = getRows(workbook, landlordSheet);
    const data: Landlord[] = rows
      .filter(r => str(r, 'Full Name'))
      .map(r => ({
        id: uuidv4(),
        name: str(r, 'Full Name'),
        relationship: str(r, 'Relationship'),
        email: str(r, 'Email Address'),
        whatsapp: str(r, 'WhatsApp Number'),
        emiratesId: str(r, 'Emirates ID / Passport No.'),
      }));
    writeJSON('landlords.json', data);
    landlordCount = data.length;
    console.log(`[EXCEL IMPORT] Landlords imported: ${landlordCount}`);
  } else {
    errors.push('Sheet "Landlords" not found');
  }

  // ── Properties ─────────────────────────────────────────────────────────────
  // Expected columns: Building Name, Unit Number, Area / Location, Type, Landlord Name, Service Charge (AED/year), Notes
  const propertySheet = resolveSheetName(workbook, 'Properties');
  if (propertySheet) {
    const rows = getRows(workbook, propertySheet);
    const data: ImportedProperty[] = rows
      .filter(r => str(r, 'Building Name') || str(r, 'Unit Number'))
      .map(r => ({
        id: uuidv4(),
        buildingName: str(r, 'Building Name'),
        unitNumber: str(r, 'Unit Number'),
        area: str(r, 'Area / Location'),
        type: str(r, 'Type'),
        landlordName: str(r, 'Landlord Name'),
        serviceCharge: num(r, 'Service Charge (AED/year)'),
        notes: str(r, 'Notes'),
      }));
    writeJSON('properties.json', data);
    propertyCount = data.length;
    console.log(`[EXCEL IMPORT] Properties imported: ${propertyCount}`);
  } else {
    errors.push('Sheet "Properties" not found');
  }

  // ── Tenants ────────────────────────────────────────────────────────────────
  // Expected columns: Full Name, Email Address, WhatsApp Number, Property / Unit, Landlord Name,
  //   Contract Start (DD/MM/YYYY), Contract End (DD/MM/YYYY), Annual Rent (AED), Number of Cheques, Emirates ID, Notes
  const tenantSheet = resolveSheetName(workbook, 'Tenants');
  if (tenantSheet) {
    const rows = getRows(workbook, tenantSheet);
    const data: ImportedTenant[] = rows
      .filter(r => str(r, 'Full Name'))
      .map(r => ({
        id: uuidv4(),
        name: str(r, 'Full Name'),
        email: str(r, 'Email Address'),
        whatsapp: str(r, 'WhatsApp Number'),
        property: str(r, 'Property / Unit'),
        landlordName: str(r, 'Landlord Name'),
        contractStart: dateStr(r, 'Contract Start (DD/MM/YYYY)'),
        contractEnd: dateStr(r, 'Contract End (DD/MM/YYYY)'),
        annualRent: num(r, 'Annual Rent (AED)'),
        numberOfCheques: Math.round(num(r, 'Number of Cheques')),
        emiratesId: str(r, 'Emirates ID'),
        notes: str(r, 'Notes'),
      }));
    writeJSON('tenants.json', data);
    tenantCount = data.length;
    console.log(`[EXCEL IMPORT] Tenants imported: ${tenantCount}`);
  } else {
    errors.push('Sheet "Tenants" not found');
  }

  // ── Cheques ────────────────────────────────────────────────────────────────
  // Expected columns: #, Tenant Name, Property / Unit, Amount (AED), Due Date (DD/MM/YYYY)
  const chequeSheet = resolveSheetName(workbook, 'Cheques');
  if (chequeSheet) {
    const rows = getRows(workbook, chequeSheet);
    const data: ImportedCheque[] = rows
      .filter(r => str(r, 'Tenant Name') && num(r, 'Amount (AED)') > 0)
      .map(r => ({
        id: uuidv4(),
        tenantName: str(r, 'Tenant Name'),
        property: str(r, 'Property / Unit'),
        amount: num(r, 'Amount (AED)'),
        dueDate: dateStr(r, 'Due Date (DD/MM/YYYY)'),
      }));
    writeJSON('cheques.json', data);
    chequeCount = data.length;
    console.log(`[EXCEL IMPORT] Cheques imported: ${chequeCount}`);
  } else {
    errors.push('Sheet "Cheques" not found');
  }

  return { landlords: landlordCount, properties: propertyCount, tenants: tenantCount, cheques: chequeCount, errors };
}
