import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, Calendar, DollarSign, Sliders, Sparkles, Save, AlertTriangle, ChevronRight, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProjectionBand from './ProjectionBand';
import JargonTooltip from './JargonTooltip';

const PRIORITY_CONFIG = {
  Critical: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)' },
  High:     { color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.3)' },
  Medium:   { color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.15)', border: 'rgba(14, 165, 233, 0.3)' },
  Low:      { color: '#64748b', bg: 'rgba(100, 116, 139, 0.15)', border: 'rgba(100, 116, 139, 0.3)' },
};

const formatINR = (value) => {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)} L`;
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
};

const MetricCard = ({ label, value, icon }) => (
  <div style={{
    background: 'rgba(15, 23, 42, 0.3)', border: '1px solid rgba(255,255,255,0.04)',
    borderRadius: 16, padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'center',
    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.02)'
  }}>
    <div style={{ color: '#94a3b8', display: 'flex', width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.02)', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
    <div>
      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#f1f5f9', marginTop: 4 }}>{value}</div>
    </div>
  </div>
);

export const GoalDetailPane = ({
  selectedGoal,
  simulatedSips,
  onChangeSimulatedSip,
  onPriorityChange,
  onSaveGoalUpdates,
  getLiveProbability,
  getSimulatedChartData
}) => {
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [editTarget, setEditTarget] = useState('');
  const [editSavings, setEditSavings] = useState('');
  const [showMonteCarlo, setShowMonteCarlo] = useState(false);

  useEffect(() => {
    if (selectedGoal) {
      // Batch all state updates into a single synchronous block to avoid
      // cascading re-renders (satisfies react-hooks/set-state-in-effect).
      const resetState = () => {
        setEditTarget(selectedGoal.target_amount || '');
        setEditSavings(selectedGoal.current_savings || '');
        setIsEditingSettings(false);
      };
      resetState();
    }
  }, [selectedGoal]);

  const handleSave = () => {
    onSaveGoalUpdates({
      targetAmount: Number(editTarget),
      currentSavings: Number(editSavings)
    });
    setIsEditingSettings(false);
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '0.85rem',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'all 0.2s',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#94a3b8',
    marginBottom: '6px',
  };

  const goalId = selectedGoal?._id || selectedGoal?.goalId;
  const currentSip = simulatedSips[goalId] || selectedGoal?.recommended_sip || 0;
  const liveProbability = getLiveProbability(selectedGoal);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={goalId}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.3 }}
      >
        {/* Goal Summary Card */}
        <div style={{
          background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.9))', backdropFilter: 'blur(24px)',
          border: '1px solid rgba(6, 182, 212, 0.3)', borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 15px 50px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.05)',
          borderRadius: 24, padding: 32, marginBottom: 24, position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '60%', height: '60%', background: 'radial-gradient(ellipse at center, rgba(139, 92, 246, 0.15), transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Target size={24} color="#38bdf8" />
              {selectedGoal.goal_name} Overview
            </h3>
            <button 
              onClick={() => {
                if (isEditingSettings) {
                  handleSave();
                } else {
                  setIsEditingSettings(true);
                }
              }}
              style={{
                background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)',
                padding: '6px 14px', borderRadius: 10, color: '#38bdf8', fontSize: '0.8rem',
                fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            >
              {isEditingSettings ? <><Save size={14}/> Save Updates</> : 'Change Goal Details'}
            </button>
          </div>

          {isEditingSettings ? (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24, padding: 16, background: 'rgba(15,23,42,0.4)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div>
                <label style={labelStyle}>Target Amount to Save (₹)</label>
                <input 
                  type="number" 
                  value={editTarget} 
                  onChange={e => setEditTarget(e.target.value)} 
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Current Savings Allocated (₹)</label>
                <input 
                  type="number" 
                  value={editSavings} 
                  onChange={e => setEditSavings(e.target.value)} 
                  style={inputStyle}
                />
              </div>
            </motion.div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <MetricCard label="Target" value={formatINR(selectedGoal.target_amount)} icon={<Target size={16} />} />
              <MetricCard label="Recommended Monthly Savings" value={`${formatINR(selectedGoal.recommended_sip)}/mo`} icon={<TrendingUp size={16} />} />
              <MetricCard label="Deadline" value={new Date(selectedGoal.target_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })} icon={<Calendar size={16} />} />
              <MetricCard label="Suggested Plan" value={(selectedGoal.recommended_instrument || '').replace('_', ' ')} icon={<DollarSign size={16} />} />
            </div>
          )}

          {/* Priority Selector */}
          <div style={{ marginTop: 24, padding: 16, background: 'rgba(15, 23, 42, 0.3)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={labelStyle}>How Important is this Goal?</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 8 }}>
              {['Critical', 'High', 'Medium', 'Low'].map(p => {
                const isActive = selectedGoal.priority === p;
                const cfg = PRIORITY_CONFIG[p];
                return (
                  <button
                    key={p}
                    onClick={() => onPriorityChange(p)}
                    style={{
                      background: isActive ? cfg.bg : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isActive ? cfg.color : 'rgba(255,255,255,0.05)'}`,
                      color: isActive ? cfg.color : '#94a3b8',
                      borderRadius: 8, padding: '8px 4px', fontSize: '0.78rem',
                      fontWeight: isActive ? 800 : 500, cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Gap Warning */}
          {selectedGoal.gap_amount > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              style={{
                marginTop: 24, padding: '16px 20px', borderRadius: 16,
                background: 'linear-gradient(90deg, rgba(244, 63, 94, 0.1), rgba(244, 63, 94, 0.05))', border: '1px solid rgba(244, 63, 94, 0.2)',
                fontSize: '0.9rem', color: '#fda4af', display: 'flex', alignItems: 'center', gap: 12,
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05)'
              }}
            >
              <AlertTriangle size={20} color="#f43f5e" style={{ flexShrink: 0 }} />
              <div style={{ lineHeight: 1.5 }}>
                You need to save an extra <strong style={{ color: '#fff' }}>{formatINR(selectedGoal.gap_amount)}</strong> each month to reach your target on time.
              </div>
            </motion.div>
          )}

          {/* Real-time SIP Simulator */}
          <div style={{ marginTop: 24, padding: '20px', background: 'rgba(15, 23, 42, 0.4)', borderRadius: 16, border: '1px solid rgba(56, 189, 248, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <label style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <Sliders size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                See how saving more speeds up your goal (Savings Simulator)
              </label>
              <span style={{ color: '#fff', fontWeight: 800 }}>{formatINR(currentSip)}/mo</span>
            </div>
            <input 
              type="range" 
              min={Math.max(1000, selectedGoal.recommended_sip * 0.2)} 
              max={selectedGoal.recommended_sip * 2.5} 
              step="500" 
              value={currentSip}
              onChange={(e) => onChangeSimulatedSip(Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer', accentColor: '#38bdf8' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '0.7rem', color: '#64748b' }}>
              <span>{formatINR(Math.max(1000, selectedGoal.recommended_sip * 0.2))}</span>
              <span>{formatINR(selectedGoal.recommended_sip * 2.5)}</span>
            </div>
            <div style={{ marginTop: 12, fontSize: '0.85rem', color: '#cbd5e1' }}>
              Use the slider to see how changing your monthly savings impacts your projected growth and increases your chance of meeting your target to <strong style={{ color: liveProbability >= 0.8 ? '#10b981' : '#f59e0b' }}>{Math.round(liveProbability * 100)}%</strong>.
            </div>
          </div>

          {/* Gemini Advice */}
          {selectedGoal.gemini_advice && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              style={{
                marginTop: 20, padding: '20px', borderRadius: 16,
                background: 'linear-gradient(145deg, rgba(6, 182, 212, 0.08), rgba(139, 92, 246, 0.04))', border: '1px solid rgba(6, 182, 212, 0.15)',
                fontSize: '0.92rem', color: '#e2e8f0', lineHeight: 1.6, fontStyle: 'italic',
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05)'
              }}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <Sparkles size={18} color="#38bdf8" style={{ flexShrink: 0, filter: 'drop-shadow(0 0 6px rgba(56,189,248,0.5))' }} />
                <div>{selectedGoal.gemini_advice}</div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Monte Carlo Projection Component */}
        {selectedGoal.chartData && (
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <button
              onClick={() => setShowMonteCarlo(!showMonteCarlo)}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                borderRadius: '12px',
                padding: '10px 20px',
                color: '#38bdf8',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                width: '100%',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {showMonteCarlo ? 'Hide Projections' : 'Simulate Future Growth (Monte Carlo Simulation)'}
            </button>
            {showMonteCarlo && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                style={{ marginTop: 16 }}
              >
                <ProjectionBand
                  chartData={getSimulatedChartData(selectedGoal)}
                  targetAmount={selectedGoal.target_amount}
                  goalProbability={liveProbability}
                  instrumentName={(selectedGoal.recommended_instrument || '').replace('_', ' ')}
                  simulationsRun={selectedGoal.monte_carlo_summary?.simulations_run}
                />
              </motion.div>
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
export default GoalDetailPane;
