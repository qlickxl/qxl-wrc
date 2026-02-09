# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

QXL WRC Rally is a full-stack rally racing application. Sister site to QXL F1. Same tech stack (Express + Next.js 16 + PostgreSQL + Tailwind 4 + Framer Motion), same DB (`motor_racing`) with `wrc_`-prefixed tables.

## Repository Information

- GitHub repo: https://github.com/qlickxl/qxl-wrc.git

## Architecture

### Monorepo Structure
- **`backend/`**: Express API server with TypeScript, PostgreSQL, JWT auth
- **`frontend/`**: Next.js 16 App Router with TypeScript, Tailwind CSS
- **Ports**: Backend runs on **4010**, Frontend runs on **3010**

### Key Architectural Decisions

**Authentication Flow (Currently Optional)**:
- Backend has full JWT authentication system with bcrypt password hashing
- **Current behavior**: Dashboard is publicly accessible without login
- Auth infrastructure intact for future feature gating if needed

**Database Architecture**:
- Single PostgreSQL connection pool exported from `backend/src/config/database.ts`
- Pool is reused across all models (singleton pattern)
- Uses `motor_racing` database (shared with F1 app) with `wrc_` table prefix

**API Communication**:
- Frontend uses Next.js API route handlers as proxy to backend
- Backend serves data from PostgreSQL + WRC API

## Development Commands

```bash
# Backend
cd backend && npm install && npm run dev    # Port 4010

# Frontend
cd frontend && npm install && npm run dev   # Port 3010

# Database setup
cd backend && npm run db:setup
```

### Building for Production

```bash
cd backend && npm run build
cd frontend && npm run build
```

## WRC API Reference

- Base: `https://api.wrc.com/results-api`
- Calendar: `GET /contel-page/83388/calendar/active-season/`
- Cars: `GET /results-api/rally-event/{eventId}/cars`
- Itinerary: `GET /results-api/rally-event/{eventId}/itinerary`
- Overall result: `GET /results-api/rally-event/{eventId}/result`
- Stage times: `GET /results-api/rally-event/{eventId}/stage-times/stage-external/{stageId}`
- Split times: `GET /results-api/rally-event/{eventId}/split-times/stage-external/{stageId}`
- Penalties: `GET /results-api/rally-event/{eventId}/penalties`
- Retirements: `GET /results-api/rally-event/{eventId}/retirements`
- **No auth required**, times in milliseconds (integers) + ISO 8601 durations

## API Endpoints

**Authentication** (functional but not required):
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/profile`

**Health Check**:
- `GET /api/health`

**WRC Data**:
- `GET /api/wrc/rallies` — Rally calendar
- `GET /api/wrc/rallies/:id/results` — Rally overall results
- `GET /api/wrc/rallies/:id/stages` — Rally stages
- `GET /api/wrc/stages/:id/results` — Stage results
- `GET /api/wrc/standings/drivers` — Driver standings
- `GET /api/wrc/standings/manufacturers` — Manufacturer standings
- `GET /api/wrc/drivers/:id` — Driver profile

**Sync Endpoints**:
- `POST /api/wrc/sync/calendar`
- `POST /api/wrc/sync/rally`
- `POST /api/wrc/sync/season`
- `POST /api/wrc/sync/standings`
- `POST /api/wrc/sync/recompute-stats`
- `GET /api/wrc/sync/status`

## Database Tables (wrc_-prefixed in motor_racing DB)

1. `wrc_manufacturers` — Manufacturer teams
2. `wrc_drivers` — Rally drivers
3. `wrc_codrivers` — Co-drivers
4. `wrc_rallies` — Rally calendar/events
5. `wrc_stages` — Individual stages per rally
6. `wrc_crews` — Driver+codriver entries per rally
7. `wrc_stage_results` — Stage times and positions
8. `wrc_overall_results` — Final rally classifications
9. `wrc_driver_standings` — Championship standings
10. `wrc_manufacturer_standings` — Manufacturer championship

## Environment Variables

### Backend (.env)
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=motor_racing
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=<secret>
JWT_EXPIRES_IN=7d
PORT=4010
FRONTEND_URL=https://wrc.awagi.co.uk
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=https://wrc.awagi.co.uk/api
BACKEND_URL=http://localhost:4010
```

## Styling

- Tailwind 4 with custom WRC colors: `wrc-blue` (#003087), `wrc-red` (#E4002B), `wrc-dark` (#0F1923)
- Framer Motion for animations
- `suppressHydrationWarning` needed on date-dependent elements
