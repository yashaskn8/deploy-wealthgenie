/**
 * WealthGenie Monte Carlo Simulation Engine
 * Runs N simulations with log-normally distributed returns (GBM)
 * to produce probabilistic wealth projections (percentile bands).
 */
/**
 * Helper to sample a single monthly log-normal multiplier (GBM).
 */
export declare function sampleLogNormalMonthly(annualMean: number, annualVol: number, zVal: number): number;
/**
 * Compute Sequence of Returns Risk.
 */
export declare function computeSequenceRisk(finalValues: number[], simulations: number, years: number, monthlyWithdrawal?: number): number;
export interface RiskMetricsResult {
    impliedVol: number;
    sharpeRatio: number;
}
/**
 * Compute implied annual volatility and Sharpe ratio proxy.
 */
export declare function computeRiskMetrics(p50Values: number[], p10Values: number[], years: number, riskFreeRate?: number, postTaxAnnualReturn?: number): RiskMetricsResult;
export interface MonteCarloParams {
    monthlyInvestment: number;
    postTaxAnnualReturn: number;
    annualVolatility: number;
    years: number;
    simulations?: number;
    inflationRate?: number;
    isRealTrack?: boolean;
    currentSavings?: number;
}
export interface MonteCarloResult {
    years_array: number[];
    p10: number[];
    p25: number[];
    p50: number[];
    p75: number[];
    p90: number[];
    mean: number[];
    p10_real?: number[];
    p25_real?: number[];
    p50_real?: number[];
    p75_real?: number[];
    p90_real?: number[];
    mean_real?: number[];
    standard_error?: number[];
    deterministic_fv?: number;
    control_correction?: number;
    finalValues?: number[];
    simulations_run: number;
    real?: MonteCarloResult | null;
    inflationRateUsed?: number;
    sequenceRisk?: number;
    riskMetrics?: RiskMetricsResult;
    variance_reduction?: string;
    sequence_of_returns_risk?: number;
    sharpe_ratio_sensitivity?: Record<string, number>;
    inflation_rate?: number;
}
/**
 * Run Monte Carlo simulation for SIP investment using GBM.
 */
export declare function runMonteCarlo({ monthlyInvestment, postTaxAnnualReturn, annualVolatility, years, simulations, inflationRate, isRealTrack, currentSavings, }: MonteCarloParams): MonteCarloResult;
/**
 * Compute the probability that a goal amount is reached.
 */
export declare function computeGoalProbability(terminalValues: number[], targetAmount: number): number;
export interface WilsonCIResult {
    lower: number;
    upper: number;
}
/**
 * Compute the Wilson score confidence interval for a binomial proportion.
 */
export declare function computeWilsonCI(p: number, n: number): WilsonCIResult;
export interface MonteCarloGoalParams extends MonteCarloParams {
    targetAmount?: number;
}
export interface MonteCarloGoalResult extends Omit<MonteCarloResult, 'finalValues'> {
    goal_probability: number | null;
    goal_probability_ci: WilsonCIResult | null;
    target_amount: number | null;
}
/**
 * Run a full Monte Carlo simulation and also compute goal probability.
 */
export declare function runMonteCarloWithGoal(params: MonteCarloGoalParams): MonteCarloGoalResult;
/**
 * Get default volatility parameters for an instrument type.
 */
export declare function getInstrumentVolatility(instrumentType: string, overrideMean?: number): {
    mean: number;
    stdDev: number;
};
/**
 * Reverse SIP formula — compute monthly SIP required to reach a target.
 */
export declare function reverseSIP(targetAmount: number, annualRate: number, years: number, currentSavings?: number): number;
