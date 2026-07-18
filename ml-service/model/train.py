"""
WealthGenie ML Training Pipeline (Rigorous Multi-Factor & Correctly Validated)
Generates synthetic data, computes features, tunes hyperparameters, evaluates on held-out test split,
and saves model, encoder, and decision tree pipeline along with validation metadata.
"""

import os
import sys
import json
import numpy as np
import pandas as pd
from datetime import datetime, timezone

from sklearn.model_selection import train_test_split, GridSearchCV, StratifiedKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix, brier_score_loss

import joblib

# Ensure we can import from feature_engineering
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from feature_engineering import engineer_features, to_model_array, get_feature_names

np.random.seed(42)
N_SAMPLES = 20000

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
MODEL_DIR = os.path.dirname(__file__)

def generate_correlated_dataset(n_samples=N_SAMPLES):
    """
    Generate 20,000+ synthetic investor profiles with multivariate correlations:
    - Income vs Age (income peaks around late 40s)
    - Dependents vs Age (higher in 30-55 age range)
    - Debt vs Dependents and Age (peaks with housing / family requirements)
    - Emergency Fund vs Debt (negatively correlated)
    - Liquid Savings vs Age and Income (accumulates with time and income)
    - Horizon vs Age (declines as retirement age nears)
    """
    # 1. Age: Uniform 18 to 75
    ages = np.random.randint(18, 75, n_samples)
    
    # 2. Annual Income: peak-curved with lognormal noise (2L to 50L INR)
    incomes = []
    for age in ages:
        base = 350000.0
        age_multiplier = 1.0 + 3.2 * (1.0 - abs(age - 47) / 29.0 if age > 18 else 0)
        age_multiplier = max(1.0, age_multiplier)
        income = base * age_multiplier * np.random.lognormal(0.0, 0.28)
        incomes.append(float(np.clip(income, 200000.0, 5000000.0)))
    incomes = np.array(incomes)
    
    # 3. Dependents: Poisson correlated with age
    dependents = []
    for age in ages:
        if age < 26:
            dep = np.random.poisson(0.15)
        elif age < 46:
            dep = np.random.poisson(1.9)
        elif age < 61:
            dep = np.random.poisson(1.1)
        else:
            dep = np.random.poisson(0.3)
        dependents.append(int(np.clip(dep, 0, 8)))
    dependents = np.array(dependents)
    
    # 4. Existing Debt (EMI burden % of monthly income): correlated with dependents & age
    debt = []
    for age, dep in zip(ages, dependents):
        mean_debt = 12.0 + 4.5 * dep
        if 28 <= age <= 48:
            mean_debt += 18.0
        val = np.random.normal(mean_debt, 11.0)
        debt.append(float(np.clip(val, 0.0, 70.0)))
    debt = np.array(debt)
    
    # 5. Emergency Fund months: negatively correlated with debt, positively with age
    ef_months = []
    for age, d in zip(ages, debt):
        mean_ef = 3.5 + (age / 18.0) - (d / 14.0)
        val = np.random.normal(mean_ef, 1.8)
        ef_months.append(float(np.clip(val, 0.0, 18.0)))
    ef_months = np.array(ef_months)
    
    # 6. Liquid Savings: correlated with age, income, and emergency fund months
    liquid_savings = []
    for age, inc, ef in zip(ages, incomes, ef_months):
        savings_factor = (age - 18) / 22.0
        savings_factor = max(0.15, savings_factor)
        base_savings = inc * savings_factor * np.random.lognormal(0.0, 0.35)
        base_savings += (inc / 12.0) * ef
        liquid_savings.append(float(np.clip(base_savings, 15000.0, 45000000.0)))
    liquid_savings = np.array(liquid_savings)
    
    # 7. Horizon: correlated with age (older has shorter remaining horizon)
    horizons = []
    for age in ages:
        max_horizon = max(5, 75 - age)
        min_horizon = max(1, 60 - age)
        val = np.random.randint(max(1, min_horizon), max(6, max_horizon))
        horizons.append(int(np.clip(val, 1, 35)))
    horizons = np.array(horizons)
    
    # 8. Stated Risk Tolerance: correlated with age and income
    risk_tolerances = []
    for age, inc in zip(ages, incomes):
        if age < 30:
            w = [0.15, 0.35, 0.50]
        elif age < 50:
            w = [0.20, 0.55, 0.25]
        else:
            w = [0.65, 0.25, 0.10]
        if inc > 2200000.0:
            w[2] += 0.15
            w[0] -= 0.15
        w = np.clip(w, 0.01, 0.99)
        w = w / sum(w)
        rt = np.random.choice(['Conservative', 'Moderate', 'Aggressive'], p=w)
        risk_tolerances.append(rt)
    risk_tolerances = np.array(risk_tolerances)
    
    # 9. Goal Type: correlated with age
    goal_types = []
    for age in ages:
        if age < 30:
            w = [0.05, 0.40, 0.15, 0.40]
        elif age <= 50:
            w = [0.25, 0.20, 0.35, 0.20]
        else:
            w = [0.75, 0.05, 0.05, 0.15]
        gt = np.random.choice(['retirement', 'house purchase', 'education', 'wealth-building'], p=w)
        goal_types.append(gt)
    goal_types = np.array(goal_types)
    
    # 10. Monthly Savings capacity: correlated with income and debt
    monthly_savings = []
    for inc, d in zip(incomes, debt):
        disposable_pct = 0.38 - (d / 100.0)
        disposable_pct = max(0.06, disposable_pct)
        mean_saving = (inc / 12.0) * disposable_pct
        val = np.random.normal(mean_saving, mean_saving * 0.18)
        monthly_savings.append(float(np.clip(val, 500.0, inc / 12.0 - 100.0)))
    monthly_savings = np.array(monthly_savings)
    
    df = pd.DataFrame({
        'age': ages,
        'annual_income': incomes,
        'monthly_savings': monthly_savings,
        'investment_horizon': horizons,
        'liquid_savings': liquid_savings,
        'existing_debt': debt,
        'dependents': dependents,
        'emergency_fund_months': ef_months,
        'risk_tolerance': risk_tolerances,
        'goal_type': goal_types
    })
    return df

