import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { runPipeline, resolveBackendType, filterEligible } from '../services/RecommendationPipeline.js';

test('RecommendationPipeline resolveBackendType', () => {
  assert.equal(resolveBackendType({ id: 'ppf' }), 'PPF');
  assert.equal(resolveBackendType({ id: 'scss' }), 'SCSS');
  assert.equal(resolveBackendType({ id: 'sukanya' }), 'SSY');
  assert.equal(resolveBackendType({ id: 'sbi_fd' }), 'FD');
  assert.equal(resolveBackendType({ id: 'hdfc_gold_etf' }), 'Gold');
  assert.equal(resolveBackendType({ id: 'arbitrage_mf_fund' }), 'Arbitrage_MF');
  assert.equal(resolveBackendType({ id: 'unknown_fund_id', category: 'Direct Equity' }), 'Equity_MF');
  assert.equal(resolveBackendType({ id: 'another_unknown_id', category: 'Retirement' }), 'NPS');
});

test('RecommendationPipeline filterEligible gates by age, income, and savings', () => {
  const mockCatalog = [
    { id: 'scss', eligibility: { minAge: 60 } },
    { id: 'sukanya', eligibility: { hasGirlChild: true } },
    { id: 'high_savings_fund', eligibility: { minMonthlySavings: 20000 } },
    { id: 'high_income_fund', eligibility: { minAnnualIncome: 1500000 } },
    { id: 'universal_fund' },
  ];

  const seniorProfile = { age: 65, annualIncome: 500000, savings: 5000, hasGirlChild: false };
  const seniorEligible = filterEligible(mockCatalog, seniorProfile);
  assert.ok(seniorEligible.some(inv => inv.id === 'scss'));
  assert.ok(!seniorEligible.some(inv => inv.id === 'sukanya'));
  assert.ok(seniorEligible.some(inv => inv.id === 'universal_fund'));

  const youngProfile = { age: 24, annualIncome: 2000000, savings: 25000, hasGirlChild: true };
  const youngEligible = filterEligible(mockCatalog, youngProfile);
  assert.ok(!youngEligible.some(inv => inv.id === 'scss'));
  assert.ok(youngEligible.some(inv => inv.id === 'sukanya'));
  assert.ok(youngEligible.some(inv => inv.id === 'high_savings_fund'));
  assert.ok(youngEligible.some(inv => inv.id === 'high_income_fund'));
});

test('RecommendationPipeline runPipeline returns 5 diversified recommendations', () => {
  const profile = {
    age: 32,
    annualIncome: 1200000,
    savings: 30000,
    riskCategory: 'Moderate',
    investmentHorizon: 12,
    goal_type: 'Wealth Growth',
    taxRegime: 'new',
  };

  const mlResult = {
    confidence_scores: {
      'Index_MF': 0.40,
      'Debt_MF': 0.30,
      'PPF': 0.20,
    },
    fallback: false,
  };

  const result = runPipeline(profile, mlResult);
  assert.equal(result.instruments.length, 5);

  // Verify diversity: at least 3 distinct asset classes
  const classes = new Set(result.instruments.map(i => i.type));
  assert.ok(classes.size >= 3, `Expected at least 3 distinct asset classes, got ${classes.size}: ${[...classes]}`);

  // Verify weights sum to exactly 1.0
  const totalWeight = result.instruments.reduce((s, i) => s + i.allocationWeight, 0);
  assert.ok(Math.abs(totalWeight - 1.0) < 0.0001, `Weights sum must be 1.0, got ${totalWeight}`);
});

test('RecommendationPipeline dynamic age overrides (senior vs young)', () => {
  // Senior citizen profile: expect lower volatility/risk instruments to rank higher
  const seniorProfile = {
    age: 68,
    annualIncome: 800000,
    savings: 15000,
    riskCategory: 'Conservative',
    investmentHorizon: 5,
    goal_type: 'Retirement',
    taxRegime: 'new',
  };

  const mlResult = { confidence_scores: { 'Smallcap_MF': 0.8, 'FD': 0.1 } };
  const seniorResult = runPipeline(seniorProfile, mlResult);

  // Even though ML predicted Smallcap_MF with 0.8 confidence,
  // senior citizens should NOT have Smallcap_MF dominate the top positions or should have safer instruments favored
  const topPicks = seniorResult.instruments.slice(0, 3).map(i => i.type);
  assert.ok(!topPicks.includes('Smallcap_MF') || seniorResult.instruments.find(i => i.type === 'Smallcap_MF').allocationWeight < 0.25);
  assert.ok(topPicks.includes('SCSS') || topPicks.includes('FD') || topPicks.includes('PPF') || topPicks.includes('RBI_Bond'));
});
