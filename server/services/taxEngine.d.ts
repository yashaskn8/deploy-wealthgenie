export interface Deductions {
    basicSalary?: number;
    isGovtEmployee?: boolean;
    nps80CCD2?: number;
    section80C?: number;
    nps80CCD1B?: number;
    section80CCD?: number;
    age?: number;
    self_senior?: boolean;
    parents_senior?: boolean;
    section80D_self?: number;
    section80D_parents?: number;
    section80D?: number;
    hra?: number;
    homeLoanInterest?: number;
    section80EEA?: number;
    other?: number;
    savingsInterest?: number;
    section80TTA?: number;
    section80TTB?: number;
}
export interface Slab {
    min: number;
    max: number;
    rate: number;
}
export interface SlabsForFY {
    verified: boolean;
    new: readonly Slab[];
    old: readonly Slab[];
}
export interface TaxResult {
    taxAmount: number;
    effectiveRate: number;
    regime: 'new' | 'old';
    rebateApplied: boolean;
    marginalReliefApplied: boolean;
    marginalReliefAmount: number;
    surchargeApplied: boolean;
    surchargeAmount: number;
    cess: number;
    taxBeforeCess: number;
    taxableIncome: number;
    annualIncome: number;
    standardDeduction: number;
    oldRegimeDeductions: number;
    nps80CCD2: number;
    allowed80D: number;
    fiscalYear: string;
}
export interface TaxRegimeComparison {
    newRegime: TaxResult;
    oldRegime: TaxResult;
    recommended: 'new' | 'old';
}
/**
 * Dynamically computes India's current fiscal year (April 1st to March 31st).
 * @returns {string} e.g. "FY2026-27"
 */
export declare function getCurrentFiscalYear(): string;
export declare const CURRENT_FY: string;
export declare const TAX_SLABS_BY_FY: Readonly<Record<string, SlabsForFY>>;
export declare function getTaxSlabsForFY(fiscalYear?: string): SlabsForFY;
/**
 * Check whether the tax slabs for a given fiscal year have been verified
 * against an official gazette/Union Budget source.
 */
export declare function isFYVerified(fiscalYear?: string): boolean;
export interface TaxableIncomeResult {
    standardDeduction: number;
    oldRegimeDeductions: number;
    taxableIncome: number;
    nps80CCD2: number;
    allowed80D: number;
}
/**
 * Helper to compute allowed standard and section-wise deductions and taxable income.
 */
export declare function calculateTaxableIncome(annualIncome: number, regime?: 'new' | 'old', deductions?: Deductions, incomeSource?: string): TaxableIncomeResult;
/**
 * Compute full tax breakdown for a given annual income.
 */
export declare function computeTax(annualIncome: number, regime?: 'new' | 'old', deductions?: Deductions, incomeSource?: string, fiscalYear?: string): TaxResult;
/**
 * Compute tax with deductions (convenience wrapper/alias).
 */
export declare function computeTaxWithDeductions(annualIncome: number, regime: 'new' | 'old', deductions?: Deductions, incomeSource?: string, fiscalYear?: string): TaxResult;
/**
 * Get the marginal (highest applicable) tax slab percentage.
 */
export declare function getTaxSlab(annualIncome: number, regime?: 'new' | 'old', deductions?: Deductions, incomeSource?: string, fiscalYear?: string): number;
/**
 * Compare both regimes and return the better one.
 */
export declare function compareTaxRegimes(annualIncome: number, deductions?: Deductions, incomeSource?: string, fiscalYear?: string): TaxRegimeComparison;
/**
 * Get the effective marginal tax rate (slab + surcharge + cess) for a given income level.
 * Useful for post-tax drag adjustments on future returns.
 */
export declare function getEffectiveMarginalRate(annualIncome: number, regime?: 'new' | 'old', deductions?: Deductions, incomeSource?: string, fiscalYear?: string): number;
