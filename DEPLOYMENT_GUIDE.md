# AquaLens — Deployment Guide
### Backend (Render) + Android APK (Expo EAS)

---

## PART 1 — HOST THE BACKEND ON RENDER

### Step 1 — Push code to GitHub
1. Go to github.com → **New repository** → name it `aqualens-backend` → **Create**
2. Open a terminal in the `backend/` folder and run:
```
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/aqualens-backend.git
git push -u origin main
```
> Make sure `.env` is in `.gitignore` (it already is) — never push your keys.

---

### Step 2 — Create a PostgreSQL database on Render
1. Go to **render.com** → sign in
2. Click **New +** → **PostgreSQL**
3. Fill in:
   - Name: `aqualens-db`
   - Region: pick closest to you
   - Plan: **Free**
4. Click **Create Database**
5. Once created, copy the **Internal Database URL** (starts with `postgresql://...`) — you will need it in Step 4.

---

### Step 3 — Create the Web Service on Render
1. Click **New +** → **Web Service**
2. Connect your GitHub repo → select `aqualens-backend`
3. Fill in:
   - Name: `aqualens-backend`
   - Runtime: **Python 3**
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn app:app`
   - Plan: **Free**
4. Click **Create Web Service**

---

### Step 4 — Add Environment Variables on Render
Go to your web service → **Environment** tab → add ALL of these one by one:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | *(paste the PostgreSQL Internal URL from Step 2)* |
| `JWT_SECRET_KEY` | `aqualens-super-secret-jwt-key-2024` |
| `VISION_AI_PROVIDER` | `openai` |
| `OPENAI_API_KEY` | `YOUR_OPENAI_API_KEY` |
| `CLOUDINARY_CLOUD_NAME` | `YOUR_CLOUDINARY_CLOUD_NAME` |
| `CLOUDINARY_API_KEY` | `YOUR_CLOUDINARY_API_KEY` |
| `CLOUDINARY_API_SECRET` | `YOUR_CLOUDINARY_API_SECRET` |

> **Note:** Gemini keys are no longer used. Vision AI is now powered by OpenAI GPT-5.4-mini.

Click **Save Changes** — Render will redeploy automatically.

---

### Step 5 — Seed the database
Once the service is deployed (green "Live" status):
1. Go to your web service → **Shell** tab
2. Run:
```
python seed_fish.py
```
This populates the database with fish species data.

---

### Step 6 — Copy your backend URL
Your backend URL will look like:
```
https://aqualens-backend.onrender.com
```
Copy it — you need it for the frontend in Part 2.

---

---

## PART 2 — BUILD THE ANDROID APK

### Step 1 — Update the API URL in the frontend
Open `FishApp/.env` (or create it if it doesn't exist):
```
EXPO_PUBLIC_API_URL=https://aqualens-backend.onrender.com
```
> Replace with your actual Render URL from Part 1 Step 6.

---

### Step 2 — Install EAS CLI
In a terminal run:
```
npm install -g eas-cli
```

---

### Step 3 — Create an Expo account
1. Go to **expo.dev** → Sign up (free)
2. In the terminal, log in:
```
eas login
```
Enter your Expo email and password.

---

### Step 4 — Configure EAS build
Inside the `FishApp/` folder, run:
```
eas build:configure
```
When asked which platform → select **Android**.
This creates an `eas.json` file automatically.

---

### Step 5 — Build the APK
Still inside `FishApp/`, run:
```
eas build -p android --profile preview
```
- This uploads the code to Expo's build servers
- It takes about 10–15 minutes
- When done, it gives you a **download link** for the `.apk` file

> **Free tier note:** Expo gives 30 free builds/month — more than enough.

---

### Step 6 — Download and install the APK
1. Click the download link from the terminal output (or find it at expo.dev → your project → Builds)
2. Transfer the `.apk` file to your Android phone
3. On the phone: Settings → Security → enable **Install from Unknown Sources**
4. Open the `.apk` file to install AquaLens

---

---

## QUICK REFERENCE — All Keys

### Cloudinary
- Cloud Name: `dmplqdcgw`
- API Key: `179935235522448`
- API Secret: `ujrztuR-XrB17j7kBeQ5inQkuQM`

### OpenAI API Key
- Key: `YOUR_OPENAI_API_KEY`
- Model: `gpt-5.4-mini`
- Credits: $5 loaded (pay-as-you-go on platform.openai.com)

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Render deploy fails | Check the Logs tab — usually a missing package in requirements.txt |
| Fish scan returns "Unrecognised" | Check OpenAI credit balance at platform.openai.com → Billing |
| App can't connect to backend | Check EXPO_PUBLIC_API_URL is set correctly and Render service is "Live" |
| APK build fails | Run `eas diagnostics` inside FishApp/ to check for issues |
| Database empty after deploy | Run `python seed_fish.py` in the Render Shell tab |