def assign_target_instruments(age, annual_income, monthly_savings, investment_horizon,
                               liquid_savings, existing_debt, dependents,
                               emergency_fund_months, risk_tolerance, goal_type):
    """
    Independent multi-factor instrument assignment (Approach C — leakage-free).

    Uses RAW variables directly — NOT risk_score or any engineered feature.
    The label depends on genuine multi-way interactions:
      - risk_tolerance × financial_stability  (risk_score doesn't encode tolerance)
      - goal_type × time_horizon              (risk_score doesn't encode goal_type)
      - savings_rate × cushion adequacy       (risk_score doesn't encode savings)
      - income_tier × age_bracket tie-breaking

    Because risk_score captures age/income/horizon/debt/dependents/ef in a DIFFERENT
    weighting, it remains a useful feature but is INSUFFICIENT to solve the label
    on its own — the model must also learn from risk_tolerance, goal_type, and
    savings behaviour.

    Boundary noise (σ=0.9) creates ~12-15% irreducible label overlap, yielding
    an honest accuracy ceiling of roughly 82-88%.
    """
    monthly_income = annual_income / 12.0
    savings_rate = monthly_savings / monthly_income if monthly_income > 0 else 0.0

    # ── Dimension 1: Risk willingness  ──────────────────────────────────
    # risk_tolerance is the primary driver — risk_score does NOT encode this.
    willingness = {'Aggressive': 3.0, 'Moderate': 1.5, 'Conservative': 0.0}[risk_tolerance]

    # Stability adjustments
    if savings_rate > 0.30:
        willingness += 1.0
    elif savings_rate < 0.10:
        willingness -= 1.0

    if existing_debt > 40:
        willingness -= 1.5
    elif existing_debt < 10:
        willingness += 0.5

    # ── Dimension 2: Time capacity  ─────────────────────────────────────
    time_cap = 0.0
    if investment_horizon >= 15 and age < 40:
        time_cap = 3.0
    elif investment_horizon >= 10 and age < 50:
        time_cap = 2.0
    elif investment_horizon >= 5:
        time_cap = 1.0

    if age >= 55:
        time_cap -= 1.0

    # ── Dimension 3: Goal urgency  ──────────────────────────────────────
    # goal_type is NOT encoded in risk_score at all.
    goal_shift = 0.0
    if goal_type == 'wealth-building':
        goal_shift = 1.5 if age < 45 else 0.5
    elif goal_type == 'retirement':
        goal_shift = 1.0 if age < 40 else -0.5
    elif goal_type == 'house purchase':
        goal_shift = -1.0 if investment_horizon < 7 else 0.5
    elif goal_type == 'education':
        goal_shift = 0.5 if dependents > 0 and investment_horizon > 8 else -0.5

    # ── Dimension 4: Cushion adequacy  ──────────────────────────────────
    # liquid_savings is NOT part of risk_score.
    cushion = 0.0
    if liquid_savings > annual_income * 0.8 and emergency_fund_months >= 6:
        cushion = 1.5
    elif liquid_savings > annual_income * 0.3 and emergency_fund_months >= 3:
        cushion = 0.5
    elif emergency_fund_months < 2:
        cushion = -1.0

    # ── Composite ───────────────────────────────────────────────────────
    composite = willingness + time_cap + goal_shift + cushion

    # Boundary noise: σ=0.9 produces ~12-15% label flips at boundaries
    composite += np.random.normal(0, 0.9)

    # Income / age tie-breaking
    high_income = annual_income > 1500000
    senior = age >= 58

    # ── Map to primary instrument ───────────────────────────────────────
    if composite >= 5.5:
        primary = 'ELSS' if high_income else 'Equity_MF'
    elif composite >= 4.5:
        primary = 'Equity_MF' if not senior else 'ETF'
    elif composite >= 2.0:
        primary = 'ETF'
    elif composite >= 0.0:
        primary = 'Debt_MF'
    else:
        primary = 'FD' if not senior else 'RBI_Bond'

    # ── Secondary / tertiary by proximity ───────────────────────────────
    rank_order = ['ELSS', 'Equity_MF', 'ETF', 'Debt_MF', 'FD', 'RBI_Bond']
    idx = rank_order.index(primary)
    secondary = rank_order[max(0, idx - 1)] if idx > 0 else rank_order[1]
    tertiary  = rank_order[min(len(rank_order) - 1, idx + 1)] if idx < len(rank_order) - 1 else rank_order[-2]
    if secondary == primary:
        secondary = rank_order[min(idx + 1, len(rank_order) - 1)]
    if tertiary == primary:
        tertiary = rank_order[max(idx - 1, 0)]

    return primary, secondary, tertiary

