/**
 * patch_eligibility.mjs
 * ─────────────────────
 * One-time script to add eligibility rules to every instrument in
 * shared/investment_master.json. Rules are derived from:
 *   1. Indian financial regulations (SEBI, RBI, PFRDA, Income Tax Act)
 *   2. The recommendation engine's own filterEligible logic
 *   3. Backend test fixtures (recommendationPipeline.test.js)
 *
 * Run: node scripts/patch_eligibility.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const masterPath = resolve(__dirname, '..', 'shared', 'investment_master.json');
const catalog = JSON.parse(readFileSync(masterPath, 'utf8'));

// ─── Instrument-specific eligibility overrides ───────────────────
const ELIGIBILITY_MAP = {
  // ── Government / Sovereign ──
  ppf:        { minAge: 18, maxAge: null, minAnnualIncome: 0,       minMonthlySavings: 500,  notes: 'Any Indian resident with a valid PAN. One account per person.' },
  scss:       { minAge: 60, maxAge: null, minAnnualIncome: 0,       minMonthlySavings: 1000, notes: 'Only for senior citizens (60+). Retired defence/govt employees eligible at 55.' },
  sukanya:    { minAge: 18, maxAge: 40,   minAnnualIncome: 0,       minMonthlySavings: 250,  notes: 'Parent/guardian of a girl child below 10 years.', hasGirlChild: true },
  nps:        { minAge: 18, maxAge: 60,   minAnnualIncome: 0,       minMonthlySavings: 500,  notes: 'Any Indian citizen aged 18-60. NRI eligible under certain conditions.' },
  nsc:        { minAge: 18, maxAge: null, minAnnualIncome: 0,       minMonthlySavings: 100,  notes: 'Any Indian resident. Available at post offices.' },
  kvp:        { minAge: 18, maxAge: null, minAnnualIncome: 0,       minMonthlySavings: 1000, notes: 'Any Indian resident. KYC mandatory for amounts above ₹50,000.' },
  pomis:      { minAge: 18, maxAge: null, minAnnualIncome: 0,       minMonthlySavings: 1000, notes: 'Any Indian resident. Joint account holders eligible.' },
  mssc:       { minAge: 18, maxAge: null, minAnnualIncome: 0,       minMonthlySavings: 1000, notes: 'Any Indian resident. Maximum ₹30L per account.' },
  rbi_bond:   { minAge: 18, maxAge: null, minAnnualIncome: 0,       minMonthlySavings: 1000, notes: 'Any Indian resident/HUF. Non-transferable.' },
  g_sec:      { minAge: 18, maxAge: null, minAnnualIncome: 0,       minMonthlySavings: 10000, notes: 'Available via RBI Retail Direct or through mutual fund wrappers.' },
  sgb:        { minAge: 18, maxAge: null, minAnnualIncome: 0,       minMonthlySavings: 5000,  notes: 'Any Indian resident. NRIs not eligible.', requiresDemat: true },
  epf:        { minAge: 18, maxAge: 58,   minAnnualIncome: 0,       minMonthlySavings: 0,    notes: 'Salaried employees only. Mandatory for establishments with 20+ workers.' },

  // ── Fixed Deposits ──
  sbi_fd:     { minAge: 18, maxAge: null, minAnnualIncome: 0,       minMonthlySavings: 1000, notes: 'Any Indian resident. NRI eligible via NRE/NRO accounts.' },
  hdfc_fd:    { minAge: 18, maxAge: null, minAnnualIncome: 0,       minMonthlySavings: 5000, notes: 'Any Indian resident or NRI with bank account.' },
  icici_fd:   { minAge: 18, maxAge: null, minAnnualIncome: 0,       minMonthlySavings: 5000, notes: 'Any Indian resident or NRI with bank account.' },
  kotak_fd:   { minAge: 18, maxAge: null, minAnnualIncome: 0,       minMonthlySavings: 5000, notes: 'Any Indian resident or NRI with bank account.' },
  axis_fd:    { minAge: 18, maxAge: null, minAnnualIncome: 0,       minMonthlySavings: 5000, notes: 'Any Indian resident or NRI with bank account.' },
  indusind_fd:{ minAge: 18, maxAge: null, minAnnualIncome: 0,       minMonthlySavings: 10000, notes: 'Any Indian resident or NRI with bank account.' },
  yes_fd:     { minAge: 18, maxAge: null, minAnnualIncome: 0,       minMonthlySavings: 10000, notes: 'Any Indian resident. Online FD booking available.' },
  idfc_fd:    { minAge: 18, maxAge: null, minAnnualIncome: 0,       minMonthlySavings: 10000, notes: 'Any Indian resident or NRI with bank account.' },
  bob_fd:     { minAge: 18, maxAge: null, minAnnualIncome: 0,       minMonthlySavings: 1000, notes: 'Any Indian resident or NRI with bank account.' },
  pnb_fd:     { minAge: 18, maxAge: null, minAnnualIncome: 0,       minMonthlySavings: 1000, notes: 'Any Indian resident or NRI with bank account.' },
  canara_fd:  { minAge: 18, maxAge: null, minAnnualIncome: 0,       minMonthlySavings: 1000, notes: 'Any Indian resident or NRI with bank account.' },
  union_fd:   { minAge: 18, maxAge: null, minAnnualIncome: 0,       minMonthlySavings: 1000, notes: 'Any Indian resident or NRI with bank account.' },
  bajaj_fd:   { minAge: 18, maxAge: null, minAnnualIncome: 0,       minMonthlySavings: 15000, notes: 'Any Indian resident. Corporate FD — not DICGC insured.' },
  shriram_fd: { minAge: 18, maxAge: null, minAnnualIncome: 0,       minMonthlySavings: 5000, notes: 'Any Indian resident. Corporate FD — not DICGC insured.' },
  mahindra_fd:{ minAge: 18, maxAge: null, minAnnualIncome: 0,       minMonthlySavings: 5000, notes: 'Any Indian resident. Corporate FD — not DICGC insured.' },

  // ── ELSS / Tax Saving MFs ──
  elss_axis:  { minAge: 18, maxAge: null, minAnnualIncome: 0,       minMonthlySavings: 500,  notes: 'Any Indian resident or NRI. KYC mandatory.' },
  elss_mirae: { minAge: 18, maxAge: null, minAnnualIncome: 0,       minMonthlySavings: 500,  notes: 'Any Indian resident or NRI. KYC mandatory.' },
  elss_quant: { minAge: 18, maxAge: null, minAnnualIncome: 0,       minMonthlySavings: 500,  notes: 'Any Indian resident or NRI. KYC mandatory.' },
  elss_parag_parikh: { minAge: 18, maxAge: null, minAnnualIncome: 0, minMonthlySavings: 500, notes: 'Any Indian resident or NRI. KYC mandatory.' },
  elss_dsp:   { minAge: 18, maxAge: null, minAnnualIncome: 0,       minMonthlySavings: 500,  notes: 'Any Indian resident or NRI. KYC mandatory.' },
  elss_canara: { minAge: 18, maxAge: null, minAnnualIncome: 0,      minMonthlySavings: 500,  notes: 'Any Indian resident or NRI. KYC mandatory.' },
  elss_sbi:   { minAge: 18, maxAge: null, minAnnualIncome: 0,       minMonthlySavings: 500,  notes: 'Any Indian resident or NRI. KYC mandatory.' },
  elss_hdfc:  { minAge: 18, maxAge: null, minAnnualIncome: 0,       minMonthlySavings: 500,  notes: 'Any Indian resident or NRI. KYC mandatory.' },
  elss_kotak: { minAge: 18, maxAge: null, minAnnualIncome: 0,       minMonthlySavings: 500,  notes: 'Any Indian resident or NRI. KYC mandatory.' },

  // ── Large Cap / Flexi Cap / Multi Cap MFs ──
  largecap_axis: { minAge: 18, maxAge: null, minAnnualIncome: 300000, minMonthlySavings: 1000, notes: 'Any Indian resident or NRI. KYC mandatory.' },
  largecap_mirae: { minAge: 18, maxAge: null, minAnnualIncome: 300000, minMonthlySavings: 1000, notes: 'Any Indian resident or NRI. KYC mandatory.' },
  largecap_sbi: { minAge: 18, maxAge: null, minAnnualIncome: 300000, minMonthlySavings: 500, notes: 'Any Indian resident or NRI. KYC mandatory.' },
  largecap_hdfc: { minAge: 18, maxAge: null, minAnnualIncome: 300000, minMonthlySavings: 1000, notes: 'Any Indian resident or NRI. KYC mandatory.' },
  largecap_icici: { minAge: 18, maxAge: null, minAnnualIncome: 300000, minMonthlySavings: 1000, notes: 'Any Indian resident or NRI. KYC mandatory.' },
  flexicap_parag_parikh: { minAge: 18, maxAge: null, minAnnualIncome: 300000, minMonthlySavings: 1000, notes: 'KYC mandatory. One of India\'s most popular flexi-cap funds.' },
  flexicap_hdfc: { minAge: 18, maxAge: null, minAnnualIncome: 300000, minMonthlySavings: 1000, notes: 'Any Indian resident or NRI. KYC mandatory.' },
  flexicap_quant: { minAge: 18, maxAge: null, minAnnualIncome: 300000, minMonthlySavings: 500, notes: 'Any Indian resident or NRI. KYC mandatory.' },
  multicap_nippon: { minAge: 18, maxAge: null, minAnnualIncome: 300000, minMonthlySavings: 1000, notes: 'Any Indian resident or NRI. KYC mandatory.' },
  multicap_quant: { minAge: 18, maxAge: null, minAnnualIncome: 300000, minMonthlySavings: 500, notes: 'Any Indian resident or NRI. KYC mandatory.' },
  value_fund_icici: { minAge: 18, maxAge: null, minAnnualIncome: 300000, minMonthlySavings: 1000, notes: 'Any Indian resident or NRI. KYC mandatory.' },
  value_fund_tata: { minAge: 18, maxAge: null, minAnnualIncome: 300000, minMonthlySavings: 1000, notes: 'Any Indian resident or NRI. KYC mandatory.' },
  contra_sbi: { minAge: 18, maxAge: null, minAnnualIncome: 300000, minMonthlySavings: 1000, notes: 'Any Indian resident or NRI. KYC mandatory.' },

  // ── Mid Cap MFs ──
  midcap_axis: { minAge: 18, maxAge: null, minAnnualIncome: 500000, minMonthlySavings: 2000, notes: 'Higher risk. Recommended for investors with stable income and long horizon.' },
  midcap_kotak: { minAge: 18, maxAge: null, minAnnualIncome: 500000, minMonthlySavings: 1000, notes: 'Higher risk. Recommended for investors with stable income and long horizon.' },
  midcap_hdfc: { minAge: 18, maxAge: null, minAnnualIncome: 500000, minMonthlySavings: 1000, notes: 'Higher risk. Recommended for investors with stable income and long horizon.' },
  midcap_quant: { minAge: 18, maxAge: null, minAnnualIncome: 500000, minMonthlySavings: 1000, notes: 'Higher risk. Recommended for investors with stable income and long horizon.' },
  midcap_motilal: { minAge: 18, maxAge: null, minAnnualIncome: 500000, minMonthlySavings: 1000, notes: 'Higher risk. Recommended for investors with stable income and long horizon.' },

  // ── Small Cap MFs ──
  smallcap_nippon: { minAge: 18, maxAge: null, minAnnualIncome: 500000, minMonthlySavings: 2000, notes: 'Very high risk. Only for aggressive investors with 7+ year horizon.' },
  smallcap_quant: { minAge: 18, maxAge: null, minAnnualIncome: 500000, minMonthlySavings: 500, notes: 'Very high risk. Only for aggressive investors with 7+ year horizon.' },
  smallcap_sbi: { minAge: 18, maxAge: null, minAnnualIncome: 500000, minMonthlySavings: 2000, notes: 'Very high risk. Only for aggressive investors with 7+ year horizon.' },
  smallcap_axis: { minAge: 18, maxAge: null, minAnnualIncome: 500000, minMonthlySavings: 2000, notes: 'Very high risk. Only for aggressive investors with 7+ year horizon.' },
  smallcap_tata: { minAge: 18, maxAge: null, minAnnualIncome: 500000, minMonthlySavings: 1000, notes: 'Very high risk. Only for aggressive investors with 7+ year horizon.' },

  // ── Index Funds / ETFs ──
  index_nifty50_uti: { minAge: 18, maxAge: null, minAnnualIncome: 0, minMonthlySavings: 500, notes: 'Any Indian resident. Lowest cost way to invest in Nifty 50.' },
  index_nifty50_hdfc: { minAge: 18, maxAge: null, minAnnualIncome: 0, minMonthlySavings: 500, notes: 'Any Indian resident. KYC mandatory.' },
  index_niftynext50_uti: { minAge: 18, maxAge: null, minAnnualIncome: 0, minMonthlySavings: 500, notes: 'Any Indian resident. KYC mandatory.' },
  index_niftynext50_motilal: { minAge: 18, maxAge: null, minAnnualIncome: 0, minMonthlySavings: 500, notes: 'Any Indian resident. KYC mandatory.' },
  index_sensex_hdfc: { minAge: 18, maxAge: null, minAnnualIncome: 0, minMonthlySavings: 500, notes: 'Any Indian resident. KYC mandatory.' },
  index_sp500_motilal: { minAge: 18, maxAge: null, minAnnualIncome: 300000, minMonthlySavings: 500, notes: 'Any Indian resident. Passive US equity exposure.' },
  index_nasdaq_motilal: { minAge: 18, maxAge: null, minAnnualIncome: 300000, minMonthlySavings: 500, notes: 'Any Indian resident. Passive US tech equity exposure.' },
  etf_nifty50: { minAge: 18, maxAge: null, minAnnualIncome: 0, minMonthlySavings: 500, notes: 'Requires demat account. Trade on NSE/BSE.', requiresDemat: true },
  etf_niftynext50: { minAge: 18, maxAge: null, minAnnualIncome: 0, minMonthlySavings: 500, notes: 'Requires demat account. Trade on NSE/BSE.', requiresDemat: true },
  etf_gold: { minAge: 18, maxAge: null, minAnnualIncome: 0, minMonthlySavings: 500, notes: 'Requires demat account. Trade on NSE/BSE.', requiresDemat: true },
  etf_banknifty: { minAge: 18, maxAge: null, minAnnualIncome: 300000, minMonthlySavings: 1000, notes: 'Requires demat account. Sectoral concentration risk.', requiresDemat: true },
  etf_midcap: { minAge: 18, maxAge: null, minAnnualIncome: 300000, minMonthlySavings: 1000, notes: 'Requires demat account. Higher volatility than large-cap ETFs.', requiresDemat: true },

  // ── Debt / Liquid / Arbitrage MFs ──
  debt_hdfc_corporate: { minAge: 18, maxAge: null, minAnnualIncome: 0, minMonthlySavings: 1000, notes: 'Any Indian resident or NRI. KYC mandatory.' },
  debt_icici_short: { minAge: 18, maxAge: null, minAnnualIncome: 0, minMonthlySavings: 1000, notes: 'Any Indian resident or NRI. KYC mandatory.' },
  debt_sbi_magnum: { minAge: 18, maxAge: null, minAnnualIncome: 0, minMonthlySavings: 1000, notes: 'Any Indian resident or NRI. KYC mandatory.' },
  debt_axis_banking: { minAge: 18, maxAge: null, minAnnualIncome: 0, minMonthlySavings: 1000, notes: 'Any Indian resident or NRI. KYC mandatory.' },
  debt_kotak_bond: { minAge: 18, maxAge: null, minAnnualIncome: 0, minMonthlySavings: 1000, notes: 'Any Indian resident or NRI. KYC mandatory.' },
  liquid_hdfc: { minAge: 18, maxAge: null, minAnnualIncome: 0, minMonthlySavings: 500, notes: 'Instant redemption up to ₹50,000. Park short-term cash.' },
  liquid_icici: { minAge: 18, maxAge: null, minAnnualIncome: 0, minMonthlySavings: 500, notes: 'Instant redemption up to ₹50,000. Park short-term cash.' },
  liquid_sbi: { minAge: 18, maxAge: null, minAnnualIncome: 0, minMonthlySavings: 500, notes: 'Instant redemption up to ₹50,000. Park short-term cash.' },
  liquid_axis: { minAge: 18, maxAge: null, minAnnualIncome: 0, minMonthlySavings: 500, notes: 'Instant redemption up to ₹50,000. Park short-term cash.' },
  liquid_parag_parikh: { minAge: 18, maxAge: null, minAnnualIncome: 0, minMonthlySavings: 500, notes: 'Instant redemption up to ₹50,000. Park short-term cash.' },
  arbitrage_hdfc: { minAge: 18, maxAge: null, minAnnualIncome: 0, minMonthlySavings: 500, notes: 'Any Indian resident or NRI. Equity taxation with debt-like risk.' },
  arbitrage_kotak: { minAge: 18, maxAge: null, minAnnualIncome: 0, minMonthlySavings: 500, notes: 'Any Indian resident or NRI. Equity taxation with debt-like risk.' },
  arbitrage_icici: { minAge: 18, maxAge: null, minAnnualIncome: 0, minMonthlySavings: 500, notes: 'Any Indian resident or NRI. Equity taxation with debt-like risk.' },

  // ── Hybrid / Balanced MFs ──
  hybrid_hdfc_balanced: { minAge: 18, maxAge: null, minAnnualIncome: 200000, minMonthlySavings: 500, notes: 'Any Indian resident or NRI. KYC mandatory.' },
  hybrid_icici_equity: { minAge: 18, maxAge: null, minAnnualIncome: 200000, minMonthlySavings: 500, notes: 'Any Indian resident or NRI. KYC mandatory.' },
  hybrid_sbi_equity: { minAge: 18, maxAge: null, minAnnualIncome: 200000, minMonthlySavings: 500, notes: 'Any Indian resident or NRI. KYC mandatory.' },
  hybrid_canara_equity: { minAge: 18, maxAge: null, minAnnualIncome: 200000, minMonthlySavings: 500, notes: 'Any Indian resident or NRI. KYC mandatory.' },
  hybrid_parag_parikh_conservative: { minAge: 18, maxAge: null, minAnnualIncome: 0, minMonthlySavings: 500, notes: 'Low equity allocation (~25%). Suitable for conservative investors.' },

  // ── REITs / InvITs ──
  reit_embassy: { minAge: 18, maxAge: null, minAnnualIncome: 500000, minMonthlySavings: 3000, notes: 'Requires demat account. Traded on NSE/BSE. Lot-based buying.', requiresDemat: true },
  reit_mindspace: { minAge: 18, maxAge: null, minAnnualIncome: 500000, minMonthlySavings: 3000, notes: 'Requires demat account. Traded on NSE/BSE.', requiresDemat: true },
  reit_brookfield: { minAge: 18, maxAge: null, minAnnualIncome: 500000, minMonthlySavings: 3000, notes: 'Requires demat account. Traded on NSE/BSE.', requiresDemat: true },
  invit_powergrid: { minAge: 18, maxAge: null, minAnnualIncome: 300000, minMonthlySavings: 2000, notes: 'Requires demat account. Infrastructure yield play.', requiresDemat: true },
  invit_indinfravit: { minAge: 18, maxAge: null, minAnnualIncome: 300000, minMonthlySavings: 2000, notes: 'Requires demat account. Highway/road infrastructure.', requiresDemat: true },

  // ── Gold ──
  gold_mf_hdfc: { minAge: 18, maxAge: null, minAnnualIncome: 0, minMonthlySavings: 500, notes: 'Any Indian resident. No demat needed for MF route.' },
  gold_mf_sbi: { minAge: 18, maxAge: null, minAnnualIncome: 0, minMonthlySavings: 500, notes: 'Any Indian resident. No demat needed for MF route.' },
  gold_mf_nippon: { minAge: 18, maxAge: null, minAnnualIncome: 0, minMonthlySavings: 500, notes: 'Any Indian resident. No demat needed for MF route.' },

  // ── International Funds ──
  international_motilal_nasdaq: { minAge: 18, maxAge: null, minAnnualIncome: 300000, minMonthlySavings: 500, notes: 'Subject to RBI LRS limits ($250,000/year). KYC mandatory.' },
  international_franklin_us: { minAge: 18, maxAge: null, minAnnualIncome: 300000, minMonthlySavings: 1000, notes: 'Subject to RBI LRS limits. KYC mandatory.' },
  international_edelweiss_china: { minAge: 18, maxAge: null, minAnnualIncome: 300000, minMonthlySavings: 1000, notes: 'Subject to RBI LRS limits. KYC mandatory. New fund offer restrictions may apply.' },

  // ── Direct Equity ──
  direct_equity_bluechip: { minAge: 18, maxAge: null, minAnnualIncome: 500000, minMonthlySavings: 5000, notes: 'Requires demat + trading account. Market risk.', requiresDemat: true },
  direct_equity_midcap: { minAge: 18, maxAge: null, minAnnualIncome: 500000, minMonthlySavings: 5000, notes: 'Requires demat + trading account. Higher volatility.', requiresDemat: true },
  direct_equity_smallcap: { minAge: 18, maxAge: null, minAnnualIncome: 500000, minMonthlySavings: 5000, notes: 'Requires demat + trading account. Very high volatility.', requiresDemat: true },
};

// ─── Default eligibility for any instrument not in the map ───────
const DEFAULT_ELIGIBILITY = {
  minAge: 18,
  maxAge: null,
  minAnnualIncome: 0,
  minMonthlySavings: 500,
  notes: null,
  requiresDemat: null,
  hasGirlChild: null,
};

let patched = 0;
let skipped = 0;

for (const inst of catalog.instruments) {
  if (inst.eligibility) {
    skipped++;
    continue; // Already has eligibility — don't overwrite
  }

  const override = ELIGIBILITY_MAP[inst.id];
  inst.eligibility = {
    minAge: override?.minAge ?? DEFAULT_ELIGIBILITY.minAge,
    maxAge: override?.maxAge ?? DEFAULT_ELIGIBILITY.maxAge,
    minAnnualIncome: override?.minAnnualIncome ?? DEFAULT_ELIGIBILITY.minAnnualIncome,
    minMonthlySavings: override?.minMonthlySavings ?? DEFAULT_ELIGIBILITY.minMonthlySavings,
    notes: override?.notes ?? DEFAULT_ELIGIBILITY.notes,
    requiresDemat: override?.requiresDemat ?? DEFAULT_ELIGIBILITY.requiresDemat,
    hasGirlChild: override?.hasGirlChild ?? DEFAULT_ELIGIBILITY.hasGirlChild,
  };
  patched++;
}

writeFileSync(masterPath, JSON.stringify(catalog, null, 2) + '\n', 'utf8');

console.log(`✓ Patched ${patched} instruments with eligibility rules.`);
console.log(`  Skipped ${skipped} instruments (already had eligibility).`);
console.log(`  Total: ${catalog.instruments.length} instruments in ${masterPath}`);
