import { supabase } from '../supabase';
import type { Building, Unit, Tenant, Cheque } from '../types';

export function daysUntil(dateStr: string): number {
  if (!dateStr) return Infinity;
  const now = new Date();
  const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return Infinity;
  const [y, m, d] = parts;
  const targetUTC = Date.UTC(y, m - 1, d);
  return Math.round((targetUTC - todayUTC) / 86_400_000);
}

export function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

export async function getBuildings(): Promise<Building[]> {
  const { data, error } = await supabase.from('buildings').select('*').order('name', { ascending: true });
  if (error) { console.error('[DB] buildings:', error.message); return []; }
  return data ?? [];
}

export async function getUnits(): Promise<Unit[]> {
  const { data, error } = await supabase.from('units').select('*').order('building_name', { ascending: true });
  if (error) { console.error('[DB] units:', error.message); return []; }
  return data ?? [];
}

export async function getTenants(): Promise<Tenant[]> {
  const { data, error } = await supabase.from('tenants').select('*').order('full_name', { ascending: true });
  if (error) { console.error('[DB] tenants:', error.message); return []; }
  return data ?? [];
}

export async function getCheques(): Promise<Cheque[]> {
  const { data, error } = await supabase.from('cheques').select('*').order('due_date', { ascending: true });
  if (error) { console.error('[DB] cheques:', error.message); return []; }
  return data ?? [];
}

export async function allData() {
  const [buildings, units, tenants, cheques] = await Promise.all([
    getBuildings(),
    getUnits(),
    getTenants(),
    getCheques(),
  ]);
  return { buildings, units, tenants, cheques };
}
