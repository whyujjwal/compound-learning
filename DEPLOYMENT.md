# Deployment & Architecture Guide

This project is deployed using a modern, serverless, keyless architecture on Google Cloud Platform (GCP). Automatic deployments are driven by GitHub Actions on every push to the `main` branch.

---

## 🏗️ Architecture Overview

```
                      ┌──────────────────────────┐
                      │    Developer Machine     │
                      └────────────┬─────────────┘
                                   │ git push
                                   ▼
                      ┌──────────────────────────┐
                      │    GitHub Repository     │
                      └────────────┬─────────────┘
                                   │ OIDC Auth / Run Workflow
                                   ▼
                      ┌──────────────────────────┐
                      │  GitHub Actions Runner   │
                      └──────┬────────────┬──────┘
       Build Backend         │            │ Build Frontend
       (cloudbuild-          │            │ (cloudbuild-
       backend.yaml)         ▼            ▼ frontend.yaml)
                      ┌──────────────────────────┐
                      │    Google Cloud Build    │
                      └──────┬────────────┬──────┘
        Push Backend         │            │ Push Frontend
        Docker Image         ▼            ▼ Docker Image
                      ┌──────────────────────────┐
                      │ GCP Artifact Registry    │
                      │ (asia-south1 / compound) │
                      └──────┬────────────┬──────┘
        Deploy Backend       │            │ Deploy Frontend
        (compound-api)       ▼            ▼ (compound-web)
                      ┌──────────────────────────┐
                      │      GCP Cloud Run       │
                      └──────┬────────────┬──────┘
                             │            │
             Connects via    │            │ Renders Next.js app
             Unix Socket     ▼            ▼ for Users
                      ┌──────────────┐    ┌──────────────┐
                      │  Cloud SQL   │    │ Public Users │
                      │ (PostgreSQL) │    └──────────────┘
                      └──────────────┘
```

---

## ☁️ Google Cloud Infrastructure

All resources are deployed in the **`asia-south1` (Mumbai)** region inside the isolated GCP project **`compound-learning-389172`**:

1. **Database Layer (`compound-db`)**:
   - **Engine**: PostgreSQL 16
   - **Tier**: `db-f1-micro` (Enterprise Edition, shared core to minimize cost).
   - **Database**: `compound`
   - **User**: `compound`
2. **Container Registry**:
   - **Repository**: Artifact Registry Docker repository named `compound`.
3. **Backend Service (`compound-api`)**:
   - Hosted on **Cloud Run** listening on port `8000`.
   - Connects to the database using the built-in Cloud SQL Auth Proxy Unix Socket at `/cloudsql/compound-learning-389172:asia-south1:compound-db`.
   - **Public Access**: Bypasses organizational policies that restrict the `allUsers` role using the `invoker-iam-disabled: 'true'` annotation.
4. **Frontend Service (`compound-web`)**:
   - Hosted on **Cloud Run** listening on port `3000`.
   - Static client-side bundle is compiled with the live backend URL pre-baked into the environment.
   - **Public Access**: Bypasses IAM validation using `invoker-iam-disabled: 'true'`.

---

## 🔑 Keyless Authentication (Workload Identity Federation)

To maintain absolute security and prevent long-lived credentials (like Service Account JSON keys) from being stored on GitHub, this deployment uses **Google Cloud Workload Identity Federation (WIF)**:

* **OIDC Trust**: Google Cloud trusts token assertions signed by GitHub's OIDC issuer (`https://token.actions.githubusercontent.com`).
* **Pool & Provider**:
  - Pool: `compound-pool`
  - Provider: `compound-provider`
* **Attribute Mapping & Condition**:
  - Translates GitHub's JWT claims (`assertion.sub`, `assertion.actor`, `assertion.repository`) into GCP attributes.
  - **Condition**: Restricts access exclusively to requests coming from the private repository `whyujjwal/compound-learning` (`assertion.repository == 'whyujjwal/compound-learning'`).
* **Service Account**: The `github-deployer` service account is bound to WIF. The GitHub Actions runner dynamically exchanges its short-lived GitHub JWT for a short-lived GCP access token during the run.

---

## 🚀 CI/CD Pipeline (`.github/workflows/deploy.yml`)

The deployment process executes automatically on every push to the `main` branch:

1. **Authentication**: Connects securely to GCP using WIF (no keys required).
2. **Build Backend**: Invokes GCP Cloud Build using the generic `cloudbuild-backend.yaml` configuration to compile the FastAPI image and push it to Artifact Registry.
3. **Deploy Backend**: Deploys the new image to Cloud Run. On its initial boot, the FastAPI lifespan event automatically:
   - Synchronizes SQLAlchemy database models.
   - Seeds the database with standard subject tracks (`dsa`, `system-design`, `ai-math`).
4. **Build Frontend**: Retrieves the newly deployed backend service URL and submits a GCP Cloud Build job using `cloudbuild-frontend.yaml`. The backend URL is passed as a build argument `NEXT_PUBLIC_API_URL` so Next.js can bake it into the client-side network client.
5. **Deploy Frontend**: Deploys the Next.js container to Cloud Run.

---

## ⚙️ Environment Variables Configured on Cloud Run

### Backend (`compound-api`)
- `DATABASE_URL`: `postgresql+psycopg2://compound:<password>@/compound?host=/cloudsql/compound-learning-389172:asia-south1:compound-db`
- `CORS_ORIGINS`: `*` (Allows all origins to facilitate Next.js client-side fetch requests)
- `AI_PROVIDER`: `gemini`
- `AI_MODEL`: `gemini-2.5-flash`
- `GEMINI_API_KEY`: *(Your secure API key)*
- `LOG_LEVEL`: `INFO`

### Frontend (`compound-web`)
- `NEXT_PUBLIC_API_URL`: `https://compound-api-778177955406.asia-south1.run.app/api` (Pre-baked at build time)
