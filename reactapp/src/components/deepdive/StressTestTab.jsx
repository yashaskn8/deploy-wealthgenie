/**
 * DeepDiveModal — Stress Test Tab (Crash Drawdown Simulator)
 * Extracted from DeepDiveModal.jsx for maintainability.
 */
import React from 'react';
import { AlertCircle, Info, Flame } from 'lucide-react';
import { formatINR } from '../../utils/indianNumberFormat';

const StressTestTab = ({ inv, stressTestAmount, setStressTestAmount }) => {
  const cat = (inv.category || '').toLowerCase();
  const id = (inv.id || '').toLowerCase();
  const name = (inv.name || '').toLowerCase();

  const isGold = name.includes('gold') || id.includes('gold') || id === 'sgb' || id.includes('sgb_');
  const isGovt = cat.includes('government') || cat.includes('sovereign') || ['ppf', 'scss', 'sukanya', 'nsc', 'kvp', 'pomis', 'mssc', 'apy'].includes(id);
  const isDebt = cat.includes('debt') || cat.includes('deposit') || cat.includes('bond') || name.includes('bond') || id.endsWith('_fd') || id === 'fd' || id === 'po_rd' || id === 'po_td_1yr';
  const isReit = cat.includes('reit') || cat.includes('invit');
  const isEquity = !isGold && !isGovt && !isDebt && !isReit;

  const crashScenarios = isGold ? [
    { name: '2013 Gold Crash', period: 'Apr 2013 – Dec 2015', drop: -26, recovery: '~6 years', recoveryMultiplier: 1.0, cause: 'Fed taper tantrum, strong dollar, India import duty hikes to 10%' },
    { name: '2020 COVID Correction', period: 'Aug 2020 – Mar 2021', drop: -12, recovery: '6 months', recoveryMultiplier: 1.02, cause: 'Post-COVID profit booking, vaccine optimism, risk-on sentiment' },
  ] : isGovt ? [
    { name: '2013 Taper Tantrum', period: 'May 2013 – Aug 2013', drop: -3, recovery: '4 months', recoveryMultiplier: 1.01, cause: 'US Fed policy shift, INR depreciation from ₹54 to ₹68/$' },
    { name: '2022 Rate Hike Cycle', period: 'Apr 2022 – Oct 2022', drop: -2, recovery: '3 months', recoveryMultiplier: 1.005, cause: 'RBI hiked repo rate by 250 bps (4.0% → 6.5%)' },
  ] : isDebt ? [
    { name: '2008 Credit Crisis', period: 'Sep 2008 – Mar 2009', drop: -5, recovery: '4-6 months', recoveryMultiplier: 1.02, cause: 'Global credit freeze, sharp bond yield spike, FII outflows' },
    { name: '2020 Franklin Templeton', period: 'Apr 2020', drop: -4, recovery: 'Capital locked 2-3 yrs', recoveryMultiplier: 1.10, cause: '6 debt schemes wound up due to illiquidity; investors got 107-113% back eventually' },
    { name: '2022 Rising Rates', period: 'Apr 2022 – Oct 2022', drop: -3, recovery: '5 months', recoveryMultiplier: 1.01, cause: 'RBI hiked repo rate by 250 bps, global bond selloff' },
  ] : isReit ? [
    { name: '2020 COVID Vacancy Shock', period: 'Mar 2020 – Oct 2020', drop: -18, recovery: '12 months', recoveryMultiplier: 1.05, cause: 'Work-from-home sentiment, commercial leasing pause, broad REIT sell-off' },
    { name: '2022 Rate Hike Impact', period: 'Apr 2022 – Dec 2022', drop: -10, recovery: '8 months', recoveryMultiplier: 1.02, cause: 'Rising cost of capital, yields on government bonds rose making REIT yields less attractive' },
  ] : [
    { name: '2008 Global Financial Crisis', period: 'Jan 2008 – Mar 2009', drop: -60, recovery: '~60 months', recoveryMultiplier: 1.02, cause: 'Lehman Brothers collapse, global recession, Nifty fell from 6,357 to 2,524' },
    { name: '2020 COVID-19 Crash', period: 'Feb 2020 – Mar 2020', drop: -38, recovery: '~9 months', recoveryMultiplier: 1.04, cause: 'Pandemic lockdowns, global panic selling, Nifty fell from 12,430 to 7,511' },
    { name: '2022 Rate Hike Correction', period: 'Oct 2021 – Jun 2022', drop: -17, recovery: '~7 months', recoveryMultiplier: 1.01, cause: 'US Fed tightening, Russia-Ukraine war, FII outflows of ₹1.4L Cr' },
  ];

  const testAmount = stressTestAmount;

  return (
    <div className="tab-fade-in">
      <div className="ddm-section-header">Crash Stress Test</div>

      <div className="stress-hero">
        <div className="stress-hero-icon"><Flame size={24} /></div>
        <div>
          <div className="stress-hero-title">What happens when markets crash?</div>
          <div className="stress-hero-subtitle">
            Every investment faces downturns. The key isn't avoiding crashes — it's understanding
            that <strong style={{ color: '#fbbf24' }}>markets always recover</strong> for patient investors.
          </div>
        </div>
      </div>

      <div className="stress-amount-input-container">
        <label className="stress-amount-label">Enter your investment amount to simulate</label>
        <div className="stress-amount-input-wrapper">
          <span className="stress-amount-prefix">₹</span>
          <input
            type="number"
            className="stress-amount-input"
            value={stressTestAmount}
            onChange={(e) => {
              const val = Math.max(1000, Math.min(10000000, Number(e.target.value) || 0));
              setStressTestAmount(val);
            }}
            min={1000}
            max={10000000}
            step={1000}
          />
        </div>
        <span className="stress-amount-hint">Min ₹1,000 · Max ₹1 Crore</span>
      </div>

      <div className="stress-scenarios">
        {crashScenarios.map((crash, i) => {
          const lostAmount = testAmount * (Math.abs(crash.drop) / 100);
          const bottomValue = testAmount - lostAmount;
          const recoveryValue = Math.round(testAmount * crash.recoveryMultiplier);
          const recoveryGain = recoveryValue - testAmount;
          return (
            <div key={i} className="stress-card">
              <div className="stress-card-header">
                <span className="stress-card-emoji"><AlertCircle size={20} /></span>
                <div>
                  <div className="stress-card-name">{crash.name}</div>
                  <div className="stress-card-period">{crash.period}</div>
                </div>
              </div>

              <div className="stress-card-body">
                <div className="stress-card-cause">{crash.cause}</div>

                <div className="stress-drop-visual">
                  <div className="stress-drop-bar">
                    <div
                      className="stress-drop-bar-fill"
                      style={{ width: `${Math.min(Math.abs(crash.drop), 100)}%` }}
                    />
                  </div>
                  <div className="stress-drop-stats">
                    <div className="stress-stat">
                      <span className="stress-stat-label">Max Drop</span>
                      <span className="stress-stat-value stress-stat-value--drop">{crash.drop}%</span>
                    </div>
                    <div className="stress-stat">
                      <span className="stress-stat-label">Recovery</span>
                      <span className="stress-stat-value stress-stat-value--recovery">{crash.recovery}</span>
                    </div>
                  </div>
                </div>

                <div className="stress-scenario-box">
                  <div className="stress-scenario-title">If you had {formatINR(testAmount)} invested:</div>
                  <div className="stress-scenario-flow">
                    <div className="stress-flow-item">
                      <span className="stress-flow-label">Before</span>
                      <span className="stress-flow-value">{formatINR(testAmount)}</span>
                    </div>
                    <span className="stress-flow-arrow">→</span>
                    <div className="stress-flow-item stress-flow-item--drop">
                      <span className="stress-flow-label">Bottom</span>
                      <span className="stress-flow-value">{formatINR(bottomValue)}</span>
                    </div>
                    <span className="stress-flow-arrow">→</span>
                    <div className="stress-flow-item stress-flow-item--recover">
                      <span className="stress-flow-label">After {crash.recovery}</span>
                      <span className="stress-flow-value">{formatINR(recoveryValue)}</span>
                      {recoveryGain !== 0 && (
                        <span style={{ fontSize: '0.65rem', color: recoveryGain > 0 ? '#10b981' : '#ef4444', fontWeight: 700, marginTop: 2 }}>
                          {recoveryGain > 0 ? '+' : ''}{formatINR(recoveryGain)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="stress-insight">
        <div className="stress-insight-icon"><Info size={24} /></div>
        <div>
          <div className="stress-insight-title">The #1 rule during a crash</div>
          <div className="stress-insight-text">
            {isEquity
              ? 'Investors who stayed invested during the 2020 crash saw their portfolio grow 100%+ within 18 months. Those who panic-sold locked in their losses permanently.'
              : isDebt
                ? 'Debt fund drawdowns are typically small (3-8%) and recover quickly. The real risk in debt is credit default — always choose high-quality AAA-rated funds.'
                : isGovt
                  ? 'Government-backed instruments have near-zero default risk. Short-term NAV fluctuations do not affect your maturity value.'
                  : 'Stay invested. Time in the market beats timing the market — every single time.'
            }
          </div>
        </div>
      </div>

      <p style={{ color: 'var(--ddm-text-muted)', fontSize: '0.65rem', marginTop: 16, textAlign: 'center', fontStyle: 'italic', lineHeight: 1.5 }}>
        * Historical drawdowns sourced from NSE (Nifty 50), BSE (Sensex), CRISIL Bond Index, and MCX Gold data.
        Recovery = time to reclaim previous peak. Past crashes do not predict future events.
      </p>
    </div>
  );
};

export default StressTestTab;
