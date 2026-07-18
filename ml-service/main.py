"""
WealthGenie ML Microservice - FastAPI
Serves RandomForest predictions with SHAP explainability on port 8000.

=========================================================================
📘 BEGINNER NOTE: RANDOM FOREST & SHAP VALUES
=========================================================================
1. Random Forest Classifier:
   Imagine asking a single person for financial advice. They might have biases.
   Now imagine asking 100 diverse financial advisors and letting them vote on
   the best advice. This is a Random Forest!
   It trains 100 individual "Decision Trees" on different subsets of data.
   When a new prediction comes in, all 100 trees vote on which portfolio category
   (e.g., Aggressive or Moderate) fits the user best. The category with the 
   most votes is returned as the primary recommendation.

2. SHAP (Shapley Additive exPlanations):
   Machine learning models are often "black boxes" - we get an answer, but we
   don't know *why*. SHAP uses game theory (Shapley values) to break down the
   contribution of each feature.
   It calculates: "By how much did your Age push the recommendation towards
   Conservative?" or "How much did your high Income pull it towards Aggressive?"
   This lets us explain the model's recommendation to the user in plain English.
"""

import os
from dotenv import load_dotenv
load_dotenv()

import numpy as np
import joblib
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends, Security, status
from fastapi.security import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
from schemas import PredictRequest, HealthResponse
from explainer import ModelExplainer
from feature_engineering import engineer_features, to_model_array

import hmac

API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

async def verify_api_key(api_key: str = Security(api_key_header)):
    expected_key = os.environ.get("ML_SERVICE_API_KEY", "")
    if not expected_key:
        # Dev mode: no API key configured, skip verification
        return api_key or "dev-mode"
    if not api_key or not hmac.compare_digest(api_key, expected_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API Key"
        )
    return api_key

# ── Application State ─────────────────────────────────────────────
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'model')
MODEL_PATH = os.environ.get('MODEL_PATH', os.path.join(MODEL_DIR, 'model.pkl'))
LE_PATH = os.path.join(MODEL_DIR, 'label_encoder.pkl')
DT_PATH = os.path.join(MODEL_DIR, 'decision_tree.pkl')

model = None
label_encoder = None
dt_model = None
model_accuracy = None
explainer_instance = None


# ── Lifespan (replaces deprecated @app.on_event) ─────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    global model, label_encoder, dt_model, model_accuracy, explainer_instance
    try:
        model = joblib.load(MODEL_PATH)
        label_encoder = joblib.load(LE_PATH)
        print(f"[OK] RandomForest model loaded from {MODEL_PATH}")
    except FileNotFoundError:
        print("[WARN] Model not found. Run: python model/train.py first")

    try:
        dt_model = joblib.load(DT_PATH)
        print(f"[OK] DecisionTree model loaded from {DT_PATH}")
    except FileNotFoundError:
        pass
    except Exception as e:
        print(f"[WARN] DecisionTree load failed: {e}")

    # Load training metadata (accuracy, timestamps, etc.)
    metadata_path = os.path.join(MODEL_DIR, 'metadata.json')
    try:
        import json
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
        model_accuracy = metadata.get('rf_accuracy')
        print(f"[OK] Model metadata loaded: accuracy={model_accuracy}")
    except FileNotFoundError:
        print("[WARN] metadata.json not found. model_accuracy will be null.")
    except Exception as e:
        print(f"[WARN] Failed to load metadata.json: {e}")

    # Initialize SHAP explainer from preloaded model and label encoder to avoid double-loading
    if model is not None and label_encoder is not None:
        try:
            explainer_instance = ModelExplainer(model, label_encoder)
            print("[OK] SHAP Explainer initialized from preloaded model")
        except Exception as e:
            print(f"[WARN] SHAP Explainer initialization failed: {e}")
            explainer_instance = None
    else:
        explainer_instance = None
        print("[WARN] Model files not loaded, SHAP Explainer not available")

    if not os.environ.get("ML_SERVICE_API_KEY"):
        if os.environ.get("NODE_ENV") == "production":
            raise RuntimeError("[FATAL] ML_SERVICE_API_KEY is required in production mode. Service cannot start.")
        else:
            print("[WARN] ML_SERVICE_API_KEY is not set. API key verification is disabled (dev mode). Set this variable in production.")

    yield
    # Cleanup on shutdown (if needed)


app = FastAPI(
    title="WealthGenie ML Service",
    version="2.0.0",
    lifespan=lifespan
)

cors_origins_env = os.environ.get("CORS_ORIGINS")
origins = cors_origins_env.split(",") if cors_origins_env else ["http://localhost:5000", "http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)



RISK_ENCODING = {
    'Conservative': 0,
    'Conservative-Moderate': 1,
    'Moderate': 2,
    'Moderate-Aggressive': 3,
    'Aggressive': 4,
}


def get_decision_path_description(age, income, risk_category):
    """Generate human-readable decision path."""
    path = []
    if age < 30:
        path.append("age < 30")
    elif age <= 45:
        path.append("30 <= age <= 45")
    else:
        path.append("age > 45")

    if income > 1500000:
        path.append("income > 15L")
    elif income > 1000000:
        path.append("income > 10L")
    elif income > 600000:
        path.append("income > 6L")
    else:
        path.append("income <= 6L")

    path.append(f"risk = {risk_category}")
    return path


@app.get("/health", response_model=HealthResponse)
def health():
    status = "ok" if model is not None else "model_not_loaded"
    return HealthResponse(
        status=status,
        model_version="2.0",
        model_accuracy=model_accuracy,
        explainer_loaded=explainer_instance is not None,
    )

@app.post("/predict/enriched", dependencies=[Depends(verify_api_key)])
async def predict_enriched(data: PredictRequest):
    """
    Extended prediction endpoint utilizing the upgraded 16-feature space.
    """
    features = engineer_features(
        age=data.age,
        annual_income=data.annual_income,
        monthly_savings=data.monthly_savings,
        investment_horizon=data.investment_horizon,
        liquid_savings=data.liquid_savings,
        existing_debt=data.existing_debt,
        dependents=data.dependents,
        emergency_fund_months=data.emergency_fund_months,
        risk_tolerance=data.risk_tolerance
    )
    model_input = to_model_array(features)
    
    if model is None or label_encoder is None:
        raise HTTPException(status_code=503, detail="Model not loaded. Run train.py first.")

    proba = model.predict_proba(model_input)[0]
    ranked = np.argsort(proba)[::-1]

    explanation = None
    if explainer_instance is not None:
        try:
            explanation = explainer_instance.explain(model_input)
        except Exception as e:
            print(f"[WARN] Explainer failed: {e}")

    return {
        "primary": label_encoder.classes_[ranked[0]],
        "secondary": label_encoder.classes_[ranked[1]],
        "tertiary": label_encoder.classes_[ranked[2]],
        "confidence_scores": {
            cls: round(float(p), 4)
            for cls, p in zip(label_encoder.classes_, proba)
        },
        "explanation": explanation,
        "decision_path": get_decision_path_description(data.age, data.annual_income, data.risk_category),
        "enriched_features": {
            "savings_rate": features["savings_rate"],
            "debt_to_income_ratio": features["debt_to_income_ratio"],
            "emergency_fund_adequacy_ratio": features["emergency_fund_adequacy_ratio"],
            "risk_capacity_vs_stated_tolerance_gap": features["risk_capacity_vs_stated_tolerance_gap"],
            "horizon_adjusted_urgency_score": features["horizon_adjusted_urgency_score"],
            "dependents_adjusted_burden_score": features["dependents_adjusted_burden_score"]
        },
        "model_version": "2.0",
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

