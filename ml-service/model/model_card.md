# Model Card: WealthGenie Asset Allocation Recommender

## Model Details
- **Developer**: Yashas K N
- **Model Type**: RandomForest Classifier (Ensemble of decision trees with StandardScaler preprocessing)
- **Trained At**: 2026-07-18T16:49:55.071103+00:00
- **Features Used**: 16 engineered and raw demographic features
- **Output Target**: 6 financial instrument categories (`Debt_MF`, `ELSS`, `ETF`, `Equity_MF`, `FD`, `RBI_Bond`)

## Intended Use
- **Primary Use Case**: Predicts the optimal primary asset class for a retail investor based on expected utility maximization over historical asset parameters and risk constraints.
- **Out of Scope**: Not a replacement for a certified financial planner. Does not predict market direction.

## Quantitative Analysis

### Overall Performance
- **Test Accuracy**: 0.5427
- **Decision Tree Fallback Accuracy**: 0.6052

### Baseline Comparison
| Model | Accuracy | Lift (Model vs Baseline) |
| :--- | :--- | :--- |
| **WealthGenie RandomForest** | 0.5427 | — |
| **Heuristic Rules Baseline** | 0.1688 | +0.3740 |
| **Majority Class Baseline** | 0.4873 | +0.0555 |

### Subgroup Performance Analysis
| Subgroup | Sample Count | Accuracy |
| :--- | :--- | :--- |
| **Age < 35** | 1202 | 0.5125 |
| **Age 35-55** | 1514 | 0.6744 |
| **Age > 55** | 1284 | 0.4159 |
| **Income < 8L** | 1642 | 0.3879 |
| **Income 8L-15L** | 1871 | 0.6275 |
| **Income > 15L** | 487 | 0.7392 |
| **Tolerance Conservative** | 1527 | 0.3739 |
| **Tolerance Moderate** | 1562 | 0.6415 |
| **Tolerance Aggressive** | 911 | 0.6564 |

### Probability Calibration (Brier Score Loss, lower is better)
- **Debt_MF**: 0.08976
- **ELSS**: 0.17492
- **ETF**: 0.03018
- **Equity_MF**: 0.11616
- **FD**: 0.04995
- **RBI_Bond**: 0.10040

## Training Data Provenance & Methodology
- **Provenance**: Generated via a quantitative expected-utility simulation matching retail investor profiles to optimal asset allocations over long-term Indian market return-to-volatility characteristics:
  - Equity Mutual Funds: Expected Return 14.5%, Volatility 16%
  - Tax-Saving ELSS: Expected Return 15.2%, Volatility 17% (subject to 3-year horizon lock-in penalty)
  - ETFs: Expected Return 12.2%, Volatility 14%
  - Debt Mutual Funds: Expected Return 7.5%, Volatility 4%
  - Sovereign RBI Bonds: Expected Return 7.1%, Volatility 0.1%
  - Fixed Deposits: Expected Return 6.5%, Volatility 0.2%
- **Evaluation Bias & Limits**: Because the training labels are computed from utility maximization equations, the model evaluates how effectively the classifier learns and generalizes these financial optimization constraints over profile variations, rather than predicting real-world returns.
