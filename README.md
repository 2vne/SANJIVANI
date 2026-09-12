# 🚨 SANJIVANI — Agentic Disaster Relief & Emergency Resource Coordinator

**Team ID:** KH015  
**Team Name:** CHAR COAL  
**Repository:** [github.com/djain28006/disaster](https://github.com/djain28006/disaster)  

---

## 📁 Repository Structure

```
KH015-CHAR_COAL/
│
├── README.md                           # Main Project Overview & Render Deployment Guide
├── LICENSE                             # MIT Open Source License
├── requirements.txt                    # Python Backend Dependencies for Render
├── render.yaml                         # Render Deployment Infrastructure Config
├── package.json                        # Frontend Node Package Configuration
├── .gitignore                          # Git Ignore File
│
├── src/                                # React Frontend Source Code
│   ├── components/                     # Leaflet Maps, Navbar, Charts & UI Controls
│   ├── context/                        # Global State Management (DisasterContext)
│   ├── pages/                          # Command Centre, Safe Route, Incidents, Shelters
│   ├── services/                       # REST API Services & Geocoding Integrations
│   └── types/                          # TypeScript Interfaces
│
├── backend/                            # FastAPI Python Backend Source Code
│   ├── app/
│   │   ├── main.py                     # FastAPI Application Entrypoint
│   │   ├── routers/                    # Incident, Resource, Shelter & Route Routers
│   │   └── services/                   # Safe Routing OSRM Engine
│   └── requirements.txt                # Backend Dependency Manifest
│
├── docs/                               # Documentation & Architecture Diagrams
│   ├── project-documentation.md        # Comprehensive Technical Documentation
│   └── architecture.png                # System Architecture Diagram
│
├── screenshots/                        # Application UI Screenshots
│   ├── screenshot-1.png                # SANJIVANI Command Centre Dashboard
│   └── screenshot-2.png                # Safe Route Engine with Red Alert Bypass
│
└── data/                               # Data Telemetry & Overpass API Docs
    └── README.md                       # Data Sources & Model Schemas
```

---

## 🚀 HOW TO DEPLOY BACKEND FIRST ON RENDER RIGHT NOW

Follow these exact step-by-step instructions to deploy the FastAPI backend on **Render**:

### Step 1: Log in to Render
1. Go to [render.com](https://render.com) and log in (or sign up using GitHub).
2. Click the **"New +"** button in the top right header and select **"Web Service"**.

### Step 2: Connect GitHub Repository
1. Select **"Build and deploy from a Git repository"**.
2. Search and select repository: `djain28006/disaster` (or your repository fork).

### Step 3: Configure Web Service Settings
Fill in the following service settings:

| Setting Field | Recommended Value |
| :--- | :--- |
| **Name** | `sanjivani-backend` |
| **Region** | `Singapore (Southeast Asia)` or closest |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| **Instance Type** | `Free` |

### Step 4: Add Environment Variables
Under **Environment Variables**, click **Add Environment Variable**:

- `ENVIRONMENT` = `production`
- `PYTHON_VERSION` = `3.10.12`

### Step 5: Click Create Web Service
Click **"Create Web Service"**. Render will automatically clone the code, install dependencies, and launch Uvicorn on `$PORT`.

Once deployed, Render will provide your Live Production URL (e.g. `https://sanjivani-backend.onrender.com`).

---

## ⚡ Main System Features

1. **SANJIVANI Command Centre (`/`)**: Real-time Leaflet map displaying active disaster incidents, live emergency shelters, resource units, and customizable operational radius ($1\text{ km}$ to $50\text{ km}$).
2. **Safe Route Engine (`/safe-route`)**:
   - **Google Maps Style Search**: Live address search with auto-complete dropdown (no manual lat/lng needed).
   - **Hazard Avoidance**: OSRM routing bypassing active disaster danger zones.
   - **Red Alert Visualization**: Translucent red hazard circles highlighting bypassed threat sectors.
3. **Live Shelter Network (`/shelters`)**: Dynamic OpenStreetMap Overpass extraction within $X$-km radius with persistent evacuee admission controls (`-10`, `-1`, `+1`, `+10`).
4. **Fleet Logistics (`/resources`)**: Functional **DISPATCH** and **SET AVAILABLE** controls with target incident selector dropdowns.
5. **Incidents Feed (`/incidents`)**: Real-time SOS alerts and emergency reports.

---

## 💻 Local Development Setup

### Backend (FastAPI):
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend (React + Vite):
```bash
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 📄 License
Licensed under the [MIT License](LICENSE).
