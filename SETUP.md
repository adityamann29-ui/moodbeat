# MoodBeats — Complete Setup Guide

## Folder Structure
```
moodbeats/
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js          ← paste your Render URL here (Step 5)
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── .gitignore
│   └── .env               ← paste your API keys here (Step 2)
└── SETUP.md
```

---

## STEP 1 — Put your API keys in .env

Inside the `backend/` folder, create a file called exactly `.env` (note the dot).
Copy the contents of `.env.example` into it and fill in your keys:

```
WATSON_API_KEY=        ← your IBM Watson Tone Analyzer API key
WATSON_URL=            ← your IBM Watson service URL
CLOUDANT_URL=          ← your IBM Cloudant URL
CLOUDANT_USERNAME=     ← your Cloudant username
CLOUDANT_PASSWORD=     ← your Cloudant password
PORT=3001
```

### Where to find each key:

**Watson Tone Analyzer keys:**
1. Go to cloud.ibm.com → Log in
2. Click "Resource List" from the top-left menu
3. Find your Tone Analyzer service → click it
4. Click "Credentials" on the left sidebar
5. Expand "Auto-generated credentials"
6. Copy `apikey` → paste as WATSON_API_KEY
7. Copy `url`    → paste as WATSON_URL

**Cloudant keys:**
1. Go to cloud.ibm.com → Resource List
2. Find your Cloudant service → click it
3. Click "Service credentials" on the left sidebar
4. Click "New credential" → name it "moodbeats" → click Add
5. Expand the new credential
6. Copy `url`      → paste as CLOUDANT_URL
7. Copy `username` → paste as CLOUDANT_USERNAME
8. Copy `password` → paste as CLOUDANT_PASSWORD

**Create the Cloudant database:**
1. Open your Cloudant service → click "Launch Dashboard"
2. Click "Create Database" → name it exactly: `moodbeats`
3. Select "Non-partitioned" → click Create

---

## STEP 2 — Test locally first

```bash
cd backend
npm install
node server.js
```

You should see: `Server running on port 3001`

Open a browser and go to: `http://localhost:3001`
You should see: `MoodBeats backend running ✅`

Open `frontend/index.html` in your browser to test the full app locally.
(For local testing, change API_URL in script.js to `http://localhost:3001`)

---

## STEP 3 — Deploy backend to Render (free)

1. Push your entire `moodbeats/` folder to a GitHub repo
2. Go to render.com → Sign up free with GitHub
3. Click "New +" → "Web Service"
4. Connect your GitHub repo
5. Fill in these settings:
   - Name: `moodbeats-backend`
   - Root Directory: `backend`
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `node server.js`
6. Scroll to "Environment Variables" → click "Add from .env"
   Paste all 5 variables from your .env file here
   (WATSON_API_KEY, WATSON_URL, CLOUDANT_URL, CLOUDANT_USERNAME, CLOUDANT_PASSWORD)
7. Click "Create Web Service"
8. Wait 2-3 minutes — Render gives you a URL like:
   `https://moodbeats-backend.onrender.com`

---

## STEP 4 — Update frontend with your Render URL

Open `frontend/script.js` → line 4:

```js
const API_URL = 'https://YOUR_RENDER_BACKEND_URL_HERE';
```

Replace with your actual Render URL:

```js
const API_URL = 'https://moodbeats-backend.onrender.com';
```

---

## STEP 5 — Deploy frontend to Vercel (free)

1. Go to vercel.com → Sign up free with GitHub
2. Click "Add New Project"
3. Import your GitHub repo
4. Set Root Directory to: `frontend`
5. Click Deploy
6. Vercel gives you a live URL like: `https://moodbeats.vercel.app`

That's your shareable link. Done!

---

## What to say to judges

"The frontend is plain HTML/CSS/JS deployed on Vercel.
The backend is Node.js with Express, deployed on Render.
When a user types how they feel, the backend calls IBM Watson Tone Analyzer —
a cloud AI service — which returns emotion scores.
We map those scores to songs and return YouTube links.
Each entry is saved to IBM Cloudant, which is IBM's cloud NoSQL database.
Everything is deployed, live, and accessible from any browser."

---

## Common errors

| Error | Fix |
|-------|-----|
| `401 Unauthorized` from Watson | Wrong API key — re-check WATSON_API_KEY |
| `CORS error` in browser | Make sure CORS is enabled in server.js (it is by default) |
| `Cannot reach server` | Your Render URL in script.js might have a typo |
| Render app slow first load | Normal — free tier sleeps after 15 min. First request wakes it up in ~30 sec |
| Watson URL error | Make sure WATSON_URL has no trailing slash |
