# Daily News Insights 📰

Daily News Insights is a fully autonomous, self-updating news platform that runs on an event-driven pipeline without manual intervention. The platform monitors major tech, business, and political sources, retrieves the latest articles, scrapes full contents using a fast native scraping engine (with Firecrawl fallback), synthesizes summaries and sentiment using Gemini 1.5 Flash, generates semantic vector embeddings, and caches the results using Upstash Redis. Users can interact with the articles database through a Retrieval-Augmented Generation (RAG) conversational agent.

---

## 🏛 Architecture & Tech Stack

The project is structured as a Monorepo containing:

- **`/backend`**: Node.js, Express, TypeScript, Prisma ORM (Supabase PostgreSQL with `pgvector`), Upstash Redis (`ioredis`), Google News RSS, and Google Gen AI (Gemini 1.5 Flash / `gemini-embedding-001`).
  - **Main API Server (`src/index.ts`)**: Handles core routes, location proxying, user authentication, and admin tasks.
  - **RAG Server (`src/ragServer.ts`)**: A dedicated microservice dedicated to similarity searches, chat sessions, and document chunk indexing.
- **`/frontend`**: Next.js (App Router, React, TypeScript), Tailwind CSS (v4), and Lucide React. Features a clean, responsive newspaper layout, real-time tickers, sentiment tags, and an interactive RAG chat interface.

---

## 🔄 Core Ingestion Pipeline Workflow

The ingestion pipeline is designed to keep the platform up-to-date autonomously. It can be triggered via a Google Cloud Run Job (configured to run every 15 minutes) or manually from the dashboard.

```mermaid
flowchart TD
    Start[Ingestion Triggered] --> Feeds[Fetch Google News RSS Feeds]
    Feeds --> GeminiTrend[Gemini 1.5 Flash: Extract Top 5 Trending Topics]
    GeminiTrend --> Dedup[Prisma Deduplication Check vs Last 24 Hours]
    Dedup -->|Existing topic| Skip[Skip Topic]
    Dedup -->|New topic| Search[Search Google News for Topic URLs]
    Search --> Crawl[Scrape Content: Native Fetch with Firecrawl Fallback]
    Crawl --> GeminiSynth[Gemini 1.5 Flash: Synthesize News Dossier]
    GeminiSynth --> DBStore[Store Structured Article in Supabase]
    DBStore --> RAGIndex[Chunk Dossier & Generate Embeddings]
    RAGIndex --> pgvector[Index Chunks in PostgreSQL using pgvector]
    DBStore --> BG_Image[Background Image Enrichment]
    BG_Image --> Wikimedia[Query Wikimedia / Unsplash for Media]
    Wikimedia --> ValidateImage[Normalize & Validate Subject Match]
    ValidateImage --> UpdateDB[Update Article with Image URLs]
    DBStore --> Cache[Invalidate Upstash Redis Cache]
    Cache --> Done[Pipeline Completed]
```

### Detailed Pipeline Stages

1. **RSS Feed Aggregation**: The pipeline fetches active Google News RSS feeds for ten target categories: `Tech`, `Business`, `Science`, `Health`, `Entertainment`, `Sports`, `World`, `India`, `Finance`, and `Politics`.
2. **AI Trend Extraction**: Headlines from the feeds are passed to Gemini 1.5 Flash. It acts as an editorial discovery engine, extracting the top 5 distinct, highly descriptive, event-driven queries representing the actual news stories.
3. **Deduplication Check**: The system extracts a unique semantic keyword for each story and queries PostgreSQL to ensure this topic has not been covered in the last 24 hours.
4. **Content Scraping**: For each approved keyword, the system fetches search result links from Google News and scrapes the clean, main-text Markdown using a fast native fetch scraper (falling back to Firecrawl if the native scraper is blocked or fails).
5. **Editorial Synthesis**: Gemini 1.5 Flash synthesizes the raw scraped articles into a single, high-quality, professional editorial dossier featuring:
   - A highly engaging headline matching the overall tone.
   - Exactly 5 key bullet points (minimum 20 words each).
   - Exactly 8 complete paragraphs (minimum 80 words each).
   - Exactly 4 sub-headings injected at structured intervals.
   - Exactly 4 standalone pull-quote facts or statistics.
   - Metadata classification (sentiment, primary & secondary categories).
   - Optimised search terms for copyright-free images and AI prompts.
