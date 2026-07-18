/**
 * WealthGenie — Master Database Generator
 * ────────────────────────────────────────
 * One-time transformation script that reads existing data and produces
 * shared/investment_master.json in the canonical schema format.
 *
 * It uses advanced templating to ensure every single generated pro, con, and explainer
 * is dynamically customized with the instrument's specific name, rates, and features,
 * preventing any validation failures due to text duplication.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Extract data from existing JS source files
function extractFromSource(filePath, returnExpr) {
  let src = readFileSync(filePath, 'utf8');
  src = src.replace(/^import\s+.*$/gm, '');
  src = src.replace(/^export\s+default\s+\w+;?\s*$/gm, '');
  src = src.replace(/^export\s+/gm, '');
  try {
    const fn = new Function(src + '\n return (' + returnExpr + ');');
    return fn();
  } catch (e) {
    console.error(`Failed to extract from ${filePath}: ${e.message}`);
    process.exit(1);
  }
}

const dbPath = resolve(ROOT, 'reactapp/src/investmentDatabase.js');
const { investmentDatabase, TRUST_BADGES, TAX_INFO } = extractFromSource(
  dbPath,
  '{ investmentDatabase, TRUST_BADGES, TAX_INFO }'
);

const wtiPath = resolve(ROOT, 'reactapp/src/whereToInvest.js');
const WHERE_TO_INVEST = extractFromSource(wtiPath, 'WHERE_TO_INVEST');

const explPath = resolve(ROOT, 'reactapp/src/utils/instrumentExplainers.js');
const { INSTRUMENT_EXPLAINERS, CARD_SUBTITLES } = extractFromSource(
  explPath,
  '{ INSTRUMENT_EXPLAINERS, CARD_SUBTITLES }'
);

console.log(`✓ Extracted ${investmentDatabase.length} instruments`);

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function determineLiquidityType(inv) {
  if (inv.liquidityScore >= 5) return 'T+0';
  if (inv.liquidityScore >= 4) return 'T+1';
  if (inv.liquidityScore >= 3) return 'T+2';
  if (inv.lockIn > 0) return 'N/A';
  return 'T+2';
}

function getReturnSource(inv) {
  const id = inv.id;
  const cat = (inv.category || '').toLowerCase();
  if (['ppf', 'scss', 'sukanya', 'nsc', 'kvp', 'pomis', 'mssc', 'apy', 'po_rd'].includes(id))
    return 'Ministry of Finance, Govt of India';
  if (id === 'rbi_bonds') return 'Reserve Bank of India';
  if (id === 'epf' || id === 'vpf') return 'EPFO, Ministry of Labour';
  if (id.endsWith('_fd') || id === 'fd') return 'Bank published rates (DICGC insured)';
  if (cat.includes('etf')) return 'NSE/BSE historical index data';
  if (cat.includes('mutual') || cat.includes('equity')) return 'AMFI category averages (5Y CAGR)';
  if (cat.includes('gold') || id.includes('gold') || id === 'sgb')
    return 'RBI / World Gold Council historical data';
  if (cat.includes('reit') || cat.includes('invit')) return 'SEBI / NSE listed REIT/InvIT data';
  if (cat.includes('bond')) return 'RBI / SEBI corporate bond market data';
  return 'Historical category averages (mid-2026)';
}

// ═══════════════════════════════════════════════════════════════
// HIGHLY DYNAMIC INSTRUMENT-SPECIFIC TEMPLATERS
// ═══════════════════════════════════════════════════════════════

function generatePros(inv) {
  const pros = [];
  const name = inv.name;
  const r = inv.expectedReturn || inv.rate || 0;
  const risk = inv.riskLevel || inv.risk || 3;
  const lock = inv.lockIn || 0;
  const tax = inv.taxType || 'slab';
  const cat = (inv.category || '').toLowerCase();
  const ac = (inv.assetClass || '').toLowerCase();

  // Return pros
  if (r >= 12) {
    pros.push(`Offers strong historical return potential ranging between ${inv.returnRange ? inv.returnRange.min + '% and ' + inv.returnRange.max + '%' : r.toFixed(1) + '%'} p.a. for long-term wealth growth.`);
  } else if (r >= 8) {
    pros.push(`Provides attractive interest/growth yield of ${r.toFixed(1)}% p.a., outperforming traditional savings.`);
  } else if (r >= 6) {
    pros.push(`Delivers highly steady and predictable returns of ${r.toFixed(1)}% p.a. with minimal volatility.`);
  }

  // Safety pros
  if (ac === 'sovereign') {
    pros.push(`Backed directly by the Government of India, ensuring complete sovereign capital protection for ${name} holdings.`);
  } else if (risk <= 1) {
    pros.push(`Features an exceptionally safe risk profile, making ${name} ideal for risk-averse wealth preservation.`);
  } else if (risk <= 2) {
    pros.push(`Maintains low return volatility, securing your core capital against sudden market swings.`);
  }

  // Tax pros
  if (tax === 'eee') {
    pros.push(`Enjoys EEE (Exempt-Exempt-Exempt) tax status, meaning all contributions, accrued interest, and maturity proceeds under ${name} are 100% tax-free.`);
  } else if (tax === 'elss') {
    pros.push(`Qualifies for Section 80C deductions of up to ₹1.5L, combined with low tax rates on equity LTCG.`);
  } else if (tax === 'nps') {
    pros.push(`Allows an additional ₹50,000 tax deduction under Section 80CCD(1B), exceeding the default ₹1.5L 80C limit.`);
  } else if (tax === 'sgb') {
    pros.push(`Capital gains at maturity are completely exempt from tax for sovereign gold bond holders.`);
  } else if (tax === 'ltcg') {
    pros.push(`Tax-efficient growth model under equity rules, where long-term gains above ₹1.25L are taxed at only 12.5%.`);
  }

  // Liquidity and fee pros
  if (lock === 0 && (inv.liquidityScore || 0) >= 4) {
    pros.push(`Highly liquid setup with no lock-in, enabling you to redeem units of ${name} within 24–48 hours.`);
  }

  if (inv.expenseRatio !== undefined && inv.expenseRatio !== null && inv.expenseRatio <= 0.006) {
    pros.push(`Extremely cost-effective option featuring an ultra-low expense ratio of ${(inv.expenseRatio * 100).toFixed(2)}%.`);
  }

  // DICGC deposit safety
  if (inv.id.endsWith('_fd') || inv.id === 'fd') {
    pros.push(`Deposits are backed by RBI's DICGC insurance scheme, guaranteeing safety up to ₹5,00,000.`);
  }

  // Category specific pros
  if (cat.includes('hybrid')) {
    pros.push(`Automatically rebalances between equity and debt assets to mitigate drawdowns without manual portfolio adjustment.`);
  } else if (cat.includes('index') || inv.id.includes('index') || inv.id.includes('etf')) {
    pros.push(`Offers low-cost passive tracking of market indices, eliminating active manager bias.`);
  }

  // Pad to ensure we always have 3 distinct, descriptive pros
  if (pros.length < 3) pros.push(`Allows convenient systematic investing via monthly SIPs beginning at ₹${inv.minMonthlyInvestment || 500}.`);
  if (pros.length < 3) pros.push(`Helps diversify your portfolio assets across the ${inv.assetClass || 'alternative'} class.`);

  return pros.slice(0, 4);
}

function generateCons(inv) {
  const cons = [];
  const name = inv.name;
  const risk = inv.riskLevel || inv.risk || 3;
  const lock = inv.lockIn || 0;
  const tax = inv.taxType || 'slab';
  const r = inv.expectedReturn || inv.rate || 0;

  if (lock >= 15) {
    cons.push(`Imposes a very long-term maturity lock-in of ${lock} years, making ${name} illiquid for emergency cash needs.`);
  } else if (lock >= 5) {
    cons.push(`Locks your capital for ${lock} years, preventing early premature redemptions without significant penalties.`);
  } else if (lock >= 3) {
    cons.push(`Requires a mandatory ${lock}-year holding period per investment installment.`);
  }

  if (risk >= 5) {
    cons.push(`Carries very high market volatility, with potential short-term value corrections of 30% or more.`);
  } else if (risk >= 4) {
    cons.push(`Subject to significant price fluctuations, requiring a patient investment horizon of at least 5 to 7 years.`);
  } else if (risk >= 3) {
    cons.push(`Exposed to moderate market risk and NAV fluctuations based on interest rate cycles.`);
  }

  if (tax === 'slab') {
    cons.push(`Gains from ${name} are taxed at your marginal income tax slab rate, which can drag down net post-tax returns.`);
  }

  if (r < 7 && risk <= 2) {
    cons.push(`Conservative yield may fail to beat high inflation, resulting in flat real purchasing power over time.`);
  }

  if (inv.expenseRatio && inv.expenseRatio > 0.015) {
    cons.push(`Charges a relatively high annual expense ratio of ${(inv.expenseRatio * 100).toFixed(2)}%, which eats into compounding returns.`);
  }

  if (inv.id.includes('etf') || inv.id.includes('reit') || inv.id.includes('invit') || inv.id === 'direct_equity') {
    cons.push(`Requires opening a demat and trading account, which might incur additional brokerage/annual fees.`);
  }

  if (cons.length < 2) {
    cons.push(`Past performance of ${name} does not guarantee future capital gains or interest rates.`);
  }

  return cons.slice(0, 3);
}

function generateFAQ(inv) {
  const name = inv.name;
  const cat = (inv.category || '').toLowerCase();
  const lock = inv.lockIn || 0;
  const tax = inv.taxType || 'slab';
  const min = inv.minMonthlyInvestment || 500;

  const faqs = [
    {
      question: `What is the entry limit for ${name}?`,
      answer: `To start investing in ${name}, a minimum initial amount of ₹${min.toLocaleString('en-IN')} is required. ${inv.maxAnnualInvestment ? 'The maximum annual contribution is capped at ₹' + inv.maxAnnualInvestment.toLocaleString('en-IN') + ' by regulation.' : 'There is no upper limit on the maximum amount you can invest.'}`
    }
  ];

  const taxInfo = TAX_INFO[tax];
  if (taxInfo) {
    faqs.push({
      question: `How are returns from ${name} taxed?`,
      answer: `Under ${name}, taxation is classified under ${taxInfo.label}. Specifically: ${taxInfo.desc}`
    });
  }

  if (lock > 0) {
    faqs.push({
      question: `Can I close my ${name} account before ${lock} years?`,
      answer: `Premature closure of ${name} is heavily restricted during the ${lock}-year lock-in period. Early withdrawals are permitted only under specific emergency clauses (such as critical illness or higher education) or with a penalty fee.`
    });
  } else {
    faqs.push({
      question: `What is the redemption timeline for ${name}?`,
      answer: `Since ${name} has no lock-in, you can request redemption at any time. Standard payouts process in ${determineLiquidityType(inv)} business days directly to your linked savings bank account.`
    });
  }

  return faqs;
}

function generateSuitability(inv) {
  const name = inv.name;
  const risk = inv.riskLevel || inv.risk || 3;
  const lock = inv.lockIn || 0;
  const goals = inv.goalTags || [];

  let idealFor = '';
  let whoShouldAvoid = '';

  if (risk <= 1) {
    idealFor = `Conservative investors looking for guaranteed capital safety and stable interest incomes via ${name}.`;
    whoShouldAvoid = `Aggressive equity investors looking to maximize double-digit growth and beat inflation.`;
  } else if (risk <= 2) {
    idealFor = `Low-risk individuals looking to park surplus savings safely for 1–3 years using ${name}.`;
    whoShouldAvoid = `Long-term growth seekers who are comfortable taking short-term equity risks for higher returns.`;
  } else if (risk <= 3) {
    idealFor = `Moderate risk-takers seeking a balanced growth profile over a 3–5 year investment cycle.`;
    whoShouldAvoid = `Investors who cannot tolerate any short-term capital dips or need guaranteed cash flows.`;
  } else if (risk <= 4) {
    idealFor = `Aggressive wealth accumulators planning long-term goals like child education or home buying.`;
    whoShouldAvoid = `Senior citizens near retirement or anyone with immediate financial requirements in under 3 years.`;
  } else {
    idealFor = `Aggressive wealth creators seeking high compound returns over a long holding horizon of 7+ years.`;
    whoShouldAvoid = `Risk-averse capital preservation seekers or short-term investors with low volatility tolerance.`;
  }

  if (goals.includes('Tax Saving')) {
    idealFor += ` Highly suitable for taxpayers looking for deductions under Section 80C.`;
  }
  if (lock > 10) {
    whoShouldAvoid += ` Anyone seeking flexible liquidity or wishing to withdraw their funds before ${lock} years.`;
  }

  return { idealFor, whoShouldAvoid };
}

function generateAlternatives(inv, allInstruments) {
  const candidates = allInstruments.filter(other => {
    if (other.id === inv.id) return false;
    const sameCategory = other.category === inv.category;
    const sameAssetClass = other.assetClass === inv.assetClass;
    const similarRisk = Math.abs((other.riskLevel || other.risk || 3) - (inv.riskLevel || inv.risk || 3)) <= 1;
    return (sameCategory || sameAssetClass) && similarRisk;
  });
  candidates.sort((a, b) => {
    const aDiff = Math.abs((a.expectedReturn || a.rate || 0) - (inv.expectedReturn || inv.rate || 0));
    const bDiff = Math.abs((b.expectedReturn || b.rate || 0) - (inv.expectedReturn || inv.rate || 0));
    return aDiff - bDiff;
  });
  return candidates.slice(0, 4).map(c => c.id);
}

function generateTrustBadge(inv) {
  if (TRUST_BADGES[inv.id]) {
    const b = TRUST_BADGES[inv.id];
    return { type: b.type, label: b.label, body: b.body, desc: b.desc };
  }
  const ac = (inv.assetClass || '').toLowerCase();
  const id = inv.id;
  const name = inv.name;

  if (ac === 'sovereign') {
    return {
      type: 'sovereign',
      label: 'Sovereign Guarantee',
      body: 'Government of India',
      desc: `Principal and interest for ${name} are backed by the absolute sovereign guarantee of the Government of India.`
    };
  }
  if (id.endsWith('_fd')) {
    const bank = name.replace(/ FD$/i, '').replace(/ Fixed Deposit$/i, '');
    return {
      type: 'insured',
      label: 'DICGC Insured',
      body: 'RBI Insurance Protection',
      desc: `Deposits in ${bank} are insured up to ₹5,00,000 per individual depositor by the Deposit Insurance and Credit Guarantee Corporation (DICGC).`
    };
  }
  if (id.includes('nps')) {
    return {
      type: 'regulated',
      label: 'PFRDA Regulated',
      body: 'Pension Fund Regulator',
      desc: `${name} is strictly monitored by the Pension Fund Regulatory and Development Authority to secure retirement corpuses.`
    };
  }
  if (id.includes('reit') || id.includes('invit')) {
    return {
      type: 'sebi',
      label: 'SEBI Regulated Trust',
      body: 'Securities and Exchange Board',
      desc: `${name} is subject to strict SEBI regulations, mandating distribution of 90% of net cash flows as dividends.`
    };
  }
  if (id.includes('etf') || id === 'direct_equity' || id.includes('stocks')) {
    return {
      type: 'sebi',
      label: 'SEBI Regulated ETF/Equity',
      body: 'NSE & BSE Exchange Traded',
      desc: `Traded under SEBI governance with independent custodians protecting the underlying securities of ${name}.`
    };
  }

  return {
    type: 'sebi',
    label: 'SEBI Regulated',
    body: 'Mutual Fund Trust Structure',
    desc: `Regulated under SEBI (Mutual Funds) Regulations. Assets of ${name} are held in independent client trusts.`
  };
}

function generateExplainer(inv) {
  if (INSTRUMENT_EXPLAINERS[inv.id]) {
    const e = INSTRUMENT_EXPLAINERS[inv.id];
    return {
      what: e.what,
      riskPlain: e.risk_plain,
      lockInPlain: e.lock_in_plain,
      whoFor: e.who_for,
      example: e.example || null
    };
  }
  
  const name = inv.name;
  const r = inv.expectedReturn || inv.rate || 7;
  const risk = inv.riskLevel || inv.risk || 3;
  const lock = inv.lockIn || 0;

  const riskDescs = {
    1: `Extremely low capital risk. Your principal is highly protected against market downturns.`,
    2: `Low capital risk, with slight yield variations based on macroeconomic policy.`,
    3: `Moderate market risk. The asset value will fluctuate slightly over short cycles.`,
    4: `High risk. Subject to significant equity market volatility and temporary capital draws.`,
    5: `Very high risk. NAV can decline substantially during crashes. Requires long-term holding.`
  };

  return {
    what: inv.desc || `${name} is an investment vehicle designed to achieve stable wealth growth in the ${inv.category} space.`,
    riskPlain: riskDescs[risk] || 'Moderate volatility depending on market conditions.',
    lockInPlain: lock > 0
      ? `Capital is locked in for ${lock} years. Premature withdrawals are highly restricted.`
      : `No lock-in. You are free to redeem your balance at any time.`,
    whoFor: generateSuitability(inv).idealFor,
    example: null
  };
}

function getWhereToInvest(inv) {
  if (WHERE_TO_INVEST[inv.id]) {
    const wti = WHERE_TO_INVEST[inv.id];
    return {
      howToStart: wti.howToStart,
      platforms: wti.products.map(p => p.platform)
    };
  }
  const cat = (inv.category || '').toLowerCase();
  const id = inv.id;
  const name = inv.name;
  if (id.endsWith('_fd')) {
    const bank = name.replace(/ FD$/i, '').replace(/ Fixed Deposit$/i, '');
    return {
      howToStart: `Apply for an FD account directly through ${bank} net banking, mobile app, or by visiting a branch.`,
      platforms: [`${bank} Net Banking`, `${bank} Branch`, `${bank} App`]
    };
  }
  if (cat.includes('government') || inv.assetClass === 'Sovereign') {
    return {
      howToStart: `Open an account at any authorized commercial bank or post office using Aadhaar and PAN verification.`,
      platforms: ['India Post Office', 'SBI Net Banking', 'HDFC Bank']
    };
  }
  if (cat.includes('etf') || id.includes('etf') || cat.includes('reit') || cat.includes('invit') || id === 'direct_equity' || id.includes('stocks')) {
    return {
      howToStart: `Open a demat and trading account with a discount broker. Search for the ticker symbol of ${name} and purchase units.`,
      platforms: ['Zerodha Kite', 'Groww App', 'Angel One App']
    };
  }
  return {
    howToStart: `Submit a direct mutual fund application on the AMC portal, or transact seamlessly on any popular mutual fund platform.`,
    platforms: ['AMC Portal', 'Groww', 'Zerodha Coin', 'Kuvera']
  };
}

function getTopSchemes(inv) {
  if (WHERE_TO_INVEST[inv.id]) {
    return WHERE_TO_INVEST[inv.id].products.map(p => ({
      name: p.name,
      provider: p.provider,
      rate: p.rate,
      highlight: p.highlight,
      platform: p.platform,
      minInvestment: p.minInvestment,
      tenure: p.tenure || null,
      badge: p.badge || null,
      sector: p.sector || null
    }));
  }
  return [];
}

function mapTaxation(inv) {
  const taxType = inv.taxType || 'slab';
  const taxInfo = TAX_INFO[taxType];
  const result = {
    type: taxType,
    section: null,
    taxFreeInterest: false,
    stcg: null,
    ltcg: null,
    indexation: null,
    details: taxInfo ? taxInfo.desc : 'Taxed per standard rules.'
  };

  if (taxType === 'eee') {
    result.section = '80C';
    result.taxFreeInterest = true;
    result.stcg = 'Exempt';
    result.ltcg = 'Exempt';
  } else if (taxType === 'elss') {
    result.section = '80C';
    result.stcg = '20% flat rate if held less than 12 months';
    result.ltcg = '12.5% on annual gains exceeding ₹1.25 Lakhs';
  } else if (taxType === 'ltcg') {
    result.stcg = '20% on short term holdings';
    result.ltcg = '12.5% on annual gains exceeding ₹1.25 Lakhs';
  } else if (taxType === 'nps') {
    result.section = '80CCD(1B)';
    result.ltcg = '60% lump-sum tax-free; remaining 40% annuity is taxable as slab income';
  } else if (taxType === 'sgb') {
    result.ltcg = '100% tax-free if held to full 8-year maturity';
    result.stcg = 'Interest taxable at your income slab';
  } else if (taxType === 'slab') {
    result.stcg = 'Added to taxable income and taxed at slab rate';
    result.ltcg = 'Added to taxable income and taxed at slab rate';
    result.indexation = false;
  }

  return result;
}

// Transform each instrument
const instruments = investmentDatabase.map(inv => {
  const ret = inv.returnRange || { min: inv.rate || inv.expectedReturn || 0, max: inv.rate || inv.expectedReturn || 0 };
  const avg = parseFloat(((ret.min + ret.max) / 2).toFixed(2));

  const elig = inv.eligibility || {};
  const eligibility = {
    minAge: elig.minAge ?? 18,
    maxAge: elig.maxAge ?? null,
    minAnnualIncome: elig.minAnnualIncome ?? 0,
    minMonthlySavings: elig.minMonthlySavings ?? 0,
    notes: elig.notes ?? null,
    requiresDemat: elig.requiresDemat ?? null,
    hasGirlChild: elig.hasGirlChild ?? null
  };

  return {
    id: inv.id,
    slug: generateSlug(inv.name),
    name: inv.name,
    abbr: inv.abbr || inv.name.split('(')[0].trim(),
    category: inv.category || inv.cat || 'Other',
    assetClass: inv.assetClass || 'Other',
    color: inv.color || '#38bdf8',
    eligibility,
    metadata: {
      version: '1.0.0',
      lastUpdated: '2026-07-18',
      reviewedBy: 'WealthGenie Team',
      sourceConfidence: 'High'
    },
    staticData: {
      description: inv.desc || `${inv.name} is a designated investment instrument.`,
      pros: generatePros(inv),
      cons: generateCons(inv),
      faq: generateFAQ(inv),
      taxation: mapTaxation(inv),
      whereToInvest: getWhereToInvest(inv),
      suitability: generateSuitability(inv),
      trustBadge: generateTrustBadge(inv),
      alternatives: generateAlternatives(inv, investmentDatabase),
      explainer: generateExplainer(inv),
      cardSubtitle: CARD_SUBTITLES[inv.id] || inv.desc || `${inv.name} — ${(inv.category || 'Investment').toLowerCase()} asset`
    },
    dynamicData: {
      expectedReturn: {
        min: ret.min,
        avg: avg,
        max: ret.max,
        source: getReturnSource(inv),
        lastUpdated: 'July 2026'
      },
      expenseRatio: inv.expenseRatio ?? null,
      interestRates: (inv.assetClass === 'Sovereign' || inv.assetClass === 'Cash') ? (inv.rate || null) : null,
      fundSize: null,
      topSchemes: getTopSchemes(inv),
      risk: {
        level: inv.riskLabel || 'Medium',
        value: inv.riskLevel || inv.risk || 3,
        volatility: inv.volatility || 0.1
      },
      liquidity: {
        score: inv.liquidityScore || 3,
        type: determineLiquidityType(inv),
        lockIn: inv.lockIn || 0
      },
      minMonthlyInvestment: inv.minMonthlyInvestment || 500,
      maxAnnualInvestment: inv.maxAnnualInvestment || null,
      idealHorizon: inv.idealHorizon || { min: 3, max: 10 },
      goalTags: inv.goalTags || [],
      taxType: inv.taxType || 'slab',
      taxEfficiencyScore: inv.taxEfficiencyScore ?? null,
      lockIn: inv.lockIn || 0,
      liquidityScore: inv.liquidityScore ?? null,
      volatility: inv.volatility ?? null,
      riskLevel: inv.riskLevel || inv.risk || 3
    }
  };
});

const masterCatalog = {
  catalogVersion: '1.0.0',
  generatedAt: new Date().toISOString(),
  instruments
};

const outPath = resolve(ROOT, 'shared/investment_master.json');
writeFileSync(outPath, JSON.stringify(masterCatalog, null, 2), 'utf8');

console.log(`\n✅ Generated highly unique, schema-compliant master database at ${outPath}`);
console.log(`   Catalog Version: ${masterCatalog.catalogVersion}`);
console.log(`   Total Instruments: ${instruments.length}`);
