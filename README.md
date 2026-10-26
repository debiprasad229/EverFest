# EverFest — Celebration & Event Planner
**PromptWars Challenge 5: Celebration & Event Planner**

EverFest is an AI-powered celebration and event planning platform designed to transform chaotic event logistics into a calm, structured, and visually stunning experience.

---

## 🌟 Core Features

- **Multi-Celebration Architecture**: Native support for **Weddings**, **Birthdays**, **Anniversaries**, and **Community Festivals** with celebration-specific defaults and aesthetics.
- **AI Celebration Architect**: Interactive blueprint generator powered by **Google Gemini** (with an autonomous intelligent template fallback for offline/zero-config operation) producing:
  - Harmonized color palettes & thematic concept narratives
  - Percentage-balanced budget breakdowns
  - Pre-event milestone task roadmaps
  - Minute-by-minute day-of Run-of-Show schedules
  - Vendor checklist questions
  - **One-click "Adopt Blueprint"** into active events
- **Budget & Expenses Tracker**:
  - Total budget, committed allocations, actual payments, and remaining balances
  - Category distribution visualization with **Recharts**
  - Line-item ledger with inline payment status progression (`Unpaid` → `Deposit Paid` → `Paid in Full`)
- **Timeline & Day-of Schedule**:
  - Dual-mode tracker: **Milestone Roadmap** (pre-event due dates, priorities, status checkboxes) and **Run-of-Show** (chronological staging times, locations, and lead persons)
- **Vendor CRM Hub**:
  - Directory categorized by role (Venue, Catering, Photography, Florist, Music/DJ, etc.)
  - Pipeline status (`Researching` → `Contacted` → `Quoted` → `Booked` → `Completed`)
  - Direct contact links (phone, email, website) and contracted amount tracking
- **Print & Export Engine**:
  - Dedicated `@media print` layout rendering a clean white-and-black physical brief
  - Run-of-Show cheat sheet for MCs and coordinators
  - Emergency vendor contact roster
  - One-click CSV export for Budgets and Tasks

---

## 🛠️ Architecture & Tech Stack

| Layer | Technologies | Deployment Target |
| :--- | :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide React, React Hook Form, Zod, Recharts | **Vercel** (Static SPA with edge rewrites) |
| **Backend** | Node.js, Express, TypeScript, Zod, Google Generative AI SDK (`@google/generative-ai`) | **Render / Railway / Fly.io** (Node.js LTS) |
| **Data Persistence** | Browser LocalStorage DAL with Zod schema validation & auto-recovery; server JSON storage for exports | Client-side LocalStorage & API DAL |
| **Testing** | Vitest, React Testing Library, JSDOM | Automated CI (`npm test`) |

---

## 🚀 Local Development Setup

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (LTS recommended)
- **npm**: v9.0.0 or higher

### 2. Installation
Install root, client, and server dependencies in one command:
```bash
npm run install:all
```
*(Or install manually: `npm install && cd server && npm install && cd ../client && npm install`)*

### 3. Environment Variables Configuration

The project separates frontend and backend configuration strictly:

#### Frontend (`client/.env`)
Copy the example template:
```bash
cp client/.env.example client/.env
```
Contents:
```env
# In local development, leave blank to use the Vite dev proxy to localhost:5000,
# or set to http://localhost:5000/api/v1
VITE_API_URL=http://localhost:5000/api/v1
```

#### Backend (`server/.env`)
Copy the example template:
```bash
cp server/.env.example server/.env
```
Contents:
```env
# Server Network Settings
PORT=5000
NODE_ENV=development

# CORS Configuration (Allowed frontend origin)
CLIENT_URL=http://localhost:5173

# Google Gemini AI Integration (Backend-Only)
# Obtain your API key from Google AI Studio: https://aistudio.google.com/
# NEVER expose this key to frontend code or client bundles.
# If omitted or invalid, EverFest seamlessly falls back to its deterministic domain planning engine.
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.8-flash
```

> [!NOTE]
> EverFest functions autonomously with an Intelligent Domain Planning Engine even without a Gemini API key, so you can test and explore immediately without external dependencies.

### 4. Run Development Servers
Start both backend and frontend concurrently:
```bash
npm run dev
```
- **Frontend App**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000/api` (and `http://localhost:5000/api/v1`)
- **Health Check**: `http://localhost:5000/health`

---

