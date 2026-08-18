# HAMAUMIN

HAMAUMIN is a Kurdish-first personal AI assistant and modular agent workspace. It understands Kurdish Sorani, English, and Arabic, while keeping its assistant responses in Kurdish Sorani. The web app is mobile-first and provides chat, persistent memory, tasks, projects, modular tools, custom themes, and settings.

## Run locally

This repository is a pnpm workspace. Replit workflows already provide the correct ports and environment values.

```bash
pnpm install
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/hamaumin run dev
```

Useful checks:

```bash
pnpm run typecheck
pnpm --filter @workspace/api-server test
pnpm --filter @workspace/hamaumin run build
pnpm run build
```

The database schema can be pushed to the development PostgreSQL database with:

```bash
pnpm --filter @workspace/db run push
```

## Configuration

Copy `.env.example` when running outside Replit. `DATABASE_URL` and the Clerk variables are normally provisioned by Replit.

- `OPENAI_API_KEY` enables server-side AI replies. `OPENAI_MODEL` defaults to `gpt-4o-mini`.
- `BRAVE_SEARCH_API_KEY` enables the live web-search tool. Without it, the API returns a clear configuration error instead of pretending that a search succeeded.
- `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, and `VITE_CLERK_PUBLISHABLE_KEY` provide managed authentication. Browser API calls use Clerk session cookies; no bearer token is stored in the frontend.

## Architecture

- `artifacts/hamaumin` — React, TypeScript, Vite, Tailwind v4, Clerk, Wouter, and generated React Query hooks.
- `artifacts/api-server` — Express 5 API, Clerk middleware, OpenAI integration, modular tools, and route-level validation.
- `lib/api-spec/openapi.yaml` — source of truth for the API contract.
- `lib/api-client-react` — generated typed client and React Query hooks.
- `lib/api-zod` — generated server-side Zod request/response schemas.
- `lib/db/src/schema/hamaumin.ts` — Drizzle/PostgreSQL tables for user-owned conversations, messages, tasks, projects, memories, themes, and settings.

Every API route scopes records by the authenticated Clerk user. Development requests without a Clerk session use the explicit `demo-user` identity so the preview remains usable; production requests require authentication.

## Product capabilities

- Kurdish Sorani chat with OpenAI-backed responses and memory context.
- Conversations and message history persisted in PostgreSQL.
- Agent tasks with planning steps, progress, retry, cancellation, and error history.
- Projects with build status, files, progress, and error reporting.
- Modular tools for web search, page fetching, image analysis foundations, file operations, coding, reminders, location, and smart-home foundations.
- User memories with enable/disable and delete controls.
- Theme creation, token editing, applying, and deletion.
- Clerk-branded sign-in and sign-up flows with a Kurdish-first dark visual system.

## Adding providers and tools

1. Add or update the endpoint contract in `lib/api-spec/openapi.yaml`.
2. Regenerate the typed clients and Zod schemas with the API-spec codegen command.
3. Add the provider/tool implementation under `artifacts/api-server/src/lib`.
4. Register its metadata in the tool registry and expose a route only when the operation has a real implementation.
5. Add a focused test for success, missing configuration, and upstream failure.

Never return a successful-looking response when an upstream provider is missing, rejects the request, or returns unusable data.