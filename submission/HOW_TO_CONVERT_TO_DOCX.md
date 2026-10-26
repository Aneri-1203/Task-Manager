# How to Convert Submission HTML Files to .docx

The two practical documents are provided as HTML files with proper formatting.
Convert them to Word documents using one of these methods:

## Method 1 — Microsoft Word (Recommended)
1. Open `24AIML031_Practical_12.html` in **Microsoft Word** (File > Open > select the .html file)
2. Word will render the HTML with formatting preserved
3. Click **File > Save As**
4. Change file type to **Word Document (.docx)**
5. Save as `24AIML031_Practical_12.docx`
6. Repeat for `24AIML031_Practical_13.html` → `24AIML031_Practical_13.docx`

## Method 2 — Google Docs
1. Upload the `.html` file to Google Drive
2. Open with Google Docs
3. File > Download > Microsoft Word (.docx)

## After Converting

Insert the real screenshots at each `[SCREENSHOT N: ...]` placeholder:
- Take each screenshot as described in `docs/practical-12/SCREENSHOT_GUIDE.md`
  and `docs/practical-13/SCREENSHOT_GUIDE.md`
- In Word: click on the placeholder text → Insert > Pictures → select your screenshot
- Delete the placeholder text after inserting the image

## Screenshot Checklist

### Practical 12
- [ ] `ci-failed.png` — GitHub Actions failed run (red ❌)
- [ ] `ci-passed.png` — GitHub Actions passed run (green ✔️)
- [ ] `local-tests-passed.png` — Terminal: npm test showing 22 passed
- [ ] `ci-workflow-yaml.png` — VS Code showing ci.yml
- [ ] `github-commit.png` — GitHub commit history

### Practical 13
- [ ] `task-creation-ai.png` — Task modal with AI description generated
- [ ] `automated-tests.png` — Terminal: npm test showing 22 passed
- [ ] `ai-api-failure.png` — Task modal showing error banner
- [ ] `ai-rate-limit.png` — Task modal showing "Wait Ns" cooldown button
- [ ] `github-commit.png` — GitHub commit history