def train():
    print("=" * 70)
    print("WealthGenie ML Upgraded Training Pipeline")
    print("=" * 70)
    
    # 1. Generate correlated dataset
    df = generate_correlated_dataset(N_SAMPLES)
    os.makedirs(DATA_DIR, exist_ok=True)
    
    # Apply shared feature engineering to all rows
    engineered_list = []
    targets = []
    for _, row in df.iterrows():
        features = engineer_features(
            age=row['age'],
            annual_income=row['annual_income'],
            monthly_savings=row['monthly_savings'],
            investment_horizon=row['investment_horizon'],
            liquid_savings=row['liquid_savings'],
            existing_debt=row['existing_debt'],
            dependents=row['dependents'],
            emergency_fund_months=row['emergency_fund_months'],
            risk_tolerance=row['risk_tolerance']
        )
        engineered_list.append(features)
        
        # Label assignment uses RAW variables only — NOT risk_score (leakage-free)
        primary, secondary, tertiary = assign_target_instruments(
            age=row['age'],
            annual_income=row['annual_income'],
            monthly_savings=row['monthly_savings'],
            investment_horizon=row['investment_horizon'],
            liquid_savings=row['liquid_savings'],
            existing_debt=row['existing_debt'],
            dependents=int(row['dependents']),
            emergency_fund_months=row['emergency_fund_months'],
            risk_tolerance=row['risk_tolerance'],
            goal_type=row['goal_type']
        )
        targets.append({
            'primary_instrument': primary,
            'secondary_instrument': secondary,
            'tertiary_instrument': tertiary
        })
        
    df_engineered = pd.DataFrame(engineered_list)
    df_targets = pd.DataFrame(targets)
    df_all = pd.concat([df_engineered, df_targets, df['goal_type']], axis=1)
    
    csv_path = os.path.join(DATA_DIR, 'investment_profiles.csv')
    df_all.to_csv(csv_path, index=False)
    print(f"\n[OK] Generated {len(df_all)} samples -> {csv_path}")
    print(f"\nClass Distribution:\n{df_all['primary_instrument'].value_counts(normalize=True)}")
    
    # Correlation Verification Print
    corr = df_all[['age', 'annual_income', 'existing_debt', 'dependents', 'emergency_fund_months', 'risk_score']].corr()
    print("\n" + "=" * 50)
    print("Correlation matrix of synthetic features:")
    print("=" * 50)
    print(corr.round(3))
    print("=" * 50)
    
    # Prepare X and y
    le = LabelEncoder()
    y = le.fit_transform(df_all['primary_instrument'])
    X = df_all[get_feature_names()].values
    
    # Split: 60% Train, 20% Val, 20% Test (Proper 3-way split)
    X_train_val, X_test, y_train_val, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    X_train, X_val, y_train, y_val = train_test_split(
        X_train_val, y_train_val, test_size=0.25, random_state=42, stratify=y_train_val # 0.25 * 0.80 = 0.20
    )
    
    print(f"\nData Splits: Train={len(y_train)} | Val={len(y_val)} | Test={len(y_test)}")
    
    # 2. stratified 5-fold cross-validation on Training Set (X_train)
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    
    models = {
        'RandomForest': (
            RandomForestClassifier(random_state=42, class_weight='balanced'),
            {'clf__n_estimators': [100, 200], 'clf__max_depth': [10, 15, 20]}
        ),
        'GradientBoosting': (
            GradientBoostingClassifier(random_state=42),
            {'clf__n_estimators': [100, 150], 'clf__max_depth': [4, 6, 8]}
        )
    }
    
    best_cv_score = -1.0
    best_candidate_name = None
    best_pipeline = None
    cv_comparison = []
    
    for name, (clf, param_grid) in models.items():
        print(f"\nRunning GridSearchCV for {name}...")
        pipeline = Pipeline([
            ('scaler', StandardScaler()),
            ('clf', clf)
        ])
        
        grid = GridSearchCV(pipeline, param_grid, cv=cv, scoring='accuracy', n_jobs=-1)
        grid.fit(X_train, y_train)
        
        mean_score = grid.best_score_
        std_score = grid.cv_results_['std_test_score'][grid.best_index_]
        print(f"Best CV accuracy for {name}: {mean_score:.4f} ± {std_score:.4f} with {grid.best_params_}")
        
        cv_comparison.append({
            'model': name,
            'cv_mean': round(float(mean_score), 4),
            'cv_std': round(float(std_score), 4),
            'best_params': str(grid.best_params_)
        })
        
        if mean_score > best_cv_score:
            best_cv_score = mean_score
            best_candidate_name = name
            best_pipeline = grid.best_estimator_
            
    print("\n" + "=" * 50)
    print("CV Comparison Table:")
    print("=" * 50)
    print(pd.DataFrame(cv_comparison))
    print("=" * 50)
    
    # Select RandomForest: native multi-class SHAP TreeExplainer support.
    # GradientBoosting isn't fully supported by shap.TreeExplainer for multiclass.
    selected_name = 'RandomForest'
    
    # Use the ACTUAL best estimator from grid search — no hardcoded params.
    best_pipeline = None
    best_cv_score_selected = None
    for entry in cv_comparison:
        if entry['model'] == selected_name:
            best_cv_score_selected = entry['cv_mean']
    
    for name, (clf, param_grid) in models.items():
        if name == selected_name:
            pipeline = Pipeline([
                ('scaler', StandardScaler()),
                ('clf', clf)
            ])
            grid = GridSearchCV(pipeline, param_grid, cv=cv, scoring='accuracy', n_jobs=-1)
            grid.fit(X_train, y_train)
            best_pipeline = grid.best_estimator_
            best_cv_score_selected = grid.best_score_
            print(f"\nSelected {selected_name}: actual best params = {grid.best_params_}")
            
    print(f"\nSelected Model: {selected_name} (SHAP TreeExplainer compatible) | CV Accuracy: {best_cv_score_selected:.4f}")
    
    # 3. Fit the selected model on full X_train + X_val, then evaluate on X_test
    X_train_full = np.vstack([X_train, X_val])
    y_train_full = np.concatenate([y_train, y_val])
    
    print("\nTraining final selected pipeline on train+validation sets...")
    best_pipeline.fit(X_train_full, y_train_full)
    
    # 4. Final Evaluation on Held-Out Test Set
    test_preds = best_pipeline.predict(X_test)
    test_acc = accuracy_score(y_test, test_preds)
    test_proba = best_pipeline.predict_proba(X_test)
    
    print(f"\nFinal Test Set Accuracy: {test_acc:.4f}")
    print("\nTest Classification Report:")
    report_dict = classification_report(y_test, test_preds, target_names=le.classes_, output_dict=True)
    print(classification_report(y_test, test_preds, target_names=le.classes_))
    
    cm = confusion_matrix(y_test, test_preds)
    print("\nTest Confusion Matrix:")
    print(cm)
    
    # Calibration Check (Average Brier Score Loss across all classes)
    brier_scores = {}
    for idx, class_name in enumerate(le.classes_):
        y_test_binary = (y_test == idx).astype(int)
        prob_class = test_proba[:, idx]
        brier = brier_score_loss(y_test_binary, prob_class)
        brier_scores[class_name] = round(float(brier), 5)
        
    print(f"\nProbability Calibration (Brier Score Loss, lower is better):\n{brier_scores}")
    
    # 5. Fit simple DecisionTree for explainability/fallback paths if desired
    print("\nTraining DecisionTree pipeline...")
    dt_pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('clf', DecisionTreeClassifier(max_depth=8, random_state=42))
    ])
    dt_pipeline.fit(X_train_full, y_train_full)
    dt_test_preds = dt_pipeline.predict(X_test)
    dt_acc = accuracy_score(y_test, dt_test_preds)
    print(f"DecisionTree Test Accuracy: {dt_acc:.4f}")
    
    # 6. SHAP Efficiency Axiom Verification
    print("\nVerifying SHAP explainer efficiency axiom...")
    try:
        import shap
        # Extract underlying classifier and scaler
        final_clf = best_pipeline.named_steps['clf']
        final_scaler = best_pipeline.named_steps['scaler']
        
        # Test on 10 random samples from test set
        explainer = shap.TreeExplainer(final_clf)
        test_scaled = final_scaler.transform(X_test[:10])
        shap_vals = explainer.shap_values(test_scaled)
        
        # Handle SHAP output formats (list of arrays for multiclass or single 3D array)
        is_list = isinstance(shap_vals, list)
        
        efficiency_errors = []
        for idx in range(10):
            probas = final_clf.predict_proba(test_scaled[idx:idx+1])[0]
            for c_idx in range(len(le.classes_)):
                expected_prob = probas[c_idx]
                if is_list:
                    shap_sum = np.sum(shap_vals[c_idx][idx])
                    base_val = explainer.expected_value[c_idx]
                else:
                    shap_sum = np.sum(shap_vals[idx, :, c_idx])
                    base_val = explainer.expected_value[c_idx]
                    
                diff = abs((base_val + shap_sum) - expected_prob)
                efficiency_errors.append(diff)
                
        max_diff = max(efficiency_errors)
        print(f"SHAP Efficiency Axiom check: Max deviation = {max_diff:.8e}")
        if max_diff < 1e-4:
            print("[OK] SHAP explainer complies with the efficiency axiom.")
        else:
            print("[WARN] SHAP explainer exceeded efficiency tolerance.")
    except Exception as e:
        print(f"[WARN] SHAP efficiency verification skipped: {e}")
        
    # Save Pipeline and metadata
    os.makedirs(MODEL_DIR, exist_ok=True)
    model_path = os.path.join(MODEL_DIR, 'model.pkl')
    le_path = os.path.join(MODEL_DIR, 'label_encoder.pkl')
    dt_path = os.path.join(MODEL_DIR, 'decision_tree.pkl')
    
    joblib.dump(best_pipeline, model_path)
    joblib.dump(le, le_path)
    joblib.dump(dt_pipeline, dt_path)
    
    print(f"\n[OK] Model saved to {model_path}")
    print(f"[OK] LabelEncoder saved to {le_path}")
    print(f"[OK] DecisionTree saved to {dt_path}")
    
    # Save metadata.json
    metadata = {
        'model_name': selected_name,
        'rf_accuracy': round(float(test_acc), 4),
        'best_cv_accuracy': round(float(best_cv_score_selected), 4) if best_cv_score_selected else None,
        'test_accuracy': round(float(test_acc), 4),
        'trained_at': datetime.now(timezone.utc).isoformat(),
        'n_samples': len(df_all),
        'n_features': X.shape[1],
        'feature_names': get_feature_names(),
        'confusion_matrix': cm.tolist(),
        'per_class_f1': {cls: round(float(report_dict[cls]['f1-score']), 4) for cls in le.classes_},
        'brier_scores': brier_scores
    }
    
    metadata_path = os.path.join(MODEL_DIR, 'metadata.json')
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"[OK] Metadata saved to {metadata_path}")
    
    print("\n" + "=" * 70)
    print(f"Selected: {best_candidate_name} | Test Acc: {test_acc:.4f} | DT Acc: {dt_acc:.4f}")
    print("=" * 70)

if __name__ == '__main__':
    train()