6. **RAG Vector Ingestion**: The synthesized dossier is split into component chunks (headlines, summaries, and paragraphs). The system generates 768-dimensional vector embeddings using `gemini-embedding-001` and indexes them into the `ArticleChunk` database table using the PostgreSQL `pgvector` extension.
7. **Background Image Enrichment**: To prevent latency during ingestion, image searching runs asynchronously. It queries Wikimedia Commons and Unsplash using the synthesized image search queries, normalizes the filenames, filters out distracting objects (e.g. stamps, coins, generic flags), validates the core subject, and updates the database once a high-quality, copyright-free match is found.
8. **Cache Invalidation**: The system flushes Upstash Redis cache prefixes to instantly propagate the newly ingested news stories to users.

---

## 🔍 Semantic Search Feature

The platform provides a smart search experience on the homepage. Instead of standard keyword matching, it leverages vector embeddings to find semantically related articles.

```mermaid
flowchart TD
    A[User Enters Search Query] --> B{Is Search Query Empty?}
    B -->|Yes| C[Check Redis Cache]
    C -->|Cache Hit| D[Return Cached Articles]
    C -->|Cache Miss| E[Query DB: Get Latest Articles]
    E --> F[Cache Result in Redis]
    F --> G[Display Articles on Homepage]
    
    B -->|No| H[Bypass Redis Cache Check]
    H --> I[Generate Query Embedding via Gemini]
    I --> J[Query pgvector for Matching Chunks]
    J --> K[Map Chunk IDs to Parent Articles]
    K --> L[Retrieve Article Details from PostgreSQL]
    L --> M[Sort Articles by Similarity Score]
    M --> G
```

---

## 💬 The RAG Chat Engine

The dedicated RAG Service (`/backend/src/ragServer.ts`) runs on port `8080` (or dynamic port mapping) and powers a closed-domain chat agent where users can ask questions about the news database.

- **Embeddings**: Uses Google's `gemini-embedding-001` to embed both user queries and article chunks.
- **Offline Fallback**: If Gemini API quotas are exhausted, the server falls back to an offline local hashing mechanism to ensure continuous search capabilities.
- **Retrieval**: Searches the `ArticleChunk` table using cosine distance (`<=>` operator in Prisma/pgvector) with a similarity threshold of `0.55` to retrieve the most relevant context blocks.
- **Synthesis**: Feeds the context blocks into Gemini 1.5 Flash alongside the chat history, instructing the model to remain grounded strictly in the retrieved news articles, citing sources, headlines, and publication timestamps.

### RAG Chat & Inline Live Ingestion Flowchart

When a user asks a question about an event or entity not yet present in the database, the RAG engine performs a real-time inline ingestion from Google News to synthesize the context on-the-fly.

```mermaid
flowchart TD
    A[User Submits Query in Chat] --> B[Perform Vector Retrieval on PostgreSQL]
    B --> C[Gemini RAG Builder Evaluates Context Relevance]
    C --> D{Does Query Lack DB Coverage?}
    
    D -->|"Yes (Context gap detected)"| E[Trigger Live Google News Ingestion for Topic]
    E --> F[Crawl & Scrape Articles: Native with Firecrawl Fallback]
    F --> G[Synthesize News Dossier via Gemini 1.5 Flash]
    G --> H[Store in DB & Generate Embeddings]
    H --> I[Re-query Vector DB for Updated Context]
    I --> J[Gemini Synthesizes Grounded Answer with Citations]
    
    D -->|"No (Sufficient context exists)"| J
    J --> K[Return Response & Follow-up Suggestions to User]
```

---

## 📁 Directory Structure

```
india-report/
├── backend/
│   ├── src/
│   │   ├── config/           # Database & Redis client initializations
│   │   ├── controllers/      # Ingestion pipeline, news API, and RAG controllers
│   │   ├── cron/             # CLI Ingestion runner & Node-cron scheduler
│   │   ├── middleware/       # Route protection & admin verification middlewares
│   │   ├── routes/           # Routing definitions for main API and RAG API
│   │   ├── services/         # Third-party integrations (Firecrawl, LLM, Image Search, RAG)
│   │   ├── utils/            # Geolocation helpers, caching & SEO helpers
│   │   ├── index.ts          # Main Express API entrypoint (Port 5000)
│   │   └── ragServer.ts      # RAG Chat & Search service entrypoint (Port 8080)
│   ├── prisma/
│   │   └── schema.prisma     # Database schema (Articles, Chunks, Views, Users)
│   ├── Dockerfile            # Main API server image configuration
│   ├── Dockerfile.rag        # RAG microservice image configuration
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js App Router pages (Home, Chat, Category, Admin)
│   │   ├── components/       # Custom elements (News Ticker, Chat Interface, Modals)
│   │   ├── context/          # Theme and User Auth state providers
│   │   ├── hooks/            # useNews state-management and client filtering hook
│   │   └── lib/              # Client-side API wrappers & SEO utilities
│   ├── Dockerfile            # Standalone Next.js production build configuration
│   └── package.json
│
├── deploy/
│   └── cloud-run.sh          # Orchestrated deployment shell script
```