## 📜 Complete npm Scripts Reference

### Root Workspace Scripts
| Script | Command | Description |
| :--- | :--- | :--- |
| `npm run install:all` | `npm install && npm install --prefix server && npm install --prefix client` | Installs dependencies across all workspaces |
| `npm run dev` | `concurrently ... "npm run dev --prefix server" "npm run dev --prefix client"` | Runs client and server concurrently |
| `npm run dev:server` | `npm run dev --prefix server` | Starts backend development server with `tsx watch` |
| `npm run dev:client` | `npm run dev --prefix client` | Starts frontend Vite development server |
| `npm run build` | `npm run build --prefix server && npm run build --prefix client` | Builds production bundles for server and client |
| `npm run build:server`| `npm run build --prefix server` | Compiles server TypeScript to `server/dist` |
| `npm run build:client`| `npm run build --prefix client` | Bundles client with Vite to `client/dist` |
| `npm run lint` | `npm run lint --prefix server && npm run lint --prefix client` | Runs TypeScript linting checks (`tsc --noEmit`) |
| `npm run test` | `npm run test --prefix server && npm run test --prefix client` | Executes Vitest test suites on server and client |
| `npm start` | `npm run start --prefix server` | Starts compiled production server (`node dist/index.js`) |

### Client Scripts (`client/`)
| Script | Description |
| :--- | :--- |
| `npm run dev` | Starts Vite dev server with proxy at `http://localhost:5173` |
| `npm run build` | Type-checks and bundles the application to `dist/` |
| `npm run preview` | Previews the production build locally |
| `npm run lint` | Runs `tsc --noEmit` type checking |
| `npm test` | Runs Vitest in JSDOM with React Testing Library |

### Server Scripts (`server/`)
| Script | Description |
| :--- | :--- |
| `npm run dev` | Runs backend in development mode with `tsx watch src/index.ts` |
| `npm run build` | Cleans `dist/` with rimraf and compiles TypeScript |
| `npm start` | Runs compiled production backend with `node dist/index.js` |
| `npm run lint` | Runs `tsc --noEmit` type checking |
| `npm test` | Runs Vitest tests on routes and services |

---

## 🌐 Production Deployment Guide

EverFest is designed for decoupled cloud deployment: the **React frontend on Vercel** and the **Express backend on any compatible Node.js host** (e.g. Render, Railway, Fly.io, Heroku, or AWS App Runner).

```
┌────────────────────────────────┐         ┌────────────────────────────────┐
│         Vercel (Client)        │  HTTPS  │    Render / Railway (Server)   │
│   https://everfest.vercel.app  │────────▶│  https://everfest-api.com/api  │
│    (Static Vite SPA Bundle)    │  CORS   │   (Express Node.js Service)    │
└────────────────────────────────┘         └────────────────────────────────┘
                                                           │
                                                           ▼ Google AI SDK
                                           ┌────────────────────────────────┐
                                           │     Google Gemini AI API       │
                                           │     (Backend-Only Key)         │
                                           └────────────────────────────────┘
```

---

### Step 1: Deploy Backend (Render / Railway / Fly.io)

