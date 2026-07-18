/**
 * WealthGenie — Portfolio Validation Layer
 * Catches calculation errors before they reach the UI.
 */

export interface Instrument {
  name?: string;
  abbr?: string;
  monthly_allocation: number;
  projected_value?: number;
  [key: string]: unknown;
}

export interface ValidationResult {
  valid: boolean;
  warnings: string[];
}

export function validatePortfolio(
  instruments: Instrument[],
  totalSavings: number
): ValidationResult | null {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check 1: No negative weights
  instruments.forEach(inst => {
    const weight: number = inst.monthly_allocation / totalSavings;
    if (weight < 0) {
      errors.push(`CRITICAL: ${inst.name || inst.abbr} has negative weight (${(weight * 100).toFixed(1)}%). This is a calculation error.`);
    }
  });

  // Check 2: Weights sum to ~100%
  const totalAllocation: number = instruments.reduce((sum, i) => sum + (i.monthly_allocation || 0), 0);
  if (totalSavings > 0 && Math.abs(totalAllocation - totalSavings) > 1) {
    errors.push(`CRITICAL: Monthly SIPs total ₹${totalAllocation} but user savings is ₹${totalSavings}.`);
  }

  // Check 3: No negative SIPs
  instruments.forEach(inst => {
    if ((inst.monthly_allocation || 0) < 0) {
      errors.push(`CRITICAL: ${inst.name || inst.abbr} has negative monthly SIP (₹${inst.monthly_allocation}). Impossible value.`);
    }
  });

  // Check 4: No negative projections
  instruments.forEach(inst => {
    if ((inst.projected_value || 0) < 0) {
      errors.push(`CRITICAL: ${inst.name || inst.abbr} has negative projection (₹${inst.projected_value}).`);
    }
  });

  // Check 5: Warn if any single instrument >50% weight
  instruments.forEach(inst => {
    const weight: number = totalSavings > 0 ? inst.monthly_allocation / totalSavings : 0;
    if (weight > 0.5) {
      warnings.push(`WARNING: ${inst.name || inst.abbr} has ${(weight * 100).toFixed(1)}% allocation. This is highly concentrated.`);
    }
  });

  // Log in development
  errors.forEach(e => console.error('[Portfolio Validation]', e));
  warnings.forEach(w => console.warn('[Portfolio Validation]', w));

  if (errors.length > 0) {
    console.error(`[Portfolio] ${errors.length} validation errors. Returning null to trigger fallback.`);
    return null;
  }

  return { valid: true, warnings };
}
