/**
 * DeepDiveModal — Why Invest Tab (Cost of Doing Nothing)
 * Extracted from DeepDiveModal.jsx for maintainability.
 */
import React from 'react';
import { TrendingDown, TrendingUp, ArrowRight } from 'lucide-react';
import { formatINR } from '../../utils/indianNumberFormat';
import { calculateSIPFutureValue, calculateLumpSumFutureValue } from '../../utils/sipCalculator';

const SAVINGS_RATE = 2.7; // SBI savings account rate (May 2026, above ₹10L: 2.7%)
const INFLATION = 6; // India CPI 10-yr avg ~5.8%, rounded to 6%

const WhyInvestTab = ({ inv, calcAmount, calcReturn, calcYears, calcMode, maturityValue, realMaturityValue, totalInvested, setActiveTab }) => {
  const realLossRate = (INFLATION - SAVINGS_RATE).toFixed(1);

  const savingsMaturity = calcMode === 'SIP'
    ? calculateSIPFutureValue(calcAmount, SAVINGS_RATE, calcYears)
    : calculateLumpSumFutureValue(calcAmount, SAVINGS_RATE, calcYears);
  const savingsReal = savingsMaturity / Math.pow(1 + INFLATION / 100, calcYears);
  const investMaturity = maturityValue;
  const investReal = realMaturityValue;
  const opportunityCost = investReal - savingsReal;
  const purchasingPowerLost = totalInvested - savingsReal;

  // Year-by-year erosion table
  const erosionData = [];
  for (let y = 1; y <= Math.min(calcYears, 10); y++) {
    const savVal = calcMode === 'SIP'
      ? calculateSIPFutureValue(calcAmount, SAVINGS_RATE, y)
      : calculateLumpSumFutureValue(calcAmount, SAVINGS_RATE, y);
    const invVal = calcMode === 'SIP'
      ? calculateSIPFutureValue(calcAmount, calcReturn, y)
      : calculateLumpSumFutureValue(calcAmount, calcReturn, y);
    const infFactor = Math.pow(1 + INFLATION / 100, y);
    erosionData.push({
      year: y,
      savingsNominal: savVal,
      savingsReal: savVal / infFactor,
      investNominal: invVal,
      investReal: invVal / infFactor,
      principalAtYear: calcMode === 'SIP' ? calcAmount * 12 * y : calcAmount,
    });
  }

  return (
    <div className="tab-fade-in">
      <div className="ddm-section-header">The Cost of Doing Nothing</div>

      {/* Hero Warning Banner */}
      <div className="why-invest-hero">
        <div className="why-invest-hero-icon"><TrendingDown size={24} /></div>
        <div>
          <div className="why-invest-hero-title">Inflation is silently eating your savings</div>
          <div className="why-invest-hero-subtitle">
            At {INFLATION}% inflation, your money loses ~half its purchasing power every 14 years.
            A savings account at {SAVINGS_RATE}% doesn't even keep up — you lose {realLossRate}% purchasing power every year.
          </div>
        </div>
      </div>

      {/* Side-by-side comparison cards */}
      <div className="why-invest-compare-grid">
        <div className="why-invest-card why-invest-card--bad">
          <div className="why-invest-card-header">
            <div className="why-invest-card-icon why-invest-card-icon--bad">
              <TrendingDown size={18} />
            </div>
            <div>
              <div className="why-invest-card-title">Savings Account</div>
              <div className="why-invest-card-rate">{SAVINGS_RATE}% p.a.</div>
            </div>
          </div>
          <div className="why-invest-card-body">
            <div className="why-invest-metric">
              <span className="why-invest-metric-label">After {calcYears} years (nominal)</span>
              <span className="why-invest-metric-value">{formatINR(savingsMaturity)}</span>
            </div>
            <div className="why-invest-metric">
              <span className="why-invest-metric-label">Real value (today's ₹)</span>
              <span className="why-invest-metric-value why-invest-metric-value--loss">{formatINR(savingsReal)}</span>
            </div>
            <div className="why-invest-verdict why-invest-verdict--loss">
              <TrendingDown size={14} />
              <span>You <strong>lose</strong> {formatINR(purchasingPowerLost)} in purchasing power</span>
            </div>
          </div>
        </div>

        <div className="why-invest-card why-invest-card--good">
          <div className="why-invest-card-header">
            <div className="why-invest-card-icon why-invest-card-icon--good">
              <TrendingUp size={18} />
            </div>
            <div>
              <div className="why-invest-card-title">{inv.name}</div>
              <div className="why-invest-card-rate">{calcReturn}% p.a.</div>
            </div>
          </div>
          <div className="why-invest-card-body">
            <div className="why-invest-metric">
              <span className="why-invest-metric-label">After {calcYears} years (nominal)</span>
              <span className="why-invest-metric-value">{formatINR(investMaturity)}</span>
            </div>
            <div className="why-invest-metric">
              <span className="why-invest-metric-label">Real value (today's ₹)</span>
              <span className="why-invest-metric-value why-invest-metric-value--gain">{formatINR(investReal)}</span>
            </div>
            <div className="why-invest-verdict why-invest-verdict--gain">
              <TrendingUp size={14} />
              <span>You <strong>grow</strong> wealth by {formatINR(opportunityCost)} more</span>
            </div>
          </div>
        </div>
      </div>

      {/* Opportunity Cost Highlight */}
      <div className="why-invest-opportunity">
        <div className="why-invest-opportunity-label">Opportunity Cost of Not Investing</div>
        <div className="why-invest-opportunity-value">{formatINR(opportunityCost)}</div>
        <div className="why-invest-opportunity-sub">
          This is the real money you leave on the table by choosing a savings account over {inv.name} for {calcYears} years
        </div>
      </div>

      {/* Year-by-Year Erosion Table */}
      <div className="ddm-section-header" style={{ marginTop: 28 }}>Year-by-Year Comparison</div>
      <div className="why-invest-table-wrap">
        <table className="why-invest-table">
          <thead>
            <tr>
              <th>Year</th>
              <th>Principal</th>
              <th className="why-invest-th--bad">Savings (Real ₹)</th>
              <th className="why-invest-th--good">{inv.name.length > 12 ? inv.name.substring(0,12) + '..' : inv.name} (Real ₹)</th>
              <th>Difference</th>
            </tr>
          </thead>
          <tbody>
            {erosionData.map(d => (
              <tr key={d.year}>
                <td>{d.year}</td>
                <td>{formatINR(d.principalAtYear)}</td>
                <td className="why-invest-td--bad">{formatINR(d.savingsReal)}</td>
                <td className="why-invest-td--good">{formatINR(d.investReal)}</td>
                <td style={{ color: d.investReal > d.savingsReal ? '#22c55e' : '#f43f5e', fontWeight: 700 }}>
                  {d.investReal > d.savingsReal ? '+' : ''}{formatINR(d.investReal - d.savingsReal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom CTA */}
      <div className="why-invest-cta">
        <div className="why-invest-cta-text">
          <strong>The best time to invest was yesterday.</strong> The second best time is today.
        </div>
        <button
          className="why-invest-cta-btn"
          onClick={() => setActiveTab('Calculator')}
        >
          Open Calculator <ArrowRight size={14} />
        </button>
      </div>

      <p style={{ color: 'var(--ddm-text-muted)', fontSize: '0.65rem', marginTop: 16, textAlign: 'center', fontStyle: 'italic', lineHeight: 1.5 }}>
        * All "Real Value" figures are adjusted for {INFLATION}% annual inflation (India CPI avg).
        Savings account rate assumed at {SAVINGS_RATE}% (SBI, 2026). Returns are estimates, not guaranteed.
      </p>
    </div>
  );
};

export default WhyInvestTab;