1. **Create a New Web Service** on your chosen host (e.g. [Render](https://render.com) or [Railway](https://railway.app)).
2. Connect your Git repository.
3. Configure the service settings:
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/health` (returns HTTP 200 `{ status: "ok" }`)
4. **Set Backend Environment Variables**:
   ```env
   NODE_ENV=production
   PORT=5000
   CLIENT_URL=https://your-everfest-frontend.vercel.app
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-3.8-flash
   ```
   > [!TIP]
   > `CLIENT_URL` supports multiple origins separated by commas if you have custom domains or staging environments (e.g., `https://everfest.vercel.app,https://everfest-preview.vercel.app`).
5. Deploy the backend and copy your live service URL (e.g., `https://everfest-api.onrender.com`).

---

### Step 2: Deploy Frontend (Vercel)

1. Log in to [Vercel](https://vercel.com) and click **"Add New Project"**.
2. Select your repository.
3. Configure project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `client` *(or leave as root, as both `client/vercel.json` and root `vercel.json` are pre-configured)*
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. **Set Frontend Environment Variable**:
   In Vercel **Project Settings > Environment Variables**:
   ```env
   VITE_API_URL=https://your-everfest-api.onrender.com/api/v1
   ```
   *(EverFest automatically handles bare domain URLs like `https://your-everfest-api.onrender.com` or explicit endpoints like `.../api` or `.../api/v1` through its built-in `resolveApiBase()` utility).*
5. Click **"Deploy"**. Vercel will build the production bundle and deploy it to a `.vercel.app` domain.
6. **Update Backend CORS**: Return to your backend host and update `CLIENT_URL` to match your assigned Vercel URL (e.g., `https://everfest-xyz.vercel.app`).

---

## 🔒 Security & Backend AI Architecture

1. **Strict Backend-Only Secret Isolation**: The `GEMINI_API_KEY` is read strictly from `process.env` on the Node.js server. No `VITE_` prefixed variables or client bundles ever receive or expose API credentials.
2. **Centralized Error & Secret Scrubbing**: All logs and error outputs automatically mask and scrub Google API key patterns (`AIzaSy...`) with `[REDACTED_API_KEY]`, preventing accidental credential leaks in server logs or stack traces.
3. **Structured Response Validation**: Responses from Gemini are parsed and strictly validated against the server-side `GeminiEventPlanResponseSchema` Zod model before returning to clients.
4. **Strict Production CORS**:
   - In production, only the domains listed in `CLIENT_URL` (comma-separated allowlist) are permitted.
   - Any unauthorized origins receive an explicit `HTTP 403: Blocked by CORS policy`.
   - In development, local loopback origins (`localhost`, `127.0.0.1`) on any port are permitted for testing.
5. **Request Protection**:
   - **Body Size Limit**: Strict 100kb request limit (`express.json({ limit: '100kb' })`) prevents memory exhaustion and denial-of-service.
   - **Rate Limiting**: Built-in IP rate limiter restricts AI generation to 25 requests per 15 minutes per IP (`aiLimiter`) and 300 requests per 15 minutes across general endpoints (`generalApiLimiter`).
   - **XSS & Injection Protection**: HTML sanitization removes raw `<script>`, `<iframe>`, and unescaped markup from model responses.

---

## 🛠️ Troubleshooting Guide

### 1. `Blocked by CORS policy` in the browser console
- **Cause**: The backend's `CLIENT_URL` does not match the frontend's origin URL.
- **Fix**: In your backend host dashboard (Render/Railway), update `CLIENT_URL` to include your exact frontend URL (including `https://`, without trailing slash), e.g. `CLIENT_URL=https://everfest.vercel.app`. Multiple domains can be comma-separated: `https://everfest.vercel.app,https://staging.everfest.com`.

### 2. `Gemini API free-tier quota has been reached (HTTP 429)`
- **Cause**: Gemini free-tier rate limits (15 requests/minute or daily token quota exceeded).
- **Fix**: EverFest automatically catches HTTP 429 errors and provides a friendly notice to the user. Users can click **"Switch to Demo Mode"** to instantly generate high-fidelity, deterministic celebration plans without hitting external APIs.

### 3. `The AI planning request timed out after 25 seconds (HTTP 504)`
- **Cause**: Upstream latency from Gemini during peak hours.
- **Fix**: EverFest includes an automated 25-second safeguard (`withTimeout`). The UI presents a **Retry** button and an instant **Demo Mode** fallback.

### 4. `404 Not Found` when refreshing a page on Vercel
- **Cause**: Single-Page Applications (SPAs) require all client-side paths to be redirected to `index.html`.
- **Fix**: Pre-configured in `client/vercel.json` and root `vercel.json` via:
  ```json
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
  ```

### 5. `Backend server is unreachable on /api`
- **Cause**: The frontend is trying to call the backend, but the backend is either not running locally or `VITE_API_URL` is pointing to an incorrect URL.
- **Fix**:
  - Locally: verify the backend is running on `http://localhost:5000` with `npm run dev:server`.
  - In production: verify `VITE_API_URL` in Vercel project settings is set to your live backend URL (e.g. `https://everfest-api.onrender.com/api/v1`).

---

## 📦 Repository Hygiene & Size Verification

- **Repository Source Size**: **1.00 MB** (measured excluding `node_modules` and `dist`), well below the 10 MB limit.
- **Ignored Files**: All `.env`, `.env.*`, build artifacts (`dist/`, `build/`), logs, and `node_modules/` are strictly excluded via root, client, and server `.gitignore` files.
- **No Tracked Secrets**: Zero API keys or private tokens are committed to source files.
