# Contributing to WealthGenie

Thank you for your interest in contributing to WealthGenie! This document provides guidelines and instructions for contributing.

## 🏗 Architecture Overview

WealthGenie is a three-tier application:

| Tier | Technology | Port |
|:---|:---|:---|
| **Frontend** | React 19 + Vite | 5173 |
| **Backend** | Express.js + MongoDB | 5000 |
| **ML Service** | FastAPI + scikit-learn | 8000 |

## 🚀 Development Setup

### Prerequisites
- Node.js ≥ 18.x
- Python ≥ 3.10
- MongoDB Atlas account (or local MongoDB)

### Installation

```bash
# Clone the repository
git clone https://github.com/yashaskn8/WealthGenie-AI-Based-Personalized-Financial-Advisory-System.git
cd WealthGenie-AI-Based-Personalized-Financial-Advisory-System

# Backend
cd server && npm install && cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret

# Frontend
cd ../reactapp && npm install

# ML Service
cd ../ml-service && pip install -r requirements.txt
```

### Running Locally

```bash
# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend
cd reactapp && npm run dev

# Terminal 3 — ML Service
cd ml-service && uvicorn main:app --reload --port 8000
```

## 📝 Contribution Workflow

1. **Fork** the repository
2. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes** following the coding standards below
4. **Run tests** before submitting:
   ```bash
   # Frontend
   cd reactapp && npm test

   # Backend
   cd server && npm test

   # ML Service
   cd ml-service && pytest
   ```
5. **Submit a Pull Request** with a clear description of your changes

## 🎨 Coding Standards

### Frontend (React)
- Use functional components with hooks
- TypeScript for financial calculation modules (`src/utils/*.ts`, `src/engine/*.ts`)
- JavaScript for React components (`.jsx`)
- ESLint enforces `no-console` (only `console.warn` and `console.error` allowed)
- CSS modules or vanilla CSS — no TailwindCSS

### Backend (Express)
- Joi schemas for all input validation
- JWT authentication on protected routes
- Inter-service auth for ML service communication

### ML Service (FastAPI)
- Pydantic v2 models for request/response validation
- Type hints on all functions
- Pytest for test coverage

## 🔐 Security

- **Never** commit credentials or API keys
- Pre-commit secret scanning is enabled via `secretlint`
- All environment-specific values go in `.env` (never committed)

## 📁 File Organization

- `reactapp/src/components/` — React UI components
- `reactapp/src/utils/` — Pure utility functions (TypeScript for financial calcs)
- `reactapp/src/engine/` — Extracted recommendation engine modules
- `reactapp/src/services/` — API client layer
- `server/services/` — Backend business logic
- `server/routes/` — Express route handlers
- `ml-service/` — FastAPI ML microservice

## 🧪 Testing

| Layer | Framework | Command |
|:---|:---|:---|
| Frontend | Vitest + jsdom | `cd reactapp && npm test` |
| Backend | Jest | `cd server && npm test` |
| ML Service | Pytest | `cd ml-service && pytest` |

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.
