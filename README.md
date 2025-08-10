This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.tsx`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/api-routes/introduction) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.ts`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/api-routes/introduction) instead of React pages.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Redis Integration Overview

- __Docs__: See `docs/redis-report.md` for architecture, data models, routes, and evaluation.
- __Modules used__: RedisJSON, RediSearch (full-text + vector/HNSW), Streams, Pub/Sub.
- __Primary keys__: `company:<id>` (JSON), `kb:<companyId>:...` (HASH+vector), `call:<id>` (JSON), `ticket:<id>` (JSON), `show:<slug>` (JSON).
- __Real-time__: Pub/Sub channels `ch:call:<id>` and `ch:call:ingest:<companyId>` bridged to SSE via `pages/api/rt/subscribe.ts`. History in Streams `stream:call:<id>` and `stream:call:ingest:<companyId>`.
- __Search__: `idx:shows` (JSON full-text + sort), `idx:kb` (HASH + HNSW vector). Text queries are sanitized by `sanitizeSearchQuery()`.
- __Admin__: `pages/admin/index.tsx` is intentionally unauthenticated. Configure active company, ingest knowledge, and reset.

### Quick Start (Redis)

1) Set `REDIS_URL` in `.env` (Redis Cloud recommended).

2) Run dev server:

    ```bash
    pnpm dev
    ```

3) Seed shows and search index:

    ```bash
    curl -X POST http://localhost:3000/api/redis/seed
    ```

4) Open Admin (no auth by design):

    - http://localhost:3000/admin — configure company, ingest KB, view progress (SSE)

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
