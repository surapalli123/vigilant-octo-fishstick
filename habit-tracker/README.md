# Habit Tracker

A full-stack Habit Tracker application scaffold.

**Tech stack:**

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Backend | Node.js + Express + TypeScript |
| Database | SQLite via Prisma |
| Unit tests | Vitest |
| E2E tests | Playwright (placeholder) |
| Linting | ESLint |
| CI | GitHub Actions |

---

## Project Structure

```
.
├── client/                   # React + Vite frontend
│   ├── src/
│   │   ├── App.tsx
│   │   ├── App.test.tsx
│   │   ├── main.tsx
│   │   └── setupTests.ts
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── server/                   # Express backend
│   ├── src/
│   │   ├── index.ts
│   │   └── index.test.ts
│   ├── prisma/
│   │   └── schema.prisma     # SQLite schema (Habit + HabitCompletion)
│   ├── .env                  # DATABASE_URL (SQLite file path)
│   └── package.json
├── e2e/
│   └── app.spec.ts           # Playwright E2E placeholder
├── playwright.config.ts
├── .github/workflows/ci.yml  # GitHub Actions CI
└── package.json              # Root workspace
```

---

## Local Setup

### Prerequisites

- **Node.js 20+** — [nodejs.org](https://nodejs.org)
- **npm 9+** — bundled with Node.js 20

### 1. Install all dependencies

```bash
npm install
```

This installs dependencies for both `client/` and `server/` via npm workspaces.

### 2. Set up the database

```bash
cd server
npx prisma migrate dev --name init
```

This creates `server/prisma/dev.db` (SQLite) and generates the Prisma client.

### 3. Run the development servers

In separate terminals:

```bash
# Terminal 1 — frontend (http://localhost:5173)
npm run dev:client

# Terminal 2 — backend  (http://localhost:3001)
npm run dev:server
```

### 4. Check the API

```bash
curl http://localhost:3001/health
# {"status":"ok"}

curl http://localhost:3001/api/habits
# []
```

---

## Scripts

All scripts can be run from the **repository root**:

| Command | Description |
|---|---|
| `npm install` | Install all workspace dependencies |
| `npm run build` | Build client and server |
| `npm run test` | Run all unit tests (Vitest) |
| `npm run lint` | Lint client and server |
| `npm run dev:client` | Start Vite dev server |
| `npm run dev:server` | Start Express server with live reload |

Or run per workspace:

```bash
npm run test --workspace=client
npm run test --workspace=server
npm run lint --workspace=client
npm run lint --workspace=server
```

---

## Database

The Prisma schema (`server/prisma/schema.prisma`) defines two models:

- **`Habit`** — name, description, timestamps
- **`HabitCompletion`** — daily completion record linked to a Habit

```bash
# Generate Prisma Client after schema changes
cd server && npx prisma generate

# Create a new migration
cd server && npx prisma migrate dev --name <migration-name>

# Open Prisma Studio (DB GUI)
cd server && npx prisma studio
```

---

## Running Tests

```bash
# All tests
npm run test

# Frontend only (watch mode)
cd client && npx vitest

# Backend only (watch mode)
cd server && npx vitest
```

---

## E2E Tests (Playwright)

E2E tests are a placeholder — Playwright will start the Vite dev server automatically.

```bash
# Install Playwright browsers (first time)
npx playwright install

# Run E2E tests
npx playwright test
```

---

## CI

GitHub Actions runs on every push and pull request to `main`:

1. `npm install`
2. `npm run lint` (client + server)
3. `npm run test` (client + server)
4. `npm run build` (client + server)

See [`../.github/workflows/ci.yml`](../.github/workflows/ci.yml).

---

## License

[MIT](LICENSE)
