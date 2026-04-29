import fs from 'fs';
import path from 'path';
import type { Tenant, Property, Cheque, Contract, ServiceCharge } from '../types';

const DATA_DIR = path.resolve(process.cwd(), process.env.DATA_DIR || './data');

export function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function filePath(name: string): string {
  return path.join(DATA_DIR, name);
}

export function readJSON<T>(name: string): T[] {
  const p = filePath(name);
  if (!fs.existsSync(p)) {
    fs.writeFileSync(p, '[]', 'utf-8');
    return [];
  }
  return JSON.parse(fs.readFileSync(p, 'utf-8')) as T[];
}

export function writeJSON<T>(name: string, data: T[]): void {
  fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2), 'utf-8');
}

export const getTenants = () => readJSON<Tenant>('tenants.json');
export const saveTenants = (d: Tenant[]) => writeJSON('tenants.json', d);

export const getProperties = () => readJSON<Property>('properties.json');
export const saveProperties = (d: Property[]) => writeJSON('properties.json', d);

export const getCheques = () => readJSON<Cheque>('cheques.json');
export const saveCheques = (d: Cheque[]) => writeJSON('cheques.json', d);

export const getContracts = () => readJSON<Contract>('contracts.json');
export const saveContracts = (d: Contract[]) => writeJSON('contracts.json', d);

export const getServiceCharges = () => readJSON<ServiceCharge>('service-charges.json');
export const saveServiceCharges = (d: ServiceCharge[]) => writeJSON('service-charges.json', d);

export function daysUntil(dateStr: string): number {
  const now = new Date();
  const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const [y, m, d] = dateStr.split('-').map(Number);
  const targetUTC = Date.UTC(y, m - 1, d);
  return Math.round((targetUTC - todayUTC) / 86_400_000);
}

export function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

export function allData() {
  return {
    tenants: getTenants(),
    properties: getProperties(),
    cheques: getCheques(),
    contracts: getContracts(),
    serviceCharges: getServiceCharges(),
  };
}
