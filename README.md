# Task Manager Pro — AWDF Practicals Repository

[![CI Pipeline](https://github.com/Aneri-1203/Task-Manager/actions/workflows/ci.yml/badge.svg)](https://github.com/Aneri-1203/Task-Manager/actions/workflows/ci.yml)

A full-stack Role-Based Task Management Application built with **Node.js, Express, MongoDB (Mongoose), React 18, and Vite**.

**Student:** Aneri Patel | **ID:** 24AIML031 | **Subject:** Advanced Web Development Frameworks (ITUE301) | **Semester:** 5th

---

## Practical 13: AI API Integration into a Web Application (Google Gemini API)

### Overview
Integration of an **AI Task Description Generator** using the official **Google Gen AI JavaScript SDK (`@google/genai`)**. The feature enhances the task creation workflow by generating clear, actionable, single-paragraph descriptions based on the entered task title, while enforcing backend security, rate limiting, graceful error handling, and responsible AI disclosures.

### Architecture & Request Flow
```
┌─────────────────────────┐          POST /api/ai/generate-description          ┌─────────────────────────┐
│       React / Vite      │ ───────────────────────────────────────────────────> │     Express Backend     │
│   (TaskModal Component) │                                                      │  - JWT Authentication   │
│  - User enters title    │ <─────────────────────────────────────────────────── │  - In-Memory Rate Limit │
│  - Click 'Generate Desc'│   { description: "...", fallback: false }            │  - Input Validation     │
└─────────────────────────┘                                                      └────────────┬────────────┘
                                                                                              │ Google Gen AI SDK
                                                                                              │ (Title only)
                                                                                              ▼
                                                                                 ┌─────────────────────────┐
                                                                                 │    Google Gemini API    │
                                                                                 │   (gemini-2.5-flash)    │
                                                                                 └─────────────────────────┘
```

### Key Implementations:
1. **Secure Backend Endpoint (`POST /api/ai/generate-description`):**
   - Implemented in [`controllers/aiController.js`](./controllers/aiController.js) and [`routes/aiRoutes.js`](./routes/aiRoutes.js).
   - Validates that `title` is a non-empty string between 3 and 150 characters.
   - Protected with JWT authentication ([`authMiddleware.js`](./middleware/authMiddleware.js)).
   - Enforces provider timeouts and redacts API keys from all logs.
2. **Dual-Mode AI Engine (Live Google Gemini API & Zero-Cost Demo Mode):**
   - **Offline Demo Mode (`AI_DEMO_MODE=true`):** Built into [`services/aiService.js`](./services/aiService.js). Generates realistic, contextual task descriptions locally without external network requests or paid API subscriptions. Ideal for lab evaluation and grading when external project billing is restricted. Responses are clearly labeled with a `Demo Mode` badge and transparent disclaimer.
   - **Live Google Gen AI SDK Mode (`AI_DEMO_MODE=false`):** Built with official `@google/genai` (`GoogleGenAI`). Uses `gemini-2.5-flash` with tailored system instructions when an authorized API key is configured.
3. **Discrete Error Classification (401, 403, 404, 429):**
   - Safely parses and categorizes provider responses:
     - `401 AUTH_ERROR`: Invalid or revoked credentials.
     - `403 PROJECT_RESTRICTION`: Google Cloud project requires billing setup.
     - `404 MODEL_NOT_FOUND`: Model retired or unavailable.
     - `429 QUOTA_OR_RATE_LIMIT`: Free-tier request or token quota exhausted.
4. **In-Memory Rate Limiting ([`middleware/aiRateLimiter.js`](./middleware/aiRateLimiter.js)):**
   - Enforces a 60-second cooldown per unique `userId:title` combination using SHA-256 hashes.
   - Cooldown only activates on successfully accepted requests.
   - Live frontend countdown timer automatically ticks down and re-enables the button on expiration.
5. **Graceful Fallback & Error Degradation:**
   - If `GEMINI_API_KEY` is missing or unauthorized and demo mode is off, the backend returns a clean fallback:
     `{ "description": "", "fallback": true, "message": "AI suggestions are temporarily unavailable. Please enter the description manually." }`
   - Normal task creation and editing remain 100% operational and are never blocked.
6. **Frontend UI Integration ([`client/src/components/TaskModal.jsx`](./client/src/components/TaskModal.jsx)):**
   - Added `Generate Description` button next to Description with active loading indicator (`Loader2`).
   - Button is disabled during active requests, active cooldowns (`Wait <N>s`), and when title input is empty.
   - Clearly flags demo mode suggestions with a teal `Demo Mode` badge.
   - Generated text is placed directly inside the editable textarea, allowing review and editing before saving.
   - Features visible responsible AI disclaimer:
     *`AI-generated suggestion: Please review and edit the description before saving. AI-generated content may be inaccurate.`*
7. **Automated Testing Suite ([`tests/ai.test.js`](./tests/ai.test.js)):**
   - 14 automated tests covering live Gemini mocked generation, offline demo mode generation, input validation, token auth enforcement, missing key fallback, 401/403/404/429 error categorization, error sanitizer credentials protection, and rate limiting lifecycles.

---

## Practical 12: CI/CD Pipeline with GitHub Actions

### Overview
Automated Continuous Integration (CI) pipeline using **GitHub Actions** to guarantee automated test validation, code quality, and build integrity across pushes and pull requests.

### Key Implementations:
1. **GitHub Actions Workflow (`.github/workflows/ci.yml`):**
   - Automatically triggers on every `push` and `pull_request` targeting `main` and `master`.
   - Uses `ubuntu-latest` with official actions `actions/checkout@v4` and `actions/setup-node@v4` (Node.js 20.x LTS).
   - Executes two parallel verification jobs:
     - **`test-backend`**: Installs backend dependencies and executes automated Jest + Supertest API integration tests.
     - **`build-frontend`**: Installs client dependencies and compiles the React 18/Vite production build.
2. **Automated Backend Testing (Jest & Supertest):**
   - Dedicated API integration test suite (`tests/tasks.test.js` & `tests/ai.test.js`) verifying JWT authentication guards, task querying, task creation, route validations, and public endpoints.
   - Fully decoupled from live database instances using Mongoose model mocks, enabling instantaneous execution in isolated CI environments.
3. **Deliberate Failure & Recovery Demonstration:**
   - Demonstrates red-to-green CI pipeline progression by inducing a deliberate assertion failure, catching the failure on GitHub Actions, and restoring passing status.
4. **Pipeline Screenshots:**
   - Stored in [`docs/practical-12/`](./docs/practical-12/):
     - `ci-failed.png`: Demonstrates the deliberate test failure caught in GitHub Actions.
     - `ci-passed.png`: Demonstrates the successful pipeline run with all tests passing.

---

## Practical 8: Performance Optimization & Lazy Loading

### Key Implementations:
1. **Route-Based Code Splitting:** Implemented using `React.lazy()` and `<Suspense fallback={<LoadingFallback />}>` for all application routes.
2. **Heavy Component Lazy Loading:** The interactive `LazyChart` data visualizer is loaded on demand only when visiting the Analytics view.
3. **Role-Based Access Control (RBAC):**
   - **Admin:** Can assign tasks to any employee/user, view all tasks, modify user roles, and generate system-wide reports.
   - **Manager:** Can assign tasks to employees under their supervision, add their own tasks, and monitor team progress.
   - **Employee:** Can view tasks assigned to them, create personal tasks, and advance status in forward-only sequence.
4. **Session Management:** Secure JWT session tracking, `/auth/verify-session` endpoint, idle detection, and session timeout alerts.
5. **Forgot Password Flow:** Secure 1-hour expiration reset token generation, Nodemailer email dispatch, and token-based password reset.

---

## Quick Start & Setup Guide

### 1. How to Obtain a Free Google Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google Account.
3. Click **Get API key** > **Create API key**.
4. Copy the generated API key (it begins with `AIzaSy...`).

### 2. Configure Environment (`.env`)
In your project root, configure `.env` (this file is excluded by `.gitignore` and never committed):
```env
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/task_manager
JWT_SECRET=supersecret_jwt_key_task_manager_awdf_2026_secure

# Practical 13 AI Configuration
# Option A: Zero-cost offline demonstration (Recommended for lab evaluation)
AI_DEMO_MODE=true

# Option B: Live Google Gemini API (When authorized Google Cloud project is available)
# AI_DEMO_MODE=false
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

### 3. Install Dependencies
```bash
# Root (Backend dependencies including @google/genai)
npm install

# Client (Frontend React dependencies)
cd client
npm install
cd ..
```

### 4. Start the Application
```bash
# Terminal 1: Start Backend (Port 3000)
npm run dev

# Terminal 2: Start Frontend (Port 5173)
cd client
npm run dev
```
Open `http://localhost:5173` in your browser.

### 5. Run Automated Tests
```bash
# Runs full Jest test suite (backend API integration + AI tests)
npm test
```

### 6. Build Frontend for Production
```bash
npm run build
```

---

## Project Structure

```
Task-Manager/
├── controllers/         # Express route handlers (auth, tasks, AI)
├── middleware/          # JWT auth, RBAC, rate limiter, error handler
├── models/              # Mongoose schemas (User, Task)
├── routes/              # Express router definitions
├── services/            # AI service, cache, email, events
├── tests/               # Jest + Supertest API integration tests
├── client/              # React 18 + Vite frontend
│   └── src/
│       ├── components/  # Navbar, TaskModal (AI integrated), LazyChart
│       ├── context/     # AuthContext (JWT session management)
│       ├── pages/       # Dashboard, Projects, Analytics, Team
│       └── services/    # api.js (fetch wrapper)
├── docs/
│   ├── practical-12/    # CI/CD screenshots and documentation
│   └── practical-13/    # AI feature screenshots and documentation
├── .github/workflows/   # GitHub Actions CI pipeline
├── .env.example         # Environment variable template
├── server.js            # Express application entry point
└── README.md
```

---

## Submission Details

| Field | Value |
|-------|-------|
| Student Name | Aneri Patel |
| Student ID | 24AIML031 |
| Subject | Advanced Web Development Frameworks (ITUE301) |
| Semester | 5th |
| Repository | https://github.com/Aneri-1203/Task-Manager |
| Practical 12 | CI/CD Pipeline with GitHub Actions |
| Practical 13 | AI-Powered Task Description Generator (Google Gemini API) |
