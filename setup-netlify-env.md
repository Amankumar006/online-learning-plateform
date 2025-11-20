# Netlify Environment Setup Guide

## Issue
Your Netlify build is failing because Firebase environment variables are missing or invalid.

## Steps to Fix

### 1. Get Your Firebase App ID
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `adapted-ai-g9nx0`
3. Click the gear icon (Project Settings)
4. Scroll down to "Your apps" section
5. Copy the `appId` value (looks like: `1:139359722510:web:abc123def456`)

### 2. Update Your Local .env File
Replace the placeholder in your `.env` file:
```
NEXT_PUBLIC_FIREBASE_APP_ID=1:139359722510:web:your_actual_app_id_here
```

### 3. Configure Netlify Environment Variables
1. Go to your Netlify site dashboard
2. Navigate to **Site settings → Environment variables**
3. Add these variables with your actual values:

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyB_FSfaQ-_ZboeBaEPgwLDOq5IcNBpd9hM
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=adapted-ai-g9nx0.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=adapted-ai-g9nx0
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=adapted-ai-g9nx0.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=139359722510
NEXT_PUBLIC_FIREBASE_APP_ID=1:139359722510:web:your_actual_app_id_here
NEXT_PUBLIC_GEMINI_API_KEY=AIzaSyCVtMjXdlzvq1MH0cvIFQCQZawF4TH6x7g
NEXT_PUBLIC_GOOGLE_API_KEY=AIzaSyCVtMjXdlzvq1MH0cvIFQCQZawF4TH6x7g
GOOGLE_API_KEY=AIzaSyCVtMjXdlzvq1MH0cvIFQCQZawF4TH6x7g
GEMINI_API_KEY=AIzaSyCVtMjXdlzvq1MH0cvIFQCQZawF4TH6x7g
```

### 4. Redeploy
After adding the environment variables, trigger a new deployment in Netlify.

## What I've Fixed
- Added `export const dynamic = 'force-dynamic'` to pages that use Firebase
- Updated `.env.example` with all required Firebase variables
- Added missing `NEXT_PUBLIC_FIREBASE_APP_ID` placeholder to `.env`

## Alternative Quick Fix
If you want to deploy immediately without Firebase, you can temporarily disable Firebase initialization by wrapping it in a try-catch block, but this will break authentication and data features.