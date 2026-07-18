import React, { useState, useMemo, useCallback } from 'react';
import { User } from 'lucide-react';
import profileImg from '../assets/gen_4k_nobull.png';
import * as api from '../services/api';

const PROFILE_STORAGE_KEY = 'wealthgenie_user_profile';

const ProfilePage = ({ onCompleteProfile, children }) => {
  // Try to load saved profile from localStorage, scoped to the current user
  const savedProfile = useMemo(() => {
    try {
      const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // Ensure the saved profile belongs to the current authenticated user
      const currentUser = api.getUserInfo();
      if (currentUser && parsed._userId && parsed._userId !== currentUser.id) {
        // Different user - discard stale profile
        localStorage.removeItem(PROFILE_STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch { return null; }
  }, []);

  const [isComplete, setIsComplete] = useState(!!savedProfile);
  const [age, setAge] = useState(savedProfile?.age || 32);
  const [monthlyIncome, setMonthlyIncome] = useState(savedProfile?.monthly_income || 65000);
  const [monthlySavings, setMonthlySavings] = useState(savedProfile?.monthly_savings || 12000);
  const [riskAppetite, setRiskAppetite] = useState(savedProfile?.risk_appetite || 'Medium');
  const [investmentGoals, setInvestmentGoals] = useState(savedProfile?.investment_goals || ['Retirement', 'Wealth Growth']);
  const [horizon, setHorizon] = useState(savedProfile?.investment_horizon || 15);
  const [taxRegime, setTaxRegime] = useState(savedProfile?.taxRegime || 'new');
  const [profileId, setProfileId] = useState(savedProfile?.profileId || null);

  // New fields (hidden/safe default values for backward compatibility):
  const [liquidSavings, setLiquidSavings] = useState(savedProfile?.liquid_savings !== undefined ? savedProfile.liquid_savings : 0);
  const [existingDebt, setExistingDebt] = useState(savedProfile?.existing_debt !== undefined ? savedProfile.existing_debt : 0);
  const [dependents, setDependents] = useState(savedProfile?.dependents !== undefined ? savedProfile.dependents : 0);
  const [emergencyFundMonths, setEmergencyFundMonths] = useState(savedProfile?.emergency_fund_months !== undefined ? savedProfile.emergency_fund_months : 0);
  const [riskTolerance, setRiskTolerance] = useState(savedProfile?.risk_tolerance || 'Moderate');
  const [goalType, setGoalType] = useState(savedProfile?.goal_type || 'wealth-building');

  const toggleGoal = (goal) => {
    setInvestmentGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  };

  const userProfilePayload = useMemo(() => ({
    age: Number(age),
    monthly_income: Number(monthlyIncome),
    monthly_savings: Number(monthlySavings),
    risk_appetite: riskAppetite,
    investment_goals: investmentGoals,
    investment_horizon: horizon,
    taxRegime,
    profileId,
    liquid_savings: Number(liquidSavings),
    existing_debt: Number(existingDebt),
    dependents: Number(dependents),
    emergency_fund_months: Number(emergencyFundMonths),
    risk_tolerance: riskTolerance,
    goal_type: goalType
  }), [
    age, monthlyIncome, monthlySavings, riskAppetite, investmentGoals, horizon, taxRegime, profileId,
    liquidSavings, existingDebt, dependents, emergencyFundMonths, riskTolerance, goalType
  ]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();

    // ── Frontend validation (catch errors before API call) ──
    const numAge = Number(age);
    const numIncome = Number(monthlyIncome);
    const numSavings = Number(monthlySavings);
    const numLiquid = Number(liquidSavings);
    const numDebt = Number(existingDebt);
    const numDeps = Number(dependents);
    const numEf = Number(emergencyFundMonths);

    if (!numAge || isNaN(numAge) || numAge < 18 || numAge > 80) {
      alert('Please enter a valid age between 18 and 80.');
      return;
    }
    if (!numIncome || isNaN(numIncome) || numIncome < 1000 || numIncome > 100000000) {
      alert('Monthly income must be between ₹1,000 and ₹10,00,00,000 (10 Crores).');
      return;
    }
    if (!numSavings || isNaN(numSavings) || numSavings < 500 || numSavings > 100000000) {
      alert('Monthly savings must be between ₹500 and ₹10,00,00,000 (10 Crores).');
      return;
    }
    if (numSavings >= numIncome) {
      alert('Monthly savings must be less than monthly income.');
      return;
    }
    if (isNaN(numLiquid) || numLiquid < 0) {
      alert('Liquid savings must be at least 0.');
      return;
    }
    if (isNaN(numDebt) || numDebt < 0 || numDebt > 100) {
      alert('Debt EMI burden percentage must be between 0 and 100.');
      return;
    }
    if (isNaN(numDeps) || numDeps < 0) {
      alert('Dependents count must be at least 0.');
      return;
    }
    if (isNaN(numEf) || numEf < 0) {
      alert('Emergency fund months must be at least 0.');
      return;
    }
    if (investmentGoals.length === 0) {
      alert('Please select at least one investment goal.');
      return;
    }

    try {
      const response = await api.buildProfile(
        numIncome, numAge, numSavings, taxRegime, horizon,
        numLiquid, numDebt, numDeps, numEf, riskTolerance, goalType
      );
      // Persist profile to localStorage, scoped to the current user
      const currentUser = api.getUserInfo();
      const nextProfileId = response.profileId || null;
      setProfileId(nextProfileId);
      const profileWithUser = { ...userProfilePayload, profileId: nextProfileId, _userId: currentUser?.id || null };
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profileWithUser));
      setIsComplete(true);
    } catch (err) {
      alert("Error saving profile: " + err.message);
    }
  };

  // Called from DashboardShell when profile is updated inline
  const handleProfileUpdate = useCallback((updatedProfile) => {
    setAge(updatedProfile.age);
    setMonthlyIncome(updatedProfile.monthly_income);
    setMonthlySavings(updatedProfile.monthly_savings);
    setRiskAppetite(updatedProfile.risk_appetite);
    setInvestmentGoals(updatedProfile.investment_goals);
    setHorizon(updatedProfile.investment_horizon);
    setTaxRegime(updatedProfile.taxRegime);
    
    // New fields:
    if (updatedProfile.liquid_savings !== undefined) setLiquidSavings(updatedProfile.liquid_savings);
    if (updatedProfile.existing_debt !== undefined) setExistingDebt(updatedProfile.existing_debt);
    if (updatedProfile.dependents !== undefined) setDependents(updatedProfile.dependents);
    if (updatedProfile.emergency_fund_months !== undefined) setEmergencyFundMonths(updatedProfile.emergency_fund_months);
    if (updatedProfile.risk_tolerance !== undefined) setRiskTolerance(updatedProfile.risk_tolerance);
    if (updatedProfile.goal_type !== undefined) setGoalType(updatedProfile.goal_type);

    const nextProfileId = updatedProfile.profileId || profileId || null;
    setProfileId(nextProfileId);
    const currentUser = api.getUserInfo();
    const profileWithUser = { ...updatedProfile, profileId: nextProfileId, _userId: currentUser?.id || null };
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profileWithUser));
  }, [profileId]);

  if (isComplete) {
    return React.cloneElement(children, {
      userProfile: userProfilePayload,
      onProfileUpdate: handleProfileUpdate
    });
  }

  return (
    <main className="profile-page">
      {/* Form content on the left */}
      <div className="profile-content">
        <h1 className="profile-page-title">
          Create Your <span className="gradient-text">Financial Profile</span>
        </h1>

        <div className="profile-form-card">
          <form onSubmit={handleSaveProfile}>
            {/* Row 1: Age & Monthly Income */}
            <div className="pf-grid-2">
              <div className="pf-field">
                <label>Age</label>
                <input 
                  type="number" 
                  placeholder="32" 
                  value={age || ''} 
                  onChange={e => {
                    let val = e.target.value.replace(/^0+/, '');
                    setAge(val === '' ? '' : Number(val));
                  }} 
                  min="18" 
                  max="80" 
                />
              </div>
              <div className="pf-field">
                <label>Monthly Income (₹)</label>
                <div className="pf-input-prefix">
                  <span className="prefix-symbol">₹</span>
                  <input 
                    type="number" 
                    placeholder="65000" 
                    value={monthlyIncome || ''} 
                    onChange={e => {
                      let val = e.target.value.replace(/^0+/, '');
                      if (val === '') {
                        setMonthlyIncome('');
                      } else {
                        let num = Number(val);
                        if (num > 100000000) num = 100000000;
                        setMonthlyIncome(num);
                      }
                    }} 
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Monthly Savings & Risk Appetite */}
            <div className="pf-grid-2">
              <div className="pf-field">
                <label>Monthly Savings Capacity (₹)</label>
                <div className="pf-input-prefix">
                  <span className="prefix-symbol">₹</span>
                  <input 
                    type="number" 
                    placeholder="12000" 
                    value={monthlySavings || ''} 
                    onChange={e => {
                      let val = e.target.value.replace(/^0+/, '');
                      if (val === '') {
                        setMonthlySavings('');
                      } else {
                        let num = Number(val);
                        if (num > 100000000) num = 100000000;
                        setMonthlySavings(num);
                      }
                    }} 
                  />
                </div>
              </div>
              <div className="pf-field">
                <label>Risk Appetite</label>
                <div className="risk-toggle-group">
                  {['Low', 'Medium', 'High'].map((level) => (
                    <button
                      key={level}
                      type="button"
                      className={`risk-toggle-btn ${riskAppetite === level ? 'active' : ''}`}
                      onClick={() => setRiskAppetite(level)}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 3: Goal Checkboxes */}
            <div className="pf-field pf-field-full">
              <label>Investment Goal</label>
              <div className="goal-checkbox-group">
                {['Retirement', 'Wealth Growth', 'Tax Saving', 'Emergency Fund'].map((goal) => (
                  <label key={goal} className="goal-checkbox">
                    <input
                      type="checkbox"
                      checked={investmentGoals.includes(goal)}
                      onChange={() => toggleGoal(goal)}
                    />
                    <span className="goal-checkmark"></span>
                    <span className="goal-label-text">{goal}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Row 4: Horizon Slider */}
            <div className="pf-field pf-field-full">
              <label>Investment Horizon</label>
              <div className="horizon-slider-container">
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={horizon}
                  onChange={(e) => setHorizon(Number(e.target.value))}
                  className="horizon-slider"
                  style={{ '--slider-pct': `${((horizon - 1) / 29) * 100}%` }}
                />
                <div className="horizon-labels">
                  <span>1</span>
                  <span className="horizon-value">{horizon} {horizon === 1 ? 'Year' : 'Years'}</span>
                  <span>30</span>
                </div>
              </div>
            </div>


            <button type="submit" className="btn-save-continue">
              Save and Continue
            </button>
          </form>
        </div>
      </div>
      
      {/* Right image pane */}
      <div className="profile-side-image">
        <img src={profileImg} alt="Financial Profile" className="profile-img-element" />
        <div className="profile-img-overlay"></div>
      </div>

    </main>
  );
};

export default ProfilePage;
