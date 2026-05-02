export interface Building {
  id: string;
  owner_id?: string;
  name: string;
  location: string;
  total_units: number;
  type: string;
  developer: string;
  notes: string;
}

export interface Unit {
  id: string;
  owner_id?: string;
  building_name: string;
  unit_number: string;
  type: string;
  area_sqm: number;
  floor: string;
  annual_rent: number;
  service_charge: number;
  purchase_price?: number;
  image_url?: string;
  notes: string;
  status: string;
}

export interface Tenant {
  id: string;
  owner_id?: string;
  full_name: string;
  building_name: string;
  unit_number: string;
  email: string;
  phone: string;
  nationality: string;
  id_number?: string;
  id_expiry?: string;
  rera_number?: string;
  ejari_number?: string;
  contract_start: string;
  contract_end: string;
  number_of_cheques: number;
  notes: string;
  status: string;
}

export interface Cheque {
  id: string;
  owner_id?: string;
  tenant_name: string;
  building_name: string;
  unit_number: string;
  amount: number;
  due_date: string;
  bank_name: string;
  cheque_number: string;
  image_url?: string;
  status: 'pending' | 'collected' | 'bounced' | 'cancelled';
  collected_at?: string;
  collected_by?: string;
  reminder_sent_7: boolean;
  reminder_sent_1: boolean;
  notes?: string;
}

export interface Document {
  id: string;
  owner_id?: string;
  type: string;
  tenant_id?: string;
  unit_id?: string;
  cheque_id?: string;
  file_name: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  uploaded_by?: string;
  notes?: string;
  created_at?: string;
}

export interface RenewalNotice {
  id: string;
  owner_id?: string;
  tenant_id?: string;
  sent_by?: string;
  rent_increase?: boolean;
  old_rent?: number;
  new_rent?: number;
  increase_percentage?: number;
  email_sent_to?: string;
  status: string;
  sent_at?: string;
  notes?: string;
}

export interface Notification {
  id: string;
  owner_id?: string;
  type: string;
  title: string;
  message?: string;
  related_id?: string;
  related_type?: string;
  channel: string;
  status: string;
  sent_to?: string;
  read_at?: string;
  created_at?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entity_id?: string;
  entity_name?: string;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  performed_by?: string;
  performed_by_name?: string;
  performed_via?: string;
  ip_address?: string;
  user_agent?: string;
  notes?: string;
  created_at?: string;
}
