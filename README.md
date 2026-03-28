<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/731fa64d-095e-4333-bc92-ea0d690d6f41

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


## Runtime file checklist (for GitHub sync)

When moving this project between environments, make sure these files are included (they are required by imports at runtime):

- `src/i18n.ts`
- `src/components/LanguageSwitcher.tsx`
- `src/components/WeeklyChallenge.tsx`
- `src/components/DailyStreak.tsx`
- `src/services/imageProcessor.ts`

If these files exist, the project should start normally with:

```bash
npm install
npm run dev
```
