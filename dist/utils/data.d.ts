import type { Building, Unit, Tenant, Cheque } from '../types';
export declare function daysUntil(dateStr: string): number;
export declare function addMonths(dateStr: string, months: number): string;
export declare function getBuildings(): Promise<Building[]>;
export declare function getUnits(): Promise<Unit[]>;
export declare function getTenants(): Promise<Tenant[]>;
export declare function getCheques(): Promise<Cheque[]>;
export declare function allData(): Promise<{
    buildings: Building[];
    units: Unit[];
    tenants: Tenant[];
    cheques: Cheque[];
}>;
//# sourceMappingURL=data.d.ts.map