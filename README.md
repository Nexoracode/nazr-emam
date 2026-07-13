# Nazr Emam

Monorepo for the Nazr Emam project.

- `apps/api`: NestJS API
- `apps/web`: Next.js frontend
- `apps/cms`: CMS workspace placeholder
- `packages/shared`: Shared TypeScript API contract types
- Docker runs both apps in one container.

## Development

```bash
cp .env.example .env
npm install
npm run dev
```

Frontend: `http://localhost:3000`

API: `http://localhost:3001`

## Docker

```bash
cp .env.example .env
docker compose up --build
```

## Monorepo runner

This project uses Turbo to run workspace tasks:

```bash
npm run dev
npm run build
npm run lint
```

## Workflow

See `docs/workflow.md`.

## Project Rules

Read `CLAUDE.md` before making code changes. It defines the shared rules for API contracts, shared types, RTL UI, Docker, and the daily development flow.
