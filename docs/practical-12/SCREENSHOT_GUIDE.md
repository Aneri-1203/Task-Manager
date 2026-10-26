# Practical 12: CI/CD Pipeline Screenshot Guide

**Student:** Aneri Patel | **ID:** 24AIML031 | **Subject:** AWDF (ITUE301)  
**Feature:** GitHub Actions CI Pipeline (Automated Testing + Frontend Build)

---

## Required Screenshots

### 1. Failed GitHub Actions Pipeline (`ci-failed.png`)

**What to show:** The GitHub Actions dashboard showing a failed workflow run with a red ❌ on the `test-backend` job.

**Reproduction Steps:**
1. Create a demonstration branch and introduce a deliberate assertion failure:
   ```bash
   git checkout -b ci-failure-demo
   ```
2. In `tests/tasks.test.js`, find the GET /tasks test:
   ```javascript
   expect(res.statusCode).toBe(200);
   ```
   Change it to:
   ```javascript
   expect(res.statusCode).toBe(201); // deliberate failure
   ```
3. Commit and push:
   ```bash
   git add tests/tasks.test.js
   git commit -m "test: demonstrate deliberate CI pipeline failure"
   git push -u origin ci-failure-demo
   ```
4. Open `https://github.com/Aneri-1203/Task-Manager/actions`
5. Wait for the workflow to complete (approximately 1–2 minutes)
6. Click the failed run → expand `test-backend` → screenshot showing:
   - Red ❌ on `test-backend` job
   - Failure message: `Expected: 201, Received: 200` or similar
   - Workflow name: `CI Pipeline`

**Suggested filename:** `ci-failed.png`

---

### 2. Passed GitHub Actions Pipeline (`ci-passed.png`)

**What to show:** The GitHub Actions dashboard showing a fully successful workflow run with green ✔️ on both `test-backend` and `build-frontend` jobs.

**Reproduction Steps:**
1. Revert the deliberate failure in `tests/tasks.test.js`:
   ```javascript
   expect(res.statusCode).toBe(200); // restored correct assertion
   ```
2. Commit and push the fix:
   ```bash
   git add tests/tasks.test.js
   git commit -m "fix: restore passing test assertion for CI verification"
   git push
   ```
3. Open `https://github.com/Aneri-1203/Task-Manager/actions`
4. Wait for the workflow to complete
5. Click the successful run → screenshot showing:
   - Green ✔️ on both `test-backend` and `build-frontend` jobs
   - All steps completed successfully
   - Total duration displayed

**Suggested filename:** `ci-passed.png`

---

### 3. Local Test Success (`local-tests-passed.png`)

**What to show:** Terminal output showing all Jest tests passing locally.

**Reproduction Steps:**
1. Open a terminal in the project root
2. Run: `npm test`
3. Wait for the test suite to complete
4. Screenshot showing:
   - `PASS tests/tasks.test.js`
   - `PASS tests/ai.test.js`
   - All tests count with green output
   - "Tests: X passed, X total" summary

**Suggested filename:** `local-tests-passed.png`

---

### 4. CI Workflow YAML in Editor (`ci-workflow-yaml.png`)

**What to show:** VS Code (or any editor) displaying the `.github/workflows/ci.yml` file with both `test-backend` and `build-frontend` jobs visible.

**Reproduction Steps:**
1. Open `.github/workflows/ci.yml` in VS Code
2. Ensure both job definitions are visible in the editor
3. Screenshot showing:
   - File path in the title bar
   - `jobs:` section with `test-backend` and `build-frontend`
   - The `run: npm test` and `run: npm run build` commands visible

**Suggested filename:** `ci-workflow-yaml.png`

---

### 5. GitHub Commit (`github-commit.png`)

**What to show:** The GitHub repository commit history showing CI-related commits.

**Reproduction Steps:**
1. Open `https://github.com/Aneri-1203/Task-Manager/commits/main`
2. Screenshot the commit list showing:
   - Your username: `Aneri-1203`
   - Commit messages including the deliberate failure commit and the fix commit
   - Repository name: `Task-Manager`

**Suggested filename:** `github-commit.png`

---

## Screenshot Storage

Save all screenshots to: `docs/practical-12/`

| Filename | Description |
|----------|-------------|
| `ci-failed.png` | GitHub Actions failed run (red ❌) |
| `ci-passed.png` | GitHub Actions successful run (green ✔️) |
| `local-tests-passed.png` | Terminal showing all tests passing locally |
| `ci-workflow-yaml.png` | VS Code showing ci.yml workflow file |
| `github-commit.png` | GitHub commit history |
