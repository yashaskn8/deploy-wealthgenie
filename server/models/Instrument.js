import mongoose from 'mongoose';

const instrumentSchema = new mongoose.Schema({
  // ─── Core Identity ───────────────────────────────────────────────
  id: { type: String, unique: true, sparse: true },
  name: { type: String, required: true },
  abbr: String,
  type: { type: String, required: true },       // e.g. 'FD', 'Mutual_Fund', 'ETF', 'Government', 'ELSS', 'REIT', 'Bond', etc.
  category: String,                              // e.g. 'Public Bank', 'Equity', 'G-Sec'
  cat: String,                                   // Backward compatibility alias for category
  subCategory: String,
  assetClass: String,                            // e.g. 'Sovereign', 'Equity', 'Debt', 'Gold'
  provider: String,

  // ─── Return & Risk Metadata ──────────────────────────────────────
  expectedReturn: Number,                        // Expected annual return (%)
  rate: Number,                                  // Backward compatibility alias
  returnRange: {
    min: { type: Number },
    max: { type: Number },
  },
  interestRate: Number,                          // Legacy: FD/govt instrument rate
  interestRateSenior: Number,
  returns1yr: Number,
  returns3yr: Number,
  returns5yr: Number,
  riskLevel: { type: mongoose.Schema.Types.Mixed }, // String ('Very Low'..'Very High') or Number (1-5)
  risk: Number,                                  // Numeric risk level (1-5)
  riskLabel: String,                             // e.g. 'Very Low', 'High'
  volatility: Number,                            // Annualised volatility (decimal, e.g. 0.18)

  // ─── Liquidity & Lock-in ─────────────────────────────────────────
  liquidityScore: Number,                        // 1 (locked) to 5 (instant)
  lockIn: { type: Number, default: 0 },          // Lock-in period in years
  lockInYears: { type: Number, default: 0 },     // Legacy alias

  // ─── Tax & Cost ──────────────────────────────────────────────────
  taxType: String,                               // e.g. 'eee', 'slab', 'ltcg', 'elss', 'nps', 'sgb'
  taxEfficiencyScore: Number,                    // 1 (worst) to 5 (best/EEE)
  taxation: String,                              // Legacy descriptive tax string
  expenseRatio: { type: Number, default: 0 },

  // ─── Investment Limits ───────────────────────────────────────────
  minMonthlyInvestment: Number,
  maxAnnualInvestment: Number,
  minInvestment: Number,                         // Legacy minimum

  // ─── Horizon & Goal Alignment ────────────────────────────────────
  idealHorizon: {
    min: { type: Number },
    max: { type: Number },
  },
  goalTags: [String],                            // e.g. ['Retirement', 'Tax Saving', 'Wealth Growth']
  maturityYears: Number,

  // ─── Eligibility ─────────────────────────────────────────────────
  eligibility: {
    minAge: Number,
    maxAge: Number,
    minAnnualIncome: Number,
    minMonthlySavings: Number,
    requiresDemat: Boolean,
    hasGirlChild: Boolean,
    requires_daughter_under_10: Boolean,
    notes: String,
  },

  // ─── Market Data (ETFs / Mutual Funds) ───────────────────────────
  nav: Number,
  aumCr: Number,
  exitLoad: String,
  sebiRating: String,
  trackingError: Number,
  underlyingIndex: String,
  exchange: String,

  // ─── Issuer & Guarantee ──────────────────────────────────────────
  issuer: String,
  sovereignGuarantee: { type: Boolean, default: false },
  tdsApplicable: { type: Boolean, default: false },
  prematureWithdrawalPenalty: String,

  // ─── Display ─────────────────────────────────────────────────────
  color: String,
  desc: String,

  // ─── Timestamps ──────────────────────────────────────────────────
  createdAt: { type: Date, default: Date.now },
});

instrumentSchema.index({ type: 1, expectedReturn: -1 });
instrumentSchema.index({ type: 1, interestRate: -1 });
instrumentSchema.index({ name: 1 });

export default mongoose.model('Instrument', instrumentSchema);
