# Practical 13: AI Feature Screenshot Guide

**Student:** Aneri Patel | **ID:** 24AIML031 | **Subject:** AWDF (ITUE301)  
**Feature:** AI Task Description Generator using Google Gemini API

---

## Required Screenshots

### 1. Task Creation Form with AI Feature (`task-creation-ai.png`)

**What to show:** The "Create New Task" modal with the `Generate Description` button visible and an AI-generated description populated in the textarea.

**Reproduction Steps:**
1. Start the backend: `npm run dev` (in project root)
2. Start the frontend: `cd client && npm run dev`
3. Open `http://localhost:5173` and log in
4. Click **New Task** from the Dashboard or Projects page
5. Type a task title (e.g., `Prepare DBMS practical file`)
6. Click the **✨ Generate Description** button next to the Description label
7. Wait for the description to populate in the textarea
8. Take the screenshot showing:
   - The task title entered
   - The generated description in the textarea
   - The success feedback banner (green or teal `Demo Mode` badge if in demo mode)
   - The responsible AI disclaimer below the textarea

**Setup needed:** Backend running with `AI_DEMO_MODE=true` in `.env` (zero-cost, no API key required).

**Suggested filename:** `task-creation-ai.png`

---

### 2. Automated Configuration / Test Execution (`automated-tests.png`)

**What to show:** Terminal output showing all Jest tests passing successfully.

**Reproduction Steps:**
1. Open a terminal in the project root
2. Run: `npm test`
3. Wait for all 21 tests to complete
4. Take the screenshot showing:
   - Test file names (`tasks.test.js`, `ai.test.js`)
   - All tests passing (green checkmarks or "PASS" labels)
   - Total test count and duration

**Suggested filename:** `automated-tests.png`

---

### 3. AI API Failure Handling (`ai-api-failure.png`)

**What to show:** The task modal displaying an error message when the AI provider is unavailable, while the task creation form itself remains usable.

**Reproduction Steps (Method A — Demo via missing key):**
1. Set `GEMINI_API_KEY=placeholder_invalid_key` in `.env` and `AI_DEMO_MODE=false`
2. Restart the backend
3. Open the task creation modal
4. Enter a task title and click **Generate Description**
5. The yellow warning banner will appear:
   `"Gemini API authentication failed. The provided GEMINI_API_KEY is invalid or unrecognized. Please enter the description manually."`
6. Screenshot the modal showing the error banner + task form still usable

**Reproduction Steps (Method B — Via automated test output):**
- The `ai.test.js` test suite has a dedicated test for this:
  `"should return HTTP 503 fallback when GEMINI_API_KEY is missing or placeholder"`
- Run `npm test` and screenshot the passing test result for this case

**Suggested filename:** `ai-api-failure.png`

---

### 4. AI API Rate Limit Handling (`ai-rate-limit.png`)

**What to show:** The task modal displaying a rate limit message with a live countdown timer after submitting the same title twice within 60 seconds.

**Reproduction Steps:**
1. Open the task creation modal
2. Enter a title (e.g., `Complete lab assignment`)
3. Click **Generate Description** → succeeds (first request)
4. Immediately click **Generate Description** again with the same title
5. The button changes to **⏱ Wait 59s** and the yellow warning appears:
   `"Rate limit reached. Please wait 59s before requesting another suggestion for this task title."`
6. Screenshot showing the countdown timer on the button

**Alternative (Test output):**
- The `ai.test.js` rate limiting test (`AI Rate Limiting Lifecycle`) covers this scenario
- Screenshot the passing test output from `npm test`

**Suggested filename:** `ai-rate-limit.png`

---

### 5. GitHub Commit (`github-commit.png`)

**What to show:** The GitHub repository commit history showing the AI feature commits on the `main` branch.

**Reproduction Steps:**
1. Push all changes to `https://github.com/Aneri-1203/Task-Manager`
2. Open the repository on GitHub
3. Click the **Commits** link (showing commit count next to the branch)
4. Screenshot the commit list showing:
   - Your username: `Aneri-1203`
   - Commit messages related to Practical 13
   - Repository name: `Task-Manager`

**Suggested filename:** `github-commit.png`

---

## Screenshot Storage

Save all screenshots to: `docs/practical-13/`

| Filename | Description |
|----------|-------------|
| `task-creation-ai.png` | Task modal with AI-generated description |
| `automated-tests.png` | All Jest tests passing in terminal |
| `ai-api-failure.png` | AI failure error message in modal |
| `ai-rate-limit.png` | Rate limit countdown in modal |
| `github-commit.png` | GitHub commit history |
