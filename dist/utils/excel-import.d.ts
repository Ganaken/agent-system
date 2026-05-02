export interface ImportResult {
    buildings: number;
    units: number;
    tenants: number;
    cheques: number;
    errors: string[];
}
export declare function importExcelBuffer(buffer: Buffer): Promise<ImportResult>;
//# sourceMappingURL=excel-import.d.ts.map