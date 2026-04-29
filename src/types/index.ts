export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  unitId: string;
  nationality?: string;
}

export interface Property {
  id: string;
  name: string;
  unit: string;
  building: string;
  area: string;
  address: string;
  propertyType: 'apartment' | 'villa' | 'office';
}

export interface Cheque {
  id: string;
  tenantId: string;
  tenantName: string;
  unit: string;
  propertyId: string;
  amount: number;
  chequeNumber: string;
  bankName: string;
  chequeDate: string;
  status: 'pending' | 'deposited' | 'bounced';
  reminderSent30?: boolean;
  reminderSent14?: boolean;
  reminderSent7?: boolean;
}

export interface Contract {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  unit: string;
  propertyId: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  status: 'active' | 'expired' | 'terminated';
  renewalEmailSent?: boolean;
}

export interface ServiceCharge {
  id: string;
  propertyId: string;
  propertyName: string;
  unit: string;
  amount: number;
  lastPaymentDate: string;
  nextDueDate: string;
  frequency: 'quarterly' | 'annual';
}
