/**
 * WealthGenie — GenieChat Helper Utilities & Hooks
 * ────────────────────────────────────────────────
 * Extracted from GenieChat.jsx for maintainability.
 */
import { useState, useEffect } from 'react';

// Set of messages that have already completed streaming/typewriter effect
export const streamedMessages = new WeakSet();

// ── Full INR formatting helper (bypassing compact suffix) ────────
export function formatFullINR(val) {
  if (val === null || val === undefined || isNaN(val)) return '₹0';
  const num = Number(val);
  if (!isFinite(num)) return '₹∞';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

// ── SIP Compound Interest Math ────────────────────────────────────
export function calculateStepUpSIP(monthlySIP, annualStepUpPercent, years, rateOfReturn = 12) {
  let totalInvested = 0;
  let terminalValue = 0;
  let currentMonthlySIP = monthlySIP;
  const monthlyRate = rateOfReturn / 12 / 100;
  
  for (let year = 1; year <= years; year++) {
    for (let month = 1; month <= 12; month++) {
      totalInvested += currentMonthlySIP;
      terminalValue = (terminalValue + currentMonthlySIP) * (1 + monthlyRate);
    }
    currentMonthlySIP = currentMonthlySIP * (1 + annualStepUpPercent / 100);
  }
  
  return {
    totalInvested: Math.round(totalInvested),
    terminalValue: Math.round(terminalValue),
    wealthGain: Math.round(terminalValue - totalInvested)
  };
}

// ── Indian Income Tax slab calculator (simplified high-fidelity) ──
export function calculateTaxes(grossIncome, deduction80C, deductionNPS) {
  const stdDeductionNew = 75000;
  const taxableNew = Math.max(0, grossIncome - stdDeductionNew);
  let taxNew = 0;
  
  if (taxableNew <= 1200000) {
    taxNew = 0;
  } else {
    let temp = taxableNew;
    if (temp > 2400000) { taxNew += (temp - 2400000) * 0.30; temp = 2400000; }
    if (temp > 2000000) { taxNew += (temp - 2000000) * 0.25; temp = 2000000; }
    if (temp > 1600000) { taxNew += (temp - 1600000) * 0.20; temp = 1600000; }
    if (temp > 1200000) { taxNew += (temp - 1200000) * 0.15; temp = 1200000; }
    if (temp > 800000) { taxNew += (temp - 800000) * 0.10; temp = 800000; }
    if (temp > 400000) { taxNew += (temp - 400000) * 0.05; }

    const excessOverLimit = taxableNew - 1200000;
    if (taxNew > excessOverLimit) {
      taxNew = excessOverLimit;
    }
  }
  taxNew = taxNew * 1.04;

  const stdDeductionOld = 50000;
  const deductionsOld = Math.min(150000, Number(deduction80C) || 0) + Math.min(50000, Number(deductionNPS) || 0);
  const taxableOld = Math.max(0, grossIncome - stdDeductionOld - deductionsOld);
  let taxOld = 0;
  
  if (taxableOld <= 500000) {
    taxOld = 0;
  } else {
    let temp = taxableOld;
    if (temp > 1000000) { taxOld += (temp - 1000000) * 0.30; temp = 1000000; }
    if (temp > 500000) { taxOld += (temp - 500000) * 0.20; temp = 500000; }
    if (temp > 250000) { taxOld += (temp - 250000) * 0.05; }
  }
  taxOld = taxOld * 1.04;

  return {
    taxableNew: Math.round(taxableNew),
    taxNew: Math.round(taxNew),
    taxableOld: Math.round(taxableOld),
    taxOld: Math.round(taxOld),
    difference: Math.round(Math.abs(taxOld - taxNew)),
    betterRegime: taxNew <= taxOld ? 'new' : 'old'
  };
}

// ── Suggested questions ───────────────────────────────────────────
export function getSuggestedQuestions(_profile) {
  const questions = [
    'Explain portfolio balancing in simple terms',
    'How do I start my first investment?',
    'Which tax regime is best for a beginner?',
    'How does compound growth build wealth?',
    'What is a safe investment mix for my age?',
  ];
  return questions.slice(0, 4);
}

// ── Parse ACTION_CARD blocks from AI response ─────────────────────
export function parseActionCards(text) {
  const cards = [];
  const regex = /<<<ACTION_CARD>>>\s*([\s\S]*?)\s*<<<END_ACTION_CARD>>>/g;
  let match;
  let cleanText = text;
  while ((match = regex.exec(text)) !== null) {
    try {
      let jsonStr = match[1].replace(/^```json?\s*/gm, '').replace(/^```\s*$/gm, '').trim();
      jsonStr = jsonStr.replace(/\/\/.*$/gm, '');
      jsonStr = jsonStr.replace(/,[ \t\r\n]*([}\]])/g, '$1');
      const card = JSON.parse(jsonStr);
      cards.push(card);
      cleanText = cleanText.replace(match[0], '');
    } catch (e) {
      console.warn('[GenieChat] Failed to parse action card:', e.message);
    }
  }
  return { cleanText: cleanText.trim(), cards };
}

// ── Contextual Follow-Up Pills ────────────────────────────────────
export function generateContextualPills(lastQ) {
  if (!lastQ) return [];
  const q = lastQ.toLowerCase();
  if (q.includes('rebalance') || q.includes('allocation')) return ['Show ideal asset allocation', 'What if I go 80/20 equity?', 'Compare to balanced fund'];
  if (q.includes('tax')) return ['Which regime saves more?', 'Section 80C breakdown', 'Post-tax FD return'];
  if (q.includes('sip') || q.includes('invest') || q.includes('step')) return ['10-year SIP projection', 'Ideal yearly step-up %', 'What if I double my SIP?'];
  if (q.includes('retire') || q.includes('goal')) return ['Am I on track?', 'Retire 5 years early?', 'SIP for ₹1 crore'];
  if (q.includes('crash') || q.includes('market')) return ['40% crash impact?', 'Invest during crashes?', 'Portfolio risk score'];
  return ['Rebalance my portfolio', 'Tax savings this year'];
}

// ── Streamed Typing Effect ────────────────────────────────────────
export function useStreamedText(text, speed = 8) {
  const [prevText, setPrevText] = useState(text);
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  if (text !== prevText) {
    setPrevText(text);
    setDisplayed('');
    setDone(false);
  }

  useEffect(() => {
    if (!text) return;
    let i = 0;
    const id = setInterval(() => {
      i += 2;
      if (i >= text.length) { setDisplayed(text); setDone(true); clearInterval(id); }
      else setDisplayed(text.slice(0, i));
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return { displayed, done };
}
