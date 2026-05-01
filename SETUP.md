STEP 1 — Put your API keys in .env

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
