# Community Hero – Hyperlocal Problem Solver 🦸

Community Hero is an AI-powered civic issue reporting platform where citizens can report local infrastructure problems (potholes, garbage dumps, water leakages, broken streetlights, etc.), collaborate with the community, and track issue resolution transparently. This application is structured as a full-stack production-ready monorepo ready for deployment on **Google Cloud Run**.

## Key Features

1. **AI Diagnostics (Gemini 1.5 Flash)**: Automatically categorizes photos, generates title summaries, recommends public works departments, estimates resolution timelines, and generates neighborhood safety precautions.
2. **Duplicate Prevention**: Intelligently searches for active complaints nearby (within 150m) and highlights options to upvote existing issues instead of creating spam duplicates.
3. **Interactive Map**: Interactive pins showing severity (Critical = Red, High = Orange, Medium = Yellow, Low = Green) with filter controls.
4. **Before & After Sliders**: Sliding image comparison widgets for resolved issues uploaded by maintenance crews.
5. **Conversational Assistant**: Chat with "HeroBot", an AI chatbot powered by Gemini guiding users on platform features and municipal bylaws.
6. **Voice Reporting**: Dictate complaints using web speech-to-text; Gemini extracts formal titles and descriptions from voice transcripts.
7. **Gamification Leaderboard**: Scoreboards, reputation points, and contribution badges (Community Hero, Road Guardian, Water Protector, Clean City Champion).

---

## Dual-Mode Architecture (Mock vs. Live)

To allow instant testing, Community Hero supports a **dual-mode SDK architecture**:
- **Mock Mode (Default)**: If API keys are not supplied or have default values, the app runs using fully functional mock authentication, an in-memory database seeded with realistic data, interactive Leaflet maps, and simulated Gemini text responses.
- **Live Mode**: Simply add actual API keys to the `.env` file at the root to instantly activate live Google Gemini client calls, Google Maps API, and Firebase Authentication, Firestore, and Storage.

---

## File Layout

```text
community-hero/
├── package.json         # Workspace concurrently runner
├── Dockerfile           # Multi-stage Cloud Run build
├── .env.example         # Template environment variables
├── backend/
│   ├── config.js        # Firebase Admin vs Mock DB router
│   ├── server.js        # Main Express backend server
│   ├── services/        # Gemini API & Duplicate detection service
│   └── routes/          # Express API route modules
└── frontend/
    ├── vite.config.js   # Dev proxy configuration
    ├── tailwind.config  # Material design theme specs
    ├── index.html       # Inter google fonts loading
    └── src/
        ├── main.jsx     # Route configurations & Guards
        ├── context/     # Firebase vs LocalStorage Auth Context
        ├── components/  # MapContainer, ImageSlider, Toast, Skeletons
        └── pages/       # Landing, Dashboard, Report, Details, Insights
```

---

## Installation & Local Execution

### 1. Prerequisite
Ensure you have [Node.js v18+](https://nodejs.org/) installed.

### 2. Set Up Environment Variables
Copy `.env.example` to a new file named `.env` at the root directory:
```bash
cp .env.example .env
```
*(You can leave the default placeholder values to run immediately in **Mock Mode**!)*

### 3. Install Dependencies
Run the installation script at the root directory:
```bash
npm run install:all
```

### 4. Run Development Server
Run the concurrently script to boot both frontend (Vite) and backend (Express):
```bash
npm run dev
```
- Frontend will run on: `http://localhost:3000`
- Backend API will run on: `http://localhost:8080`

---

## Live Configuration Guides

To unlock full live functionality, update the `.env` file at your root directory:

### Gemini AI Key Setup
1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Click **Get API Key** and generate a key.
3. Paste it under `GEMINI_API_KEY=your_key` in `.env`.

### Google Maps API Key Setup
1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the **Maps JavaScript API**.
3. Create API credentials (API Key) and restrict it to your domain.
4. Add it to `VITE_GOOGLE_MAPS_API_KEY=your_key` in `.env`.

### Firebase Client Setup (Auth, Storage, Firestore)
1. Go to [Firebase Console](https://console.firebase.google.com/) and create a project.
2. Enable **Authentication (Google Sign-In)**, **Cloud Firestore Database**, and **Cloud Storage**.
3. Register a Web App inside your Firebase Project Settings.
4. Copy the Web config snippet and paste values into `.env` (e.g. `VITE_FIREBASE_API_KEY`, etc.).

### Firebase Admin SDK Setup (Backend)
1. In Firebase Console, go to **Project Settings** ➔ **Service Accounts**.
2. Click **Generate New Private Key** to download the JSON credentials file.
3. Convert the downloaded JSON contents into a single-line string and paste it into `FIREBASE_SERVICE_ACCOUNT_JSON='{...}'` in `.env`, or save the file locally and point to it with `FIREBASE_SERVICE_ACCOUNT_PATH=path/to/file.json`.

---

## Google Cloud Run Deployment

Community Hero is optimized to build frontend assets and serve them statically from the Express backend, enabling deployment as a **single containerized service** to Google Cloud Run:

```bash
# 1. Build the production image using Google Cloud Build
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/community-hero

# 2. Deploy to Cloud Run (automatically spins up and handles PORT 8080)
gcloud run deploy community-hero \
  --image gcr.io/YOUR_PROJECT_ID/community-hero \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars="GEMINI_API_KEY=your_key,VITE_GOOGLE_MAPS_API_KEY=your_key,VITE_FIREBASE_API_KEY=..."
```
*(Be sure to replace `YOUR_PROJECT_ID` with your actual Google Cloud Project ID).*