---

## ⚙️ Setup & Configuration

### 1. Database Setup (Supabase & pgvector)
1. Create a PostgreSQL Database on [Supabase](https://supabase.com/).
2. Enable the `vector` extension in your database (via the Supabase SQL editor: `CREATE EXTENSION IF NOT EXISTS vector;`).
3. Copy the database connection URI.

### 2. Environment Variables

Create and populate the environment files.

#### Backend (`/backend/.env`):
```env
PORT=5000
RAG_PORT=8080
DATABASE_URL="postgresql://postgres:password@db.supabase.co:5432/postgres"
REDIS_URL="rediss://default:password@upstash.io:6379"
FIRECRAWL_API_KEY="your_firecrawl_api_key" # Optional fallback scraper
GEMINI_API_KEY="your_gemini_api_key" # Support comma-separated keys for automatic rotation
UNSPLASH_ACCESS_KEY="your_unsplash_access_key" # Used for image search enrichment
```

#### Frontend (`/frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL="http://localhost:5000"
NEXT_PUBLIC_RAG_API_URL="http://localhost:8080"
NEXT_PUBLIC_GOOGLE_CLIENT_ID="your_google_client_id"
NEXT_PUBLIC_ADSENSE_CLIENT_ID="your_adsense_client_id"
NEXT_PUBLIC_ADSENSE_DEFAULT_SLOT=""
```

> [!NOTE]
> **Demo Mode**: If API keys are missing or set to defaults, both backend and frontend automatically activate **Demo Mode**, yielding realistic mock datasets so you can test all UI layouts and API flows instantly.

---

## 🚀 Running the Project Locally

### 1. Launch Main Backend API
Navigate to the `backend` directory, install dependencies, prepare the Prisma client, and start the development server:
```bash
cd backend
npm install
npm run prisma:generate
# If running migrations for the first time:
# npx prisma db push
npm run dev
```
The server starts on [http://localhost:5000](http://localhost:5000).

### 2. Launch RAG Chat Microservice
In a new terminal window inside the `backend` directory:
```bash
npm run dev:rag
```
The RAG microservice starts on [http://localhost:8080](http://localhost:8080).

### 3. Launch Frontend App
Navigate to the `frontend` directory, install dependencies, and run Next.js:
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the dashboard and interact with the platform.

---

## ☁️ Deploying to Google Cloud Run

The project is designed to run in production on Google Cloud Run. The deployment script builds and launches three containerized microservices and a cron job.

### Automated Deployment Script
To build and deploy the entire platform automatically:
1. Setup your target project:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
   ```
2. Create `backend.env.yaml` to specify the production secrets.
3. Run the orchestrator:
   ```bash
   chmod +x deploy/cloud-run.sh
   PROJECT_ID=YOUR_PROJECT_ID REGION=asia-south1 BACKEND_ENV_FILE=backend.env.yaml ./deploy/cloud-run.sh
   ```

This script automates:
1. **Express API Server**: Deployed to Cloud Run to handle web services.
2. **RAG Microservice**: Built using `Dockerfile.rag` and `cloudbuild.rag.yaml` and deployed as a server.
3. **Ingestion Job**: Deployed as a Cloud Run Job (`india-report-ingestion-job`) running the command `node dist/cron/runIngestion.js` with a 45-minute timeout. Can be triggered on a schedule (e.g. using Cloud Scheduler).
4. **Next.js Frontend**: Deployed to Cloud Run pointing to the backend and RAG Cloud Run URLs.

---

## 🧪 Testing the Ingestion Pipeline Manually
You do not need to wait for the cron schedule or Cloud Run Job.
1. Log in to the Frontend Admin Panel (using credentials created via the `backend/src/create_admin.js` script).
2. Click the **"Trigger Ingestion"** button in the header dashboard.
3. The frontend triggers a POST request to `/api/news/ingest` which runs the workflow synchronously, updates the Supabase database, indexes vector embeddings, updates images, clears Redis caches, and updates the client newsfeed in real time.
