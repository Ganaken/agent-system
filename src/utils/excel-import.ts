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

// Case-insensitive, whitespace-tolerant field lookup
function findVal(row: Record<string, unknown>, field: string): unknown {
  const needle = field.toLowerCase().replace(/[\s_]/g, '');
  for (const key of Object.keys(row)) {
    if (key.toLowerCase().replace(/[\s_]/g, '') === needle) return row[key];
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
    // Excel stores dates as days since 1900-01-01 (25569 days before Unix epoch)
    const ms = (val - 25569) * 86400 * 1000;
    return new Date(ms).toISOString().split('T')[0];
  }
  if (typeof val === 'string' && val.trim()) {
    const d = new Date(val.trim());
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return val.trim();
  }
  return '';
}

function getRows(workbook: XLSX.WorkBook, sheetName: string): Record<string, unknown>[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
  return rows.filter(r => Object.values(r).some(v => v !== null && v !== undefined && v !== ''));
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

  // ── Landlords ──────────────────────────────────────────────────────────────
  const landlordSheet = resolveSheetName(workbook, 'Landlords');
  if (landlordSheet) {
    const rows = getRows(workbook, landlordSheet);
    const data: Landlord[] = rows
      .filter(r => str(r, 'name'))
      .map(r => ({
        id: uuidv4(),
        name: str(r, 'name'),
        relationship: str(r, 'relationship'),
        email: str(r, 'email'),
        whatsapp: str(r, 'whatsapp'),
        emiratesId: str(r, 'emiratesId'),
      }));
    writeJSON('landlords.json', data);
    landlordCount = data.length;
  } else {
    errors.push('Sheet "Landlords" not found');
  }

  // ── Properties ─────────────────────────────────────────────────────────────
  const propertySheet = resolveSheetName(workbook, 'Properties');
  if (propertySheet) {
    const rows = getRows(workbook, propertySheet);
    const data: ImportedProperty[] = rows
      .filter(r => str(r, 'buildingName') || str(r, 'unitNumber'))
      .map(r => ({
        id: uuidv4(),
        buildingName: str(r, 'buildingName'),
        unitNumber: str(r, 'unitNumber'),
        area: str(r, 'area'),
        type: str(r, 'type'),
        landlordName: str(r, 'landlordName'),
        serviceCharge: num(r, 'serviceCharge'),
        notes: str(r, 'notes'),
      }));
    writeJSON('properties.json', data);
    propertyCount = data.length;
  } else {
    errors.push('Sheet "Properties" not found');
  }

  // ── Tenants ────────────────────────────────────────────────────────────────
  const tenantSheet = resolveSheetName(workbook, 'Tenants');
  if (tenantSheet) {
    const rows = getRows(workbook, tenantSheet);
    const data: ImportedTenant[] = rows
      .filter(r => str(r, 'name'))
      .map(r => ({
        id: uuidv4(),
        name: str(r, 'name'),
        email: str(r, 'email'),
        whatsapp: str(r, 'whatsapp'),
        property: str(r, 'property'),
        landlordName: str(r, 'landlordName'),
        contractStart: dateStr(r, 'contractStart'),
        contractEnd: dateStr(r, 'contractEnd'),
        annualRent: num(r, 'annualRent'),
        numberOfCheques: Math.round(num(r, 'numberOfCheques')),
        emiratesId: str(r, 'emiratesId'),
        notes: str(r, 'notes'),
      }));
    writeJSON('tenants.json', data);
    tenantCount = data.length;
  } else {
    errors.push('Sheet "Tenants" not found');
  }

  // ── Cheques ────────────────────────────────────────────────────────────────
  const chequeSheet = resolveSheetName(workbook, 'Cheques');
  if (chequeSheet) {
    const rows = getRows(workbook, chequeSheet);
    const data: ImportedCheque[] = rows
      .filter(r => str(r, 'tenantName') && num(r, 'amount') > 0)
      .map(r => ({
        id: uuidv4(),
        tenantName: str(r, 'tenantName'),
        property: str(r, 'property'),
        amount: num(r, 'amount'),
        dueDate: dateStr(r, 'dueDate'),
      }));
    writeJSON('cheques.json', data);
    chequeCount = data.length;
  } else {
    errors.push('Sheet "Cheques" not found');
  }

  return { landlords: landlordCount, properties: propertyCount, tenants: tenantCount, cheques: chequeCount, errors };
}
