export interface RERAResult {
    currentRent: number;
    maxIncreasePercent: number;
    maxIncrease: number;
    maxNewRent: number;
    rule: string;
    calculatorUrl: string;
}
export declare function calculateRentIncrease(currentRent: number, marketRent: number): RERAResult;
export declare function getRERAInfo(area: string, currentRent: number): Promise<string>;
//# sourceMappingURL=rera.d.ts.map