# TradePilot — Backend

Node.js + Express + TypeScript + Prisma + PostgreSQL API for the TradePilot trading journal.

Implements the architecture from the Technical Architecture Blueprint (v4):
Route → Controller → Service → Prisma ORM → PostgreSQL, with JWT authentication
and Zod request validation.

## Stack

- Node.js + Express + TypeScript
- PostgreSQL + Prisma ORM **v7** (driver-adapter model — see note below)
- JWT (jsonwebtoken) + bcrypt
- Zod for request validation

> **Prisma 7 note:** Prisma 7 changed how the CLI and client are configured —
> the database URL now lives in `prisma.config.ts` (not in `schema.prisma`),
> and `PrismaClient` must be constructed with a driver adapter
> (`@prisma/adapter-pg` + `pg`) instead of a built-in connection engine.
> This project is already set up for that; you don't need to do anything
> extra beyond the steps below.

## Folder structure

```
src/
├── config/        # env loader, Prisma client singleton (adapter-based)
├── controllers/    # parse req, call service, shape res
├── middleware/     # authMiddleware, validate, errorHandler, rateLimiter
├── routes/         # URL -> controller wiring
├── services/       # business logic (auth, trades, metrics, analytics)
├── schemas/        # Zod validation schemas
├── utils/          # AppError, RR calculation
├── types/          # shared DTOs + Express Request augmentation
├── app.ts          # Express app (middleware + routes)
└── server.ts       # process entry point
prisma/
└── schema.prisma   # User + Trade models (no connection URL — see prisma.config.ts)
prisma.config.ts    # Prisma CLI config: schema location + DATABASE_URL
```

Prisma Client itself is generated into `node_modules/@prisma/client` (the
classic default location — this project doesn't use a custom `output` path),
so it's imported as `from "@prisma/client"` throughout, same as pre-v7.

## Setup

1. **Configure environment variables first**
   ```bash
   cp .env.example .env
   ```
   Generate a `JWT_SECRET`:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
   For `DATABASE_URL`, a placeholder in valid Postgres URL format is fine for
   now (e.g. the one already in `.env.example`) — `prisma generate` only
   needs the string to be well-formed, not an actual reachable database yet.

2. **Install dependencies**
   ```bash
   npm install
   ```
   This runs `prisma generate` automatically via the `postinstall` script,
   creating the typed Prisma Client in `node_modules/@prisma/client`. If it
   ever fails (e.g. `DATABASE_URL` missing), fix `.env` and re-run with
   `npm run prisma:generate`.

3. **Get a real database**

   Create a free PostgreSQL instance on [Railway](https://railway.app),
   [Supabase](https://supabase.com), or [Neon](https://neon.tech), and replace
   the placeholder `DATABASE_URL` in `.env` with its real connection string.

4. **Run the initial migration** (creates the `User` and `Trade` tables)
   ```bash
   npx prisma migrate dev --name init
   ```

5. **Start the dev server**
   ```bash
   npm run dev
   ```
   The API runs at `http://localhost:4000`. Check it's alive:
   ```bash
   curl http://localhost:4000/health
   ```

## Scripts

| Command                  | Purpose                                   |
|---------------------------|--------------------------------------------|
| `npm run dev`             | Start with hot-reload (ts-node-dev)        |
| `npm run build`           | Compile TypeScript to `dist/`              |
| `npm start`               | Run the compiled build                     |
| `npm run prisma:migrate`  | Create/apply a migration                   |
| `npm run prisma:studio`   | Open Prisma Studio (visual DB browser)     |

## API endpoints

| Method | Path                    | Auth | Purpose                        |
|--------|-------------------------|------|----------------------------------|
| POST   | `/api/auth/register`    | No   | Create account                  |
| POST   | `/api/auth/login`       | No   | Log in, returns JWT             |
| GET    | `/api/users/me`         | Yes  | Current user profile            |
| GET    | `/api/trades`           | Yes  | List your trades                |
| GET    | `/api/trades/:id`       | Yes  | Single trade                    |
| POST   | `/api/trades`           | Yes  | Create a trade                  |
| PUT    | `/api/trades/:id`       | Yes  | Update a trade                  |
| DELETE | `/api/trades/:id`       | Yes  | Delete a trade                  |
| GET    | `/api/dashboard/metrics`| Yes  | Win rate, avg RR, best/worst pair|
| GET    | `/api/analytics`        | Yes  | Equity curve, pair/win-loss/direction breakdowns |

Protected routes require `Authorization: Bearer <token>`, using the token
returned from `/api/auth/login`.

### Quick manual test

```bash
# Register
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Sam","email":"sam@example.com","password":"password123"}'

# Login (copy the returned token)
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sam@example.com","password":"password123"}'

# Create a trade (replace <TOKEN>)
curl -X POST http://localhost:4000/api/trades \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"pair":"XAUUSD","direction":"BUY","entry":2385.50,"sl":2380.00,"tp":2398.00,"timeframe":"H1"}'

# Get dashboard metrics
curl http://localhost:4000/api/dashboard/metrics -H "Authorization: Bearer <TOKEN>"
```

## Notes on what's already handled

- Passwords are bcrypt-hashed (10 salt rounds), never stored in plaintext.
- Every trade query is scoped to `req.user.id` from the verified JWT — never
  a value from the request body — so one user can never read or modify
  another user's trades.
- All request bodies are validated with Zod before reaching a controller;
  invalid input returns `400` with a clear message instead of hitting the
  database.
- Errors are centralized in `middleware/errorHandler.ts` — controllers throw
  `AppError` (or let unexpected errors bubble up) and call `next(err)`.
  Known Prisma errors (unique constraint, not found) are translated to
  `409`/`404` instead of leaking as a generic `500`.
- `helmet` sets standard security headers; `morgan` logs requests in
  development only (`NODE_ENV=production` turns it off).
- `/api/auth/register` and `/api/auth/login` are rate-limited (20 requests /
  15 min per IP) to slow down brute-force and account-enumeration attempts.
  Every other route is already behind the JWT check, so it doesn't need this.

## Deploying to Render

`render.yaml` is included — Render can pick it up automatically ("New +" →
"Blueprint" → point at this repo), or you can configure a Web Service
manually with:

- Build command: `npm install && npm run build`
- Start command: `npm start`
- Environment variables: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`,
  `CORS_ORIGIN`, `NODE_ENV=production` — set these in the Render dashboard,
  never commit them.

## What's next (not built yet)

- Frontend (React + Vite + TypeScript) — this backend is ready for it to
  connect to via the endpoints above.
- Actually running this against a live database. This has been fixed for a
  real breaking change (Prisma 7 removed `datasource.url` from
  `schema.prisma` and now requires a driver adapter — see `prisma.config.ts`
  and `src/config/prisma.ts`), and the fix gets past the exact schema
  validation error from the original run. But it still hasn't been run
  against a real, reachable Postgres database end-to-end (this sandbox can't
  reach Prisma's binary CDN to download the schema-engine the CLI needs —
  that's a sandbox-only restriction, not a problem your machine will hit).
  Run `npm install && npx prisma migrate dev --name init && npm run dev`
  and confirm the curl examples above actually return what's documented
  before building the frontend on top of it.
