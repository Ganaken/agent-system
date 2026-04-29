export interface ImportResult {
    landlords: number;
    properties: number;
    tenants: number;
    cheques: number;
    errors: string[];
}
export declare function importExcelBuffer(buffer: Buffer): ImportResult;
//# sourceMappingURL=excel-import.d.ts.map