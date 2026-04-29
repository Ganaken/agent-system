import type { Tenant, Property, Cheque, Contract, ServiceCharge } from '../types';
export declare function ensureDataDir(): void;
export declare function readJSON<T>(name: string): T[];
export declare function writeJSON<T>(name: string, data: T[]): void;
export declare const getTenants: () => Tenant[];
export declare const saveTenants: (d: Tenant[]) => void;
export declare const getProperties: () => Property[];
export declare const saveProperties: (d: Property[]) => void;
export declare const getCheques: () => Cheque[];
export declare const saveCheques: (d: Cheque[]) => void;
export declare const getContracts: () => Contract[];
export declare const saveContracts: (d: Contract[]) => void;
export declare const getServiceCharges: () => ServiceCharge[];
export declare const saveServiceCharges: (d: ServiceCharge[]) => void;
export declare function daysUntil(dateStr: string): number;
export declare function addMonths(dateStr: string, months: number): string;
export declare function allData(): {
    tenants: Tenant[];
    properties: Property[];
    cheques: Cheque[];
    contracts: Contract[];
    serviceCharges: ServiceCharge[];
};
//# sourceMappingURL=data.d.ts.map