import type { Cheque, Tenant, Unit } from '../types';
export declare function sendEmail(to: string, subject: string, html: string, type?: string): Promise<void>;
export declare function chequeEmail(cheque: Cheque, days: number): string;
export declare function tenantRenewalEmail(tenant: Tenant, days: number): string;
export declare function landlordContractEmail(tenant: Tenant, days: number, annualRent: number, reraInfo: string): string;
export declare function serviceChargeEmail(unit: Unit): string;
//# sourceMappingURL=email.d.ts.map