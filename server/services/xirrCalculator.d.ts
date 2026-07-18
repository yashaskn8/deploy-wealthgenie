/**
 * WealthGenie XIRR Calculator — Newton-Raphson Implementation
 */
export interface CashFlow {
    amount: number;
    date: Date;
}
export interface CashFlowInput {
    amount: number | string;
    date: Date | string;
}
export interface XirrResult {
    rate: number;
    converged: boolean;
    iterations: number;
    npvResidual: number;
    annualizedReturn: string;
    error?: string;
    warning?: string;
}
/**
 * Compute XIRR using Newton-Raphson iteration.
 */
export declare function computeXIRR(cashflows: CashFlowInput[], guess?: number, tolerance?: number, maxIterations?: number): XirrResult;
/**
 * Compute XIRR for a SIP investment.
 */
export declare function computeSIPXIRR(monthlySIP: number, months: number, currentValue: number, startDate?: Date): XirrResult;
