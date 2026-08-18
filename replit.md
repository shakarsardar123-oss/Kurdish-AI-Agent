# HAMAUMIN

Kurdish-first personal AI assistant and modular agent workspace with persistent user-owned data.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/hamaumin run dev` — run the HAMAUMIN web app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-server test` — run API contract and agent transition tests
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, Clerk variables, and `OPENAI_API_KEY`; see `.env.example`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Web: React + TypeScript + Vite + Tailwind v4
- API: Express 5 + Clerk middleware
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/hamaumin` — mobile-first Kurdish UI, routes, Clerk screens, and theme controls
- `artifacts/api-server` — authenticated API routes, OpenAI chat, agent transitions, and modular tools
- `lib/api-spec/openapi.yaml` — API source of truth
- `lib/db/src/schema/hamaumin.ts` — PostgreSQL/Drizzle source of truth
- `README.md` and `.env.example` — setup and provider configuration

## Architecture decisions

- Clerk is the managed authentication provider; browser requests rely on same-origin session cookies.
- Development requests without a Clerk session use an explicit `demo-user`; production API routes require a real Clerk session.
- OpenAPI is maintained before generated clients and Zod schemas so the frontend and backend share one contract.
- OpenAI is called only from the API server, keeping the API key out of browser bundles.

## Product

- Sorani-first AI chat with persistent conversations and memory.
- Agent tasks with visible steps, progress, retry, cancel, and error states.
- Projects, modular tool registry, settings, custom themes, and responsive dark futuristic UI.

## User preferences

- Keep the product mobile-first, editable, scalable, and source-code based; do not create an APK.
- Keep assistant responses in Kurdish Sorani and never claim an operation succeeded unless it was verified.

## Gotchas

- Run API spec codegen after changing `lib/api-spec/openapi.yaml`.
- Run the API server and web workflow together; the frontend uses `/api` same-origin calls.
- Keep Clerk proxy middleware before Express body parsing so production authentication continues to work.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
