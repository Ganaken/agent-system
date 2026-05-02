export interface Building {
  id: string;
  name: string;
  location: string;
  total_units: number;
  type: string;
  developer: string;
  notes: string;
}

export interface Unit {
  id: string;
  building_name: string;
  unit_number: string;
  type: string;
  area_sqm: number;
  floor: number;
  annual_rent: number;
  service_charge: number;
  notes: string;
}

export interface Tenant {
  id: string;
  full_name: string;
  building_name: string;
  unit_number: string;
  email: string;
  phone: string;
  nationality: string;
  contract_start: string;
  contract_end: string;
  number_of_cheques: number;
  notes: string;
  status: string;
}

export interface Cheque {
  id: string;
  tenant_name: string;
  building_name: string;
  unit_number: string;
  amount: number;
  due_date: string;
  bank_name: string;
  cheque_number: string;
  status: 'pending' | 'deposited' | 'bounced';
  reminder_sent_7: boolean;
  reminder_sent_1: boolean;
}
