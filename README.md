# India Reports 🇮🇳

India Reports is a fully autonomous, self-updating news platform that runs on an event-driven pipeline without manual intervention. The platform monitors major tech and business sources, retrieves latest articles, scrapes full contents using Firecrawl, synthesizes summaries and sentiment using Gemini 1.5 Flash, and caches the results using Upstash Redis.

---

## 🏛 High-Level Architecture & Tech Stack

The project is structured as a Monorepo:

- **`/backend`**: Node.js, Express, TypeScript, Node-Cron, Prisma ORM (Supabase PostgreSQL), Upstash Redis (`ioredis`), Currents API, and Google Gen AI (Gemini 1.5 Flash).
- **`/frontend`**: Next.js (App Router, React, TypeScript), Tailwind CSS (v4), and Lucide React.

### Core Pipeline Workflow (Runs every 15 minutes)

```mermaid
graph TD
    A[Cron Job Triggered] --> B[Currents API Ingestion Check]
    B --> C[Fetch 20 Latest Articles]
    C --> D{Prisma Deduplication Check}
    D -- New URL --> E[Scrape clean Markdown via Firecrawl]
    D -- Duplicate URL --> F[Skip Article]
    E --> G[Gemini 1.5 Flash AI Synthesis]
    G --> H[Store structured data in Supabase]
    H --> I[Invalidate Upstash Redis Cache]
    I --> J[Done]
```

---

## 📁 Directory Structure

```
india-report/
├── backend/
│   ├── src/
│   │   ├── config/           # Database & Redis client initializations
│   │   ├── controllers/      # Route logic & ingestion pipeline triggering
│   │   ├── cron/             # Node-cron scheduler (15-min orchestration)
│   │   ├── models/           # Prisma client schemas
│   │   ├── routes/           # API endpoints (GET /api/news, POST /api/news/ingest)
│   │   └── services/         # Integrations (Firecrawl, LLM, Currents News API)
│   ├── prisma/
│   │   └── schema.prisma     # Prisma DB configuration
│   ├── .env                  # Backend configuration secrets
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js page routers, layout, and global CSS
│   │   ├── components/       # Custom components (NewsTicker, ArticleCard, SentimentFilter)
│   │   ├── hooks/            # useNews state-management and client filtering hook
│   │   └── lib/              # API fetch wrapper
│   ├── .env.local            # Frontend environment variables
│   └── package.json
└── README.md
```

---

## ⚙️ Setup & Configuration

### 1. Database Setup (Supabase)
1. Create a PostgreSQL Database on [Supabase](https://supabase.com/).
2. Copy the Connection String.

### 2. Environment Variables

Create and populate the environment files.

#### Backend (`/backend/.env`):
```env
PORT=5000
DATABASE_URL="postgresql://postgres:password@db.supabase.co:5432/postgres"
REDIS_URL="rediss://default:password@upstash.io:6379"
NEWS_API_KEY="your_currents_api_key"
FIRECRAWL_API_KEY="your_firecrawl_api_key"
GEMINI_API_KEY="your_gemini_api_key"
```

#### Frontend (`/frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL="http://localhost:5000"
```

*Note: If API Keys are not set or left as default, both backend and frontend automatically activate **Demo Mode**, yielding realistic mock datasets so you can test the UI and API flows instantly.*

---

## 🚀 Running the Project

### Start Backend
In a terminal, navigate to the `backend` directory and run:
```bash
cd backend
npm install
npm run prisma:generate
# To run migrations: npx prisma db push (once DATABASE_URL is configured)
npm run dev
```

The server will spin up on [http://localhost:5000](http://localhost:5000) and initialize the 15-minute cron scheduler.

### Start Frontend
In a separate terminal, navigate to the `frontend` directory and run:
```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the India Reports dashboard.

---

## ☁️ Deploying to Google Cloud Run

This project deploys as two Cloud Run services:

- **Backend**: Express API from `/backend`
- **Frontend**: Next.js standalone server from `/frontend`

### 1. Prerequisites

Install and authenticate the Google Cloud CLI, then enable the required APIs:

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

### 2. Configure backend environment variables

Create a local env file for the backend deployment. Do not commit this file.

```yaml
# backend.env.yaml
DATABASE_URL: "postgresql://postgres:password@db.supabase.co:5432/postgres"
REDIS_URL: "rediss://default:password@upstash.io:6379"
GEMINI_API_KEY: "your_gemini_api_key"
FIRECRAWL_API_KEY: "your_firecrawl_api_key"
NEWS_API_KEY: "your_news_api_key"
```

For production, prefer Secret Manager instead of inline secret values.

### 3. Deploy both services

```bash
chmod +x deploy/cloud-run.sh
PROJECT_ID=YOUR_PROJECT_ID REGION=asia-south1 BACKEND_ENV_FILE=backend.env.yaml ./deploy/cloud-run.sh
```

The script deploys the backend first, reads its Cloud Run URL, then deploys the frontend with `BACKEND_URL` set. The frontend exposes a runtime `/api/*` proxy route that forwards browser requests to the backend.

### 4. Optional frontend variables

If you use Google OAuth in the login modal, set the frontend public client id:

```bash
gcloud run services update india-report-frontend \
  --region asia-south1 \
  --set-env-vars NEXT_PUBLIC_GOOGLE_CLIENT_ID="your_google_client_id"
```

---

## 🧪 Testing the Pipeline Manually
You don't need to wait 15 minutes for the cron job to run. The frontend includes a **"Trigger Pipeline"** button in the header.
Clicking it will send a POST request to `/api/news/ingest` which triggers the ingestion workflow immediately, updates the database, invalidates the cache, and refreshes your newsfeed in real time.
