/**
 * DeepDiveModal — Calculator Tab (Wealth Projection Engine)
 * Extracted from DeepDiveModal.jsx for maintainability.
 */
import React from 'react';
import { Shield, TrendingUp, Info, ExternalLink } from 'lucide-react';
import { formatINR } from '../../utils/indianNumberFormat';

const INFLATION_RATE = 6;

const CalculatorTab = ({ inv, calcAmount, setCalcAmount, calcYears, setCalcYears, calcReturn, setCalcReturn, calcBounds, calcMode, maturityValue, totalInvested, estimatedReturns, postTaxValue, realMaturityValue }) => {
  return (
    <div className="tab-fade-in">
      <div className="ddm-section-header">Wealth Projection Engine</div>

      {/* Range Info Banner */}
      <div style={{ 
        display: 'flex', alignItems: 'center', gap: 12, 
        padding: '14px 20px', borderRadius: '16px', marginBottom: 24,
        background: 'linear-gradient(90deg, rgba(56, 189, 248, 0.1), rgba(56, 189, 248, 0.02))',
        border: '1px solid rgba(56, 189, 248, 0.2)',
        borderLeft: '4px solid #38bdf8',
        fontSize: '0.85rem', color: '#cbd5e1',
        boxShadow: '0 8px 24px -8px rgba(56,189,248,0.1)'
      }}>
        <Info size={18} style={{ flexShrink: 0, color: '#7dd3fc' }} />
        <span>Sliders are auto-calibrated to <strong style={{ color: '#f8fafc', fontWeight: 800 }}>{inv.name}'s</strong> realistic parameters. Expected Return: <strong style={{ color: '#38bdf8' }}>{calcBounds.returnMin}%–{calcBounds.returnMax}%</strong> | Tenure: <strong style={{ color: '#38bdf8' }}>{calcBounds.yearMin}–{calcBounds.yearMax} yrs</strong></span>
      </div>

      <div className="calc-premium-grid">
        <div className="calc-inputs-vertical">
          <div className="calc-field">
            <div className="calc-label-row">
              <label className="metric-label">Periodic Allocation</label>
              <span className="calc-value-display">₹{calcAmount.toLocaleString()}</span>
            </div>
            <input 
              type="range" 
              min="1000" max="500000" step="1000" 
              value={calcAmount} 
              onChange={e => setCalcAmount(Number(e.target.value))} 
              style={{ 
                '--slider-pct': `${(calcAmount - 1000)/(500000 - 1000) * 100}%`
              }} 
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: '#475569', marginTop: 4 }}>
              <span>₹1,000</span><span>₹5,00,000</span>
            </div>
          </div>
          <div className="calc-field">
            <div className="calc-label-row">
              <label className="metric-label">Time Horizon</label>
              <span className="calc-value-display">{calcYears} {calcYears === 1 ? 'Year' : 'Years'}</span>
            </div>
            <input 
              type="range" 
              min={calcBounds.yearMin} max={calcBounds.yearMax} 
              value={calcYears} 
              onChange={e => setCalcYears(Number(e.target.value))} 
              style={{ 
                '--slider-pct': `${(calcYears - calcBounds.yearMin)/Math.max(1, calcBounds.yearMax - calcBounds.yearMin) * 100}%`
              }} 
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: '#475569', marginTop: 4 }}>
              <span>{calcBounds.yearMin} yr</span><span>{calcBounds.yearMax} yrs</span>
            </div>
          </div>
          <div className="calc-field">
            <div className="calc-label-row">
              <label className="metric-label">Expected Annual Return</label>
              <span className="calc-value-display">{calcReturn}%</span>
            </div>
            <input 
              type="range" 
              min={calcBounds.returnMin} max={calcBounds.returnMax} step="0.5" 
              value={calcReturn} 
              onChange={e => setCalcReturn(Number(e.target.value))} 
              style={{ 
                '--slider-pct': `${(calcReturn - calcBounds.returnMin)/Math.max(1, calcBounds.returnMax - calcBounds.returnMin) * 100}%`
              }} 
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: '#475569', marginTop: 4 }}>
              <span>{calcBounds.returnMin}%</span>
              <span style={{ color: '#64748b', fontWeight: 600 }}>Avg: {((inv.expected_return_min + inv.expected_return_max) / 2).toFixed(1)}%</span>
              <span>{calcBounds.returnMax}%</span>
            </div>
          </div>
        </div>

        <div className="calc-sidebar">
          <div className="sidebar-stat">
            <span className="sidebar-label">Total Principal</span>
            <span className="sidebar-value" style={{ whiteSpace: 'nowrap' }}>{formatINR(totalInvested)}</span>
          </div>
          <div className="sidebar-stat">
            <span className="sidebar-label">Estimated Yield</span>
            <span className="sidebar-value" style={{ color: '#22c55e', whiteSpace: 'nowrap' }}>+{formatINR(estimatedReturns)}</span>
          </div>
          <div style={{ borderTop: '1px solid var(--ddm-border)', paddingTop: 16 }}>
            <span className="sidebar-label" style={{ color: '#38bdf8' }}>Net Maturity Value</span>
            <span className="sidebar-value" style={{ fontSize: '2.4rem', color: '#7dd3fc', textShadow: '0 4px 24px rgba(56, 189, 248, 0.4)', whiteSpace: 'nowrap', display: 'block', marginTop: '8px' }}>{formatINR(maturityValue)}</span>
          </div>

          {/* Post-Tax & Inflation Section */}
          <div style={{ borderTop: '1px solid var(--ddm-border)', paddingTop: 14, marginTop: 6 }}>
            <div className="sidebar-stat" style={{ marginBottom: 10 }}>
              <span className="sidebar-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Shield size={11} style={{ color: '#f59e0b' }} /> After Tax (est.)
              </span>
              <span className="sidebar-value" style={{ color: '#fbbf24', whiteSpace: 'nowrap', fontSize: '1.1rem' }}>{formatINR(postTaxValue)}</span>
            </div>
            <div className="sidebar-stat">
              <span className="sidebar-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <TrendingUp size={11} style={{ color: '#f97316' }} /> Today's Value ({INFLATION_RATE}% inflation)
              </span>
              <span className="sidebar-value" style={{ color: '#fb923c', whiteSpace: 'nowrap', fontSize: '1.1rem' }}>{formatINR(realMaturityValue)}</span>
            </div>
          </div>

          {/* Goal-Mapping Milestones */}
          {realMaturityValue > 0 && (() => {
            const goals = [
              { min: 20000,     icon: '', label: 'Premium wireless earbuds', amount: '~₹20K' },
              { min: 50000,     icon: '', label: 'iPhone SE / Samsung S24 FE', amount: '~₹50K' },
              { min: 85000,     icon: '', label: 'Honda Activa 6G (on-road)', amount: '~₹85K' },
              { min: 135000,    icon: '', label: 'iPhone 16 Pro', amount: '~₹1.35L' },
              { min: 250000,    icon: '', label: 'Thailand/Bali trip for 2', amount: '~₹2.5L' },
              { min: 500000,    icon: '', label: 'MacBook Pro M4', amount: '~₹5L' },
              { min: 900000,    icon: '', label: 'Maruti Brezza (on-road)', amount: '~₹9L' },
              { min: 1200000,   icon: '', label: '4-yr engineering (state college)', amount: '~₹12L' },
              { min: 1800000,   icon: '', label: 'Hyundai Creta (on-road)', amount: '~₹18L' },
              { min: 2500000,   icon: '', label: 'Middle-class Indian wedding', amount: '~₹25L' },
              { min: 4000000,   icon: '', label: 'MBA from IIM (2-yr total)', amount: '~₹40L' },
              { min: 6000000,   icon: '', label: 'Fortuner / XUV700 (top-end)', amount: '~₹60L' },
              { min: 8000000,   icon: '', label: '2BHK in Bangalore/Pune', amount: '~₹80L' },
              { min: 12000000,  icon: '', label: '3BHK in Mumbai suburb', amount: '~₹1.2Cr' },
              { min: 25000000,  icon: '', label: '3BHK premium metro flat', amount: '~₹2.5Cr' },
              { min: 50000000,  icon: '', label: 'Financial independence (25x rule)', amount: '~₹5Cr' },
              { min: 100000000, icon: '', label: 'Early retirement corpus', amount: '~₹10Cr' },
            ];
            const matched = goals.filter(g => realMaturityValue >= g.min);
            const topGoals = matched.slice(-3).reverse();
            if (topGoals.length === 0) return null;
            return (
              <div className="goal-map-section">
                <div className="goal-map-title">What this money could buy (today's prices)</div>
                {topGoals.map((g, i) => (
                  <div key={i} className="goal-map-item">
                    <span className="goal-map-icon">{g.icon}</span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flex: 1, alignItems: 'center' }}>
                      <span className="goal-map-label">{g.label}</span>
                      <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, flexShrink: 0 }}>{g.amount}</span>
                    </div>
                  </div>
                ))}
                <div style={{ fontSize: '0.6rem', color: '#475569', marginTop: 8, fontStyle: 'italic', lineHeight: 1.4 }}>
                  * Compared using inflation-adjusted value ({INFLATION_RATE}% CPI)
                </div>
              </div>
            );
          })()}

          {/* Save / Export Goal */}
          <div className="goal-export-section">
            <button
              className="goal-export-btn goal-export-btn--pdf"
              onClick={() => {
                const report = `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>WealthGenie – ${inv.name} Goal Report</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Inter',system-ui,sans-serif;background:#0f172a;color:#f1f5f9;padding:40px}
  .header{text-align:center;margin-bottom:32px;padding-bottom:24px;border-bottom:1px solid #1e293b}
  .header h1{font-size:1.8rem;font-weight:800;background:linear-gradient(135deg,#8b5cf6,#38bdf8);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
  .header p{color:#94a3b8;font-size:0.85rem;margin-top:6px}
  .badge{display:inline-block;font-size:0.65rem;font-weight:700;padding:3px 10px;border-radius:6px;background:rgba(139,92,246,0.15);color:#a78bfa;border:1px solid rgba(139,92,246,0.3);margin-top:8px;text-transform:uppercase;letter-spacing:1px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
  .card{background:rgba(30,41,59,0.6);border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:18px}
  .card .label{font-size:0.7rem;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600}
  .card .value{font-size:1.4rem;font-weight:800;margin-top:6px}
  .card .value.green{color:#22c55e}
  .card .value.cyan{color:#38bdf8}
  .card .value.yellow{color:#fbbf24}
  .card .value.orange{color:#fb923c}
  .disclaimer{margin-top:32px;padding-top:16px;border-top:1px solid #1e293b;font-size:0.65rem;color:#475569;text-align:center;line-height:1.6}
  @media print{body{background:#fff;color:#0f172a} .card{border:1px solid #e2e8f0} .card .label{color:#64748b} .card .value{color:#0f172a} .card .value.green{color:#16a34a} .card .value.cyan{color:#0284c7} .header h1{-webkit-text-fill-color:#7c3aed}}
</style></head><body>
<div class="header">
  <h1>WealthGenie</h1>
  <p>Wealth Projection Report for <strong>${inv.name}</strong></p>
  <div class="badge">${inv.category} • ${calcYears} Year Horizon</div>
</div>
<div class="grid">
  <div class="card"><div class="label">Monthly Investment</div><div class="value cyan">₹${calcAmount.toLocaleString('en-IN')}</div></div>
  <div class="card"><div class="label">Expected Return</div><div class="value cyan">${calcReturn}% p.a.</div></div>
  <div class="card"><div class="label">Total Principal</div><div class="value">${formatINR(totalInvested)}</div></div>
  <div class="card"><div class="label">Estimated Yield</div><div class="value green">+${formatINR(estimatedReturns)}</div></div>
  <div class="card"><div class="label">Net Maturity Value</div><div class="value cyan" style="font-size:1.6rem">${formatINR(maturityValue)}</div></div>
  <div class="card"><div class="label">After Tax (est.)</div><div class="value yellow">${formatINR(postTaxValue)}</div></div>
  <div class="card" style="grid-column:span 2"><div class="label">Today's Purchasing Power (6% inflation adjusted)</div><div class="value orange">${formatINR(realMaturityValue)}</div></div>
</div>
<div class="disclaimer">
  Disclaimer: This is a projection based on estimated returns. Past performance does not guarantee future results.<br>
  All figures are indicative. Consult a SEBI-registered investment advisor before investing.<br><br>
  Generated by WealthGenie • ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
</div>
</body></html>`;
                const blob = new Blob([report], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const w = window.open(url, '_blank');
                setTimeout(() => { w?.print(); }, 600);
              }}
            >
              <ExternalLink size={14} />
              Save Goal Report
            </button>
            <button
              className="goal-export-btn goal-export-btn--copy"
              onClick={(e) => {
                const btn = e.currentTarget;
                const summary = `WealthGenie – ${inv.name} Goal Report\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Monthly SIP: ₹${calcAmount.toLocaleString('en-IN')}\n• Expected Return: ${calcReturn}% p.a.\n• Time Horizon: ${calcYears} years\n\n• Total Invested: ${formatINR(totalInvested)}\n• Maturity Value: ${formatINR(maturityValue)}\n• After Tax: ${formatINR(postTaxValue)}\n• Today's Value: ${formatINR(realMaturityValue)}\n\n* Past performance is not indicative of future results.\nGenerated by WealthGenie • ${new Date().toLocaleDateString('en-IN')}`;
                navigator.clipboard.writeText(summary).then(() => {
                  btn.textContent = '✓ Copied!';
                  btn.style.borderColor = '#22c55e';
                  btn.style.color = '#22c55e';
                  setTimeout(() => {
                    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy Summary';
                    btn.style.borderColor = '';
                    btn.style.color = '';
                  }, 2000);
                });
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copy Summary
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalculatorTab;
