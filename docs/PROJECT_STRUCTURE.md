# Project Structure

This repo is organized around deployable surfaces first, then shared project support.

## Top level

```text
backend/                 FastAPI app, database models, services, migrations, tests
frontend/                Next.js app, UI components, client/server API helpers
docs/                    Product, setup, architecture, and generated curriculum docs
scripts/                 Local developer and deployment helper scripts
docker-compose.yml       Local Postgres, backend, and frontend orchestration
cloudbuild-*.yaml        Google Cloud Build pipelines
DEPLOYMENT.md            Deployment runbook
README.md                Product overview and quick start
```

Generated local artifacts should stay out of source control. Common examples are `.next/`,
`node_modules/`, `.pytest_cache/`, `.playwright-cli/`, `output/`, and `*.tsbuildinfo`.

## Backend

```text
backend/
  app/
    api/routes/          HTTP route modules grouped by domain
    domains/             Canonical domain services (syllabus, proposals)
    models/              SQLAlchemy ORM models
    schemas/             Pydantic request and response schemas
    services/            Business logic, integrations, scheduling, AI, and stats
    services/roadmap/    Roadmap generation internals
    config.py            Environment-backed settings
    database.py          SQLAlchemy engine and session setup
    main.py              FastAPI app assembly
  alembic/               Database migrations
  tests/                 Pytest coverage
  requirements.txt       Python dependencies
```

Use this rule of thumb:

- Add HTTP behavior in `app/api/routes/`.
- Add database shape in `app/models/` and the matching migration in `alembic/versions/`.
- Add API contracts in `app/schemas/`.
- Add cross-route or domain logic in `app/services/`.
- Keep route modules thin; they should validate, authorize, call services, and shape responses.

## Frontend

```text
frontend/
  app/                   Next.js App Router pages and route handlers
    library/             Library list, syllabus detail, new syllabus
    progress/            Progress (formerly /stats)
  components/            Reusable React components
    ui/                  App shell, navigation, command surfaces, repeated UI rows
    learning/            Learning-domain visualizations and widgets
  features/              Feature folders (syllabus: Studio, proposals, hooks)
  styles/                Design system layers (tokens, layout, primitives, features)
  lib/                   Shared frontend utilities and API clients
    api/                 Typed backend client, endpoint helpers, and API types
    query/               TanStack Query client and cache keys
  tests/                 Vitest component tests
  e2e/                   Playwright smoke tests
  public/                Static assets served by Next.js
  middleware.ts          Auth/session middleware
  package.json           Frontend scripts and dependencies
```

Use this rule of thumb:

- Put route-specific page code under `app/<route>/`.
- Put reusable visual pieces under `components/`.
- Put app shell/navigation primitives under `components/ui/`.
- Put domain visualizations under a domain folder such as `components/learning/`.
- Put shared data access, parsing, formatting, and browser/server helpers under `lib/`.
- Keep API URL construction and typed request helpers inside `lib/api/`.

## Docs

```text
docs/
  CURRICULUM.md          Generated curriculum reference
  curriculum.json        Curriculum source data
  generate_curriculum.py Curriculum doc generator
  GOOGLE_AUTH_SETUP.md   Google OAuth setup notes
  PROJECT_STRUCTURE.md   Repo organization guide
  superpowers/specs/     Product and design specs
```

Documentation that explains how to operate the project belongs at the top of `docs/`.
Design/product source material belongs in `docs/superpowers/specs/`.
