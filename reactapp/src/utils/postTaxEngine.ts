/**
 * postTaxEngine.ts — Display Formatter for Post-Tax API Responses
 * ───────────────────────────────────────────────────────────────
 * ARCHITECTURE NOTE:
 * All post-tax return computation is performed EXCLUSIVELY by
 * server/services/postTaxCalculator.js. This module contains
 * ZERO slab-rate arrays and ZERO independent tax computation.
 *
 * The recommendation engine (recommendationEngine.js) provides
 * computePostTaxReturn() for client-side display using the same
 * tax-type logic as the backend. This module only formats those
 * results for the PostTaxAnalysis UI.
 */

export interface PostTaxApiResult {
  nominalRate?: number;
  nominalReturnRate?: number;
  postTaxReturn?: number;
  postTaxReturnRate?: number;
  taxType?: string;
  notes?: string | null;
}

export interface FormattedPostTaxResult {
  displayReturn: string;
  displayNominal: string;
  taxTypeLabel: string;
  taxImpact: number;
  taxImpactDisplay: string;
  notes: string | null;
}

/**
 * Formats a post-tax computation result for display.
 */
export function formatPostTaxResult(apiResult: PostTaxApiResult): FormattedPostTaxResult {
  const nominal: number = apiResult.nominalRate || apiResult.nominalReturnRate || 0;
  const postTax: number = apiResult.postTaxReturn || apiResult.postTaxReturnRate || 0;
  return {
    displayReturn: `${(postTax).toFixed(2)}%`,
    displayNominal: `${(nominal).toFixed(2)}%`,
    taxTypeLabel: apiResult.taxType || 'N/A',
    taxImpact: nominal - postTax,
    taxImpactDisplay: `-${((nominal - postTax)).toFixed(2)}%`,
    notes: apiResult.notes || null,
  };
}

/**
 * Compute real (inflation-adjusted) return using Fisher equation.
 * This is a pure mathematical identity, not a tax computation.
 * @param nominalRatePercent - e.g. 7.5
 * @param inflationRate - e.g. 0.06
 * @returns real return as percentage
 */
export function computeRealReturn(nominalRatePercent: number, inflationRate: number = 0.06): number {
  return (((1 + nominalRatePercent / 100) / (1 + inflationRate)) - 1) * 100;
}
