import type { Cheque, Contract, ServiceCharge } from '../types';
export declare function sendEmail(to: string, subject: string, html: string, type?: string): Promise<void>;
export declare function chequeEmail(cheque: Cheque, days: number): string;
export declare function tenantRenewalEmail(contract: Contract, days: number): string;
export declare function landlordContractEmail(contract: Contract, days: number, reraInfo: string): string;
export declare function serviceChargeEmail(charge: ServiceCharge): string;
//# sourceMappingURL=email.d.ts.map