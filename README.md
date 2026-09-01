# Fit

Track body measurements and daily habits for you and your family. Built with Astro, React, Firebase, and deployed to GitHub Pages.

## Features

- **Guest mode** — use the app without signing in; data is stored locally in your browser
- **Auto-sync on sign-in** — when you sign in for the first time with no cloud data, local data is uploaded to Firebase
- **Today** — daily habit check-in (Low/Med/High), streaks, latest weight, derived metrics
- **Body** — measurement dashboard, weekly check-in wizard, history charts (including height growth for kids)
- **You** — multi-profile management, units, goals, CSV/JSON export, sign out

## Setup

1. Copy `.env.example` to `.env` and add your Firebase project keys.
2. In Firebase Console:
   - Enable **Google** sign-in under Authentication
   - Create a **Firestore** database
   - Paste the rules below under Firestore → Rules (subcollections are required)
   - Add your site hostname under Authentication → Settings → **Authorized domains**:
     - `localhost` (default — local dev)
     - `jeminpro.com` (production)
     - `www.jeminpro.com` (only if you use www)
   - Add the same `PUBLIC_FIREBASE_*` values as **GitHub repository secrets** (Settings → Secrets → Actions) so the deployed build includes Firebase config
3. Install and run locally:

```bash
npm install
npm run dev
```

4. Add `PUBLIC_FIREBASE_*` as GitHub repository secrets, then push to `main` to deploy.

## Production auth troubleshooting

Firebase checks the **browser hostname** (not the path). Production URL: **https://jeminpro.com/fit/**

| URL you open | Domain to add in Firebase |
| --- | --- |
| `https://jeminpro.com/fit/` | `jeminpro.com` |
| `https://www.jeminpro.com/fit/` | `www.jeminpro.com` |

If sign-in still fails, check GitHub Actions secrets — without them the production build has no Firebase keys.

## Firestore rules

The app stores data under **nested subcollections** (`profiles`, `measurements`, `habitDays`). A rule on `users/{userId}` alone does **not** cover those paths — each level needs its own `match` block.

Copy this into Firebase Console → Firestore → Rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /profiles/{profileId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;

        match /measurements/{measurementId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }

        match /habitDays/{dayId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
      }
    }
  }
}
```

Or deploy from this repo: `firebase deploy --only firestore:rules`

## Firestore structure

- `users/{uid}` — units, activeProfileId
- `users/{uid}/profiles/{profileId}` — name, sex, birthDate, enabledMeasurements, goals
- `users/{uid}/profiles/{profileId}/measurements/{id}` — type, value (metric), recordedAt, note
- `users/{uid}/profiles/{profileId}/habitDays/{YYYY-MM-DD}` — exercise, water, sleep, meditation, snacks

## Deploy

The workflow in `.github/workflows/deploy.yml` builds and deploys to GitHub Pages, served at **https://jeminpro.com/fit/**.
