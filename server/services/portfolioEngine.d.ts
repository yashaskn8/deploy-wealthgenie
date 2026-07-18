/**
 * WealthGenie Portfolio Optimisation Engine
 * Mean-variance portfolio optimisation for Indian asset classes.
 */
export interface CovarianceMatrixResult {
    matrix: Float64Array[];
    assetKeys: string[];
}
export declare function buildCovarianceMatrix(assetKeys: string[]): CovarianceMatrixResult;
export interface OptimisationResult {
    strategy?: string;
    weights: Record<string, number>;
    expectedReturn: number;
    volatility: number;
    sharpe: number;
    riskContributions?: Record<string, number>;
}
export declare function solveMinVariance(assetKeys: string[], postTaxReturns: number[]): OptimisationResult;
export declare function solveMaxSharpe(assetKeys: string[], postTaxReturns: number[]): OptimisationResult;
export interface RiskParityResult {
    weights: Record<string, number>;
    riskContributions: Record<string, number>;
    volatility: number;
}
export declare function solveRiskParity(assetKeys: string[]): RiskParityResult;
export declare function optimisePortfolio(assetKeys: string[], postTaxReturns: number[], strategy?: 'min_variance' | 'max_sharpe' | 'risk_parity'): OptimisationResult;
export declare function resolveAssetKey(key: string): string;
export interface RebalanceAssetEntry {
    asset_class: string;
    name: string;
    risk_level: string;
    nominal_return: number;
    current_value: number;
    current_pct: number;
    target_pct: number;
    target_value: number;
    drift_pct: number;
    raw_correction: number;
    suggested_correction: number;
    action_type: 'hold' | 'buy' | 'sell';
    rebalance_recommended: boolean;
    estimated_transaction_cost: number;
    transaction_cost_rate: number;
}
export interface RebalanceResult {
    total_portfolio_value: number;
    drift_index: number;
    drift_severity: 'Low' | 'Moderate' | 'High';
    rebalance_recommended: boolean;
    total_estimated_transaction_cost: number;
    portfolio_tracking_error?: number;
    before_stats: {
        cagr: number;
        risk_score: number;
    };
    after_stats: {
        cagr: number;
        risk_score: number;
    };
    assets: RebalanceAssetEntry[];
}
export declare function computeRebalance(currentAllocation: Record<string, number>, targetAllocation: Record<string, number>, threshold?: number, partialRatio?: number, holdingMonths?: number): RebalanceResult;
