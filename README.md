# REIFlow CRM

A full-stack CRM for real estate investors. Track leads from direct mail, cold calling, and cold texting (LaunchControl). Add notes, create follow-up tasks, manage your team, and monitor your pipeline — all in one place.

---

## Features

- **Lead Management** — Full pipeline tracking with status, source, asking price, ARV, repair estimates, and profit calculations
- **Notes** — Add timestamped call/visit notes to any lead
- **Tasks** — Create and assign follow-up tasks with due dates and priority levels
- **Activity Feed** — Auto-logged history of every status change and action on a lead
- **Team Accounts** — Admin can create login accounts for team members (email + password)
- **Role-Based Access** — Admins can delete leads and manage users; members manage their own leads
- **Dashboard** — Pipeline overview by status and source, recent leads, upcoming tasks
- **Lead Sources** — Direct Mail, Cold Call, Cold Text, LaunchControl, DFD, Referral, and more

---

## Tech Stack

- **Backend**: Node.js + Express + PostgreSQL (via `pg`)
- **Frontend**: React 18 + React Router
- **Auth**: JWT (7-day tokens)
- **Hosting**: Railway (2 services + PostgreSQL plugin)

---

## Deploy to Railway

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/rei-crm.git
git push -u origin main
```

### Step 2 — Create Railway Project

1. Go to [railway.app](https://railway.app) and create a new project
2. Click **"Add Service"** → **"GitHub Repo"** → select your repo
3. When asked which folder, select **`backend`**

### Step 3 — Add PostgreSQL

In your Railway project:
1. Click **"Add Service"** → **"Database"** → **"Add PostgreSQL"**
2. Railway will automatically provision the database and set `DATABASE_URL`

### Step 4 — Configure Backend Environment Variables

In your backend service → **Variables** tab, add:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | *(auto-set by Railway Postgres plugin)* |
| `JWT_SECRET` | Any long random string, e.g. `openssl rand -hex 32` |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | Your frontend Railway URL (set after frontend deploys) |

### Step 5 — Deploy Frontend

1. In Railway, click **"Add Service"** → **"GitHub Repo"** → same repo, folder **`frontend`**
2. In the frontend service → **Variables** tab, add:

| Variable | Value |
|----------|-------|
| `REACT_APP_API_URL` | Your backend Railway URL + `/api` (e.g. `https://rei-crm-backend.up.railway.app/api`) |

### Step 6 — First Login (Setup)

1. Visit your frontend URL → click **"Set up your account"** or go to `/setup`
2. Create your admin account (name, email, password)
3. This route locks itself after the first account is created
4. Log in and start adding leads!

### Step 7 — Add Team Members

1. Log in as admin → go to **Team** in the sidebar
2. Click **"Add Member"** → enter their name, email, password
3. They can now log in at your frontend URL with those credentials
4. Set role to **Admin** to give full access, or **Member** for standard access

---

## Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL running locally

### Setup

```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install
```

Create `backend/.env`:
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/rei_crm
JWT_SECRET=your-dev-secret-here
PORT=3001
NODE_ENV=development
```

Create `frontend/.env`:
```
REACT_APP_API_URL=http://localhost:3001/api
```

### Run

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm start
```

Visit `http://localhost:3000` → go to `/setup` to create your first account.

---

## Lead Statuses

| Status | Description |
|--------|-------------|
| New Lead | Fresh lead, not yet contacted |
| Contacted | Reached out, awaiting response |
| Warm | Expressed interest |
| Hot | Motivated seller, actively negotiating |
| Negotiating | In offer/counter-offer stage |
| Under Contract | Signed, in due diligence |
| Closed | Deal done ✅ |
| Dead | No longer interested |

---

## Lead Sources

- Direct Mail
- Cold Call
- Cold Text
- LaunchControl
- Driving for Dollars
- Referral
- Website
- MLS
- Wholesaler
- Other

---

## Project Structure

```
rei-crm/
├── backend/
│   ├── railway.toml
│   ├── package.json
│   └── src/
│       ├── index.js              # Express server entry
│       ├── db/index.js           # PostgreSQL connection + schema init
│       ├── middleware/auth.js    # JWT middleware
│       └── routes/
│           ├── auth.js           # Login, setup, user CRUD
│           ├── leads.js          # Leads + notes + tasks + activity
│           └── tasks.js          # Global tasks view
└── frontend/
    ├── railway.toml
    ├── package.json
    └── src/
        ├── App.js
        ├── index.css
        ├── context/AuthContext.js
        ├── lib/api.js
        ├── components/
        │   ├── Layout.js
        │   └── LeadModal.js
        └── pages/
            ├── Login.js
            ├── Setup.js
            ├── Dashboard.js
            ├── Leads.js
            ├── LeadDetail.js
            ├── Tasks.js
            └── Team.js
```
