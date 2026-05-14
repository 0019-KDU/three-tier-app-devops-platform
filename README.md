# TaskApp — Three-Tier Production Task Management Platform

A production-grade, three-tier Task Management application demonstrating enterprise-level software engineering patterns across the full stack: **Node.js/Express** backend, **React/Vite** frontend, **PostgreSQL** database, and **Redis** cache — containerised with Docker, reverse-proxied with Nginx, and designed with SRE principles.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Technology Stack](#2-technology-stack)
3. [System Design Concepts](#3-system-design-concepts)
4. [Project Structure](#4-project-structure)
5. [Database Design](#5-database-design)
6. [API Reference](#6-api-reference)
7. [Authentication & Security](#7-authentication--security)
8. [Caching Strategy](#8-caching-strategy)
9. [Rate Limiting](#9-rate-limiting)
10. [Logging & Observability](#10-logging--observability)
11. [Health Checks & SRE](#11-health-checks--sre)
12. [Circuit Breaker](#12-circuit-breaker)
13. [Frontend Architecture](#13-frontend-architecture)
14. [Infrastructure & DevOps](#14-infrastructure--devops)
15. [Local Development Setup](#15-local-development-setup)
16. [Environment Variables](#16-environment-variables)
17. [Database Migrations](#17-database-migrations)
18. [Production Deployment](#18-production-deployment)
19. [Runbook & SRE Operations](#19-runbook--sre-operations)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT BROWSER                             │
│                    React + Vite SPA (Port 5173)                     │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ HTTP/HTTPS
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        NGINX REVERSE PROXY                          │
│                          (Port 80 / 443)                            │
│    /api/* → backend:3000      /health → backend:3000               │
│    /*      → frontend:80      (SPA fallback)                       │
└───────────────────┬─────────────────────────────┬───────────────────┘
                    │                             │
          ┌─────────▼──────────┐       ┌─────────▼──────────┐
          │   BACKEND API      │       │   FRONTEND SPA     │
          │  Express/Node.js   │       │  React + Nginx     │
          │  Port 3000         │       │  Port 80           │
          │  (2 replicas prod) │       └────────────────────┘
          └────┬──────────┬────┘
               │          │
    ┌──────────▼──┐   ┌───▼──────────┐
    │ PostgreSQL  │   │    Redis      │
    │ Port 5432   │   │  Port 6379    │
    │ (Primary DB)│   │  (Cache/RL)   │
    └─────────────┘   └──────────────┘
```

### Three-Tier Decomposition

| Tier | Technology | Responsibility |
|------|-----------|---------------|
| **Presentation** | React 18, Vite, TailwindCSS | UI rendering, client-side state, drag-and-drop Kanban |
| **Application** | Node.js 22, Express 4, TypeScript | Business logic, auth, validation, caching, rate limiting |
| **Data** | PostgreSQL 16, Redis 7 | Persistent storage, session-free caching, rate limit counters |

### Request Flow

```
Browser → Nginx → Express Middleware Chain → Controller → Service → Repository → PostgreSQL
                                                              ↕
                                                           Redis Cache
```

**Middleware chain (in order):**
```
Helmet → CORS → Body Parser → Request ID → Log Context (ALS) → Morgan Logger
→ Global Rate Limiter → Routes → Auth Middleware → Zod Validator → Controller
→ Error Handler
```

---

## 2. Technology Stack

### Backend
| Package | Version | Purpose |
|---------|---------|---------|
| Node.js | 22.x | JavaScript runtime |
| TypeScript | 5.5 | Static typing |
| Express | 4.19 | HTTP framework |
| pg (node-postgres) | 8.12 | PostgreSQL driver |
| ioredis | 5.10 | Redis client |
| jsonwebtoken | 9.0 | JWT access/refresh tokens |
| bcryptjs | 2.4 | Password hashing |
| zod | 3.23 | Runtime schema validation |
| helmet | 7.1 | Security headers |
| cors | 2.8 | Cross-origin resource sharing |
| express-rate-limit | 7.3 | Rate limiting |
| rate-limit-redis | 4.3 | Redis-backed rate limit store |
| opossum | 8.1 | Circuit breaker |
| winston | 3.13 | Structured logging |
| winston-daily-rotate-file | 5.0 | Log rotation |
| morgan | 1.10 | HTTP request logging |
| uuid | 10.0 | Request ID generation |
| cookie-parser | 1.4 | Cookie handling for refresh tokens |

### Frontend
| Package | Version | Purpose |
|---------|---------|---------|
| React | 18.3 | UI framework |
| React Router DOM | 6.25 | Client-side routing |
| TanStack Query | 5.51 | Server-state management, caching, refetch |
| Axios | 1.7 | HTTP client with interceptors |
| Zustand | 4.5 | Client-state management (auth) |
| React Hook Form | 7.52 | Form state and validation |
| @dnd-kit/core | — | Drag-and-drop Kanban |
| Zod | 3.23 | Form schema validation |
| TailwindCSS | 3.4 | Utility-first CSS |
| Vite | 5.3 | Build tool and dev server |

### Infrastructure
| Tool | Purpose |
|------|---------|
| Docker | Containerisation |
| Docker Compose | Multi-service orchestration |
| Nginx | Reverse proxy, static file serving, SPA fallback |
| PostgreSQL 16 | Primary relational database |
| Redis 7 | Cache and rate-limit counter store |

---

## 3. System Design Concepts

### Repository Pattern
Controllers never touch the database directly. Every domain has a layered chain:

```
Controller  →  Service  →  Repository  →  pg.Pool
```

- **Controller** — HTTP parsing, response shaping
- **Service** — business rules, cache-aside logic, access control
- **Repository** — pure SQL queries, data mapping to domain types

### Cache-Aside Pattern
```
Service.listByProject()
  ├─ cacheGet("projects:{id}:tasks")
  │    ├─ HIT  → return cached value
  │    └─ MISS → query DB → cacheSet(key, value, TTL) → return
  └─ On mutation (create/update/delete task) → cacheDel(key)
```

### JWT with Refresh Token Rotation
```
Login → Access Token (15 min, in-memory) + Refresh Token (7 days, httpOnly cookie, bcrypt-hashed in DB)
Access expires → Silent refresh via interceptor → New token pair issued → Old refresh token revoked
Replay attack prevention → Each refresh token can only be used once
```

### AsyncLocalStorage for Log Context
```
requestId middleware → logContext middleware wraps entire request in ALS scope
  ├─ Every logger.info() anywhere (service, repository, middleware) auto-includes requestId
  └─ After JWT verify → setLogContextUser(userId) → userId included in all subsequent logs
```

### Graceful Degradation
- Redis down → App continues without caching; `enableOfflineQueue: false` makes Redis calls fail fast
- Redis rate limiter unavailable → Falls back to in-memory store (dev) or continues serving (prod)
- DB pool exhausted → `connectionTimeoutMs: 2000` prevents indefinite blocking

### Graceful Shutdown
```
SIGTERM/SIGINT received
  1. HTTP server stops accepting new connections
  2. In-flight requests complete
  3. DB pool drains (pool.end())
  4. Redis connection closes (redis.quit())
  5. Process exits 0
  Timeout: 10s → forced exit(1)
```

---

## 4. Project Structure

```
three-tier-app-devops-platform/
├── backend/
│   ├── src/
│   │   ├── api/v1/
│   │   │   ├── auth/           # Register, login, refresh, logout, me
│   │   │   ├── users/          # User profile management
│   │   │   ├── projects/       # Project CRUD + members
│   │   │   ├── tasks/          # Task CRUD + Kanban
│   │   │   ├── logs/           # Client error ingest endpoint
│   │   │   └── index.ts        # v1 router mount
│   │   ├── cache/
│   │   │   ├── client.ts       # ioredis instance + connection config
│   │   │   └── helpers.ts      # get/set/del/getOrSet + stats
│   │   ├── config/
│   │   │   └── index.ts        # All config from env vars
│   │   ├── constants/
│   │   │   ├── cache-keys.ts   # Cache key templates + TTLs
│   │   │   └── http-status.ts  # HTTP status constants
│   │   ├── db/
│   │   │   ├── pool.ts         # pg.Pool + event logging
│   │   │   └── migrations/     # SQL migration files + runner
│   │   ├── health/
│   │   │   ├── health.router.ts
│   │   │   └── health.service.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts         # JWT verify + ALS userId stamp
│   │   │   ├── circuitBreaker.ts
│   │   │   ├── errorHandler.ts
│   │   │   ├── logContext.ts   # ALS scope per request
│   │   │   ├── rateLimiter.ts
│   │   │   ├── requestId.ts
│   │   │   ├── requestLogger.ts
│   │   │   └── validate.ts
│   │   ├── types/
│   │   │   ├── domain.ts       # Shared TypeScript interfaces
│   │   │   └── express.d.ts    # Express Request augmentation
│   │   ├── utils/
│   │   │   ├── AppError.ts     # Typed operational errors
│   │   │   ├── asyncHandler.ts # try/catch wrapper for controllers
│   │   │   ├── jwt.ts          # sign/verify access + refresh tokens
│   │   │   ├── logContext.ts   # AsyncLocalStorage store
│   │   │   ├── logger.ts       # Winston logger + ALS format
│   │   │   └── password.ts     # bcrypt helpers
│   │   ├── app.ts              # Express app factory
│   │   └── server.ts           # HTTP server + startup/shutdown
│   ├── Dockerfile
│   ├── Dockerfile.prod
│   ├── package.json
│   ├── tsconfig.json
│   └── .env                    # Local dev only (gitignored)
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts       # Axios instance + interceptors
│   │   │   ├── auth.api.ts
│   │   │   ├── projects.api.ts
│   │   │   └── tasks.api.ts
│   │   ├── components/
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── features/
│   │   │   │   ├── projects/   # ProjectCard, CreateProjectModal
│   │   │   │   └── tasks/      # TaskCard, TaskKanban, CreateTaskModal, EditTaskModal
│   │   │   ├── layout/         # Navbar, Sidebar, PageLayout
│   │   │   └── ui/             # Button, Input, Badge, Modal, Spinner
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useProjects.ts
│   │   │   └── useTasks.ts
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── ProjectsPage.tsx
│   │   │   ├── ProjectDetailPage.tsx
│   │   │   └── NotFoundPage.tsx
│   │   ├── routes/             # React Router config + ProtectedRoute
│   │   ├── store/
│   │   │   ├── authStore.ts    # Zustand: accessToken, user
│   │   │   └── uiStore.ts      # Zustand: sidebar, modal state
│   │   ├── types/
│   │   │   └── domain.ts       # Task, Project, User interfaces
│   │   └── utils/
│   │       ├── cn.ts           # clsx + tailwind-merge
│   │       ├── formatDate.ts
│   │       └── logger.ts       # Frontend logger (levels + backend reporting)
│   ├── Dockerfile
│   ├── Dockerfile.prod
│   ├── nginx-spa.conf
│   └── package.json
│
├── database/
│   └── init/
│       └── 00_create_db.sql    # DB init script for Docker
│
├── nginx/
│   ├── Dockerfile
│   └── nginx.conf              # Reverse proxy config
│
├── docker-compose.yml          # Full dev stack (postgres + backend + frontend)
├── docker-compose.redis.yml    # Redis only (standalone)
├── docker-compose.prod.yml     # Production stack
├── .env.example                # Environment variable template
└── .gitignore
```

---

## 5. Database Design

### Entity Relationship Diagram

```
users
  ├── id (UUID PK)
  ├── email (UNIQUE)
  ├── password_hash
  ├── full_name
  ├── avatar_url
  ├── role (admin | member)
  ├── is_active
  ├── created_at
  └── updated_at
        │
        │ 1:N (owner)
        ▼
projects
  ├── id (UUID PK)
  ├── name
  ├── description
  ├── owner_id (FK → users)
  ├── status (active | archived | completed)
  ├── created_at
  └── updated_at
        │                          users
        │ N:M (members)              │
        ▼                            │
project_members ──────────────────── ┘
  ├── project_id (FK → projects)
  ├── user_id    (FK → users)
  ├── role (admin | contributor | viewer)
  └── joined_at (PK: project_id + user_id)
        │
        │ 1:N
        ▼
tasks
  ├── id (UUID PK)
  ├── title
  ├── description
  ├── project_id  (FK → projects CASCADE)
  ├── assignee_id (FK → users SET NULL)
  ├── created_by  (FK → users RESTRICT)
  ├── status (todo | in_progress | in_review | done)
  ├── priority (low | medium | high | critical)
  ├── due_date
  ├── position (int, for Kanban ordering)
  ├── created_at
  └── updated_at
        │
        │ 1:N
        ▼
task_labels
  ├── id (UUID PK)
  ├── task_id (FK → tasks CASCADE)
  └── label

refresh_tokens
  ├── id (UUID PK)
  ├── user_id    (FK → users CASCADE)
  ├── token_hash (UNIQUE — bcrypt hash stored, never raw)
  ├── expires_at
  ├── revoked    (boolean)
  └── created_at
```

### Indexes

| Index | Table | Columns | Purpose |
|-------|-------|---------|---------|
| `idx_tasks_project_id` | tasks | project_id | List tasks by project |
| `idx_tasks_assignee_id` | tasks | assignee_id | Tasks assigned to user |
| `idx_tasks_status` | tasks | status | Filter by Kanban column |
| `idx_tasks_project_status` | tasks | (project_id, status) | Kanban view queries |
| `idx_refresh_tokens_user` | refresh_tokens | user_id | Find tokens by user |
| `idx_refresh_tokens_hash` | refresh_tokens | token_hash | Token lookup on refresh |
| `idx_project_members_user` | project_members | user_id | Projects for a user |
| `idx_projects_owner` | projects | owner_id | Projects owned by user |

### Auto-Update Triggers

All three core tables (`users`, `projects`, `tasks`) have a PostgreSQL trigger that automatically sets `updated_at = NOW()` on every UPDATE:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Connection Pool

| Config | Value | Description |
|--------|-------|-------------|
| `min` | 2 | Minimum idle connections kept warm |
| `max` | 10 | Maximum concurrent connections |
| `idleTimeoutMs` | 30,000 | Idle connection pruned after 30s |
| `connectionTimeoutMs` | 2,000 | Max wait for connection from pool |

---

## 6. API Reference

Base URL: `http://localhost:3000/api/v1`

All protected routes require:
```
Authorization: Bearer <accessToken>
```

All responses follow the envelope pattern:
```json
{ "success": true,  "data": { ... } }
{ "success": false, "error": { "code": "ERROR_CODE", "message": "..." } }
```

---

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health/live` | None | Liveness probe — always 200 if process is up |
| GET | `/health/ready` | None | Readiness probe — 200 if DB is reachable |
| GET | `/health` | None | Full health report |

**GET /health response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptimeSeconds": 3600,
  "memoryMb": 128,
  "cache": { "entries": 42 },
  "components": {
    "database": { "status": "up", "latencyMs": 3 },
    "redis":    { "status": "up", "latencyMs": 1 }
  }
}
```

Status logic:
- `healthy` — database UP **and** redis UP
- `degraded` — database UP **but** redis DOWN (app works, no caching)
- `unhealthy` — database DOWN (returns 503)

---

### Authentication

| Method | Path | Auth | Body | Description |
|--------|------|------|------|-------------|
| POST | `/auth/register` | None | `{ email, password, fullName }` | Create account |
| POST | `/auth/login` | None | `{ email, password }` | Get token pair |
| POST | `/auth/refresh` | Cookie | — | Rotate refresh token |
| POST | `/auth/logout` | Cookie | — | Revoke refresh token |
| GET | `/auth/me` | Bearer | — | Get current user |

**POST /auth/register**
```json
// Request
{ "email": "user@example.com", "password": "secure123", "fullName": "Jane Doe" }

// Response 201
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "...", "fullName": "...", "role": "member" },
    "accessToken": "eyJ..."
  }
}
// Refresh token set as httpOnly cookie: refresh_token
```

**POST /auth/login**
```json
// Request
{ "email": "user@example.com", "password": "secure123" }

// Response 200
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "...", "fullName": "...", "role": "member" },
    "accessToken": "eyJ..."
  }
}
```

**POST /auth/refresh**
```json
// Sends refresh_token cookie automatically
// Response 200
{ "success": true, "data": { "accessToken": "eyJ..." } }
// New refresh token set in cookie (old one revoked)
```

**Error Codes**

| Code | HTTP | Meaning |
|------|------|---------|
| `VALIDATION_ERROR` | 422 | Invalid request body |
| `EMAIL_TAKEN` | 409 | Email already registered |
| `INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `INVALID_REFRESH_TOKEN` | 401 | Token expired, revoked, or not found |
| `UNAUTHORIZED` | 401 | Missing or invalid Bearer token |

---

### Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users/me` | Bearer | Get own profile |
| PATCH | `/users/me` | Bearer | Update own profile |

**PATCH /users/me**
```json
// Request (all fields optional)
{ "fullName": "New Name", "avatarUrl": "https://..." }

// Response 200
{ "success": true, "data": { "user": { ... } } }
```

---

### Projects

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/projects` | Bearer | List own projects (paginated) |
| POST | `/projects` | Bearer | Create project |
| GET | `/projects/:id` | Bearer | Get project by ID |
| PATCH | `/projects/:id` | Bearer | Update project |
| DELETE | `/projects/:id` | Bearer | Delete project |
| GET | `/projects/:id/members` | Bearer | List project members |
| POST | `/projects/:id/members` | Bearer | Add member |
| DELETE | `/projects/:id/members/:userId` | Bearer | Remove member |

**GET /projects query params:**
```
?page=1&limit=20
```

**POST /projects**
```json
// Request
{ "name": "My Project", "description": "Optional description" }

// Response 201
{ "success": true, "data": { "project": { "id": "uuid", "name": "...", "status": "active", ... } } }
```

**POST /projects/:id/members**
```json
// Request
{ "userId": "uuid", "role": "contributor" }  // role: admin | contributor | viewer
```

**Error Codes**

| Code | HTTP | Meaning |
|------|------|---------|
| `PROJECT_NOT_FOUND` | 404 | Project does not exist |
| `FORBIDDEN` | 403 | Not a project member or insufficient role |

---

### Tasks

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/projects/:projectId/tasks` | Bearer | List tasks (with filters, paginated) |
| POST | `/projects/:projectId/tasks` | Bearer | Create task |
| GET | `/tasks/:id` | Bearer | Get single task |
| PATCH | `/tasks/:id` | Bearer | Update task (status, priority, etc.) |
| DELETE | `/tasks/:id` | Bearer | Delete task |

**GET /projects/:projectId/tasks query params:**
```
?status=in_progress&priority=high&assigneeId=uuid&page=1&limit=50
```

**Paginated response:**
```json
{
  "success": true,
  "data": {
    "data": [ { "id": "...", "title": "...", "status": "todo", "priority": "medium", ... } ],
    "meta": { "page": 1, "limit": 50, "total": 124, "totalPages": 3 }
  }
}
```

**POST /projects/:projectId/tasks**
```json
// Request
{
  "title": "Implement login",
  "description": "Optional long description",
  "priority": "high",           // low | medium | high | critical (default: medium)
  "assigneeId": "uuid",         // optional
  "dueDate": "2025-06-01T00:00:00.000Z"  // optional ISO 8601
}

// Response 201
{ "success": true, "data": { "task": { "id": "...", "status": "todo", "position": 0, ... } } }
```

**PATCH /tasks/:id**
```json
// All fields optional — used for status updates (Kanban DnD), edits, re-ordering
{
  "title": "Updated title",
  "description": "Updated desc",
  "status": "in_progress",      // todo | in_progress | in_review | done
  "priority": "critical",
  "assigneeId": "uuid",
  "dueDate": "2025-06-15T00:00:00.000Z",
  "position": 2
}
```

**Task statuses (Kanban columns):**
```
todo → in_progress → in_review → done
```

**Task priorities:**
```
low (blue) | medium (yellow) | high (orange) | critical (red)
```

---

### Client Logging

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/logs/client` | None | Ingest browser error reports |

```json
// Request
{
  "level": "error",           // error | warn | info
  "message": "Uncaught render error",
  "context": {
    "errorId": "uuid",
    "stack": "Error: ...\n  at ...",
    "url": "/projects/123"
  }
}

// Response 200
{ "success": true }
```

---

## 7. Authentication & Security

### Token Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    ACCESS TOKEN (JWT)                    │
│  Lifetime: 15 minutes                                    │
│  Storage:  In-memory (Zustand store) — never localStorage│
│  Transport: Authorization: Bearer <token>                │
│  Payload:  { sub, email, role, iat, exp }                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   REFRESH TOKEN (JWT)                    │
│  Lifetime: 7 days                                        │
│  Storage:  httpOnly cookie (inaccessible to JS)          │
│  Transport: Sent automatically by browser                │
│  DB record: bcrypt-hashed (never stored raw)             │
│  Rotation:  Old token revoked on every refresh           │
└─────────────────────────────────────────────────────────┘
```

### Refresh Token Rotation Flow

```
1. Client has expired access token
2. Axios response interceptor catches 401
3. Queue all in-flight requests
4. POST /auth/refresh with refresh cookie
5. Server:
   a. Verifies refresh JWT signature
   b. Looks up token hash in DB (bcrypt compare against all valid tokens)
   c. Revokes old token (UPDATE ... SET revoked = true)
   d. Issues new access + refresh token pair
   e. New refresh token set in httpOnly cookie
6. Client stores new access token in memory
7. All queued requests are replayed with new token
8. Replay attack prevention: each token usable exactly once
```

### Security Headers (Helmet)

```
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=15552000; includeSubDomains
Content-Security-Policy: (default Helmet policy)
```

### CORS Configuration

| Setting | Value |
|---------|-------|
| Origin | `CORS_ORIGIN` env var (default: `http://localhost:5173`) |
| Methods | GET, POST, PUT, PATCH, DELETE, OPTIONS |
| Allowed Headers | Content-Type, Authorization, X-Request-ID |
| Credentials | `true` (required for cookie-based refresh tokens) |

### Password Storage

```
Plaintext password → bcrypt.hash(password, rounds) → password_hash stored in DB
Login: bcrypt.compare(input, hash) → boolean

Production rounds: 12 (config.bcrypt.rounds)
Development rounds: 10 (faster for dev/test)
```

### Request Tracing

Every request gets a unique ID:
```
X-Request-ID: client-provided or auto-generated UUID
```
- Set in response header for client-side correlation
- Propagated through AsyncLocalStorage to all log lines
- Allows tracing a full request chain across log lines

---

## 8. Caching Strategy

### Cache Keys and TTLs

| Resource | Cache Key | TTL | Invalidation Trigger |
|----------|-----------|-----|---------------------|
| Project tasks (page 1, no filters) | `projects:{projectId}:tasks` | 60s | Task create / update / delete |

### Cache Flow (Cache-Aside)

```
GET /projects/:id/tasks?page=1 (no filters)
  │
  ├─ cacheGet("projects:{id}:tasks")
  │    ├─ HIT  → return JSON.parse(cached) → response
  │    └─ MISS → query PostgreSQL → cacheSet(key, result, 60) → response
  │
POST/PATCH/DELETE /tasks/:id
  └─ cacheDel("projects:{projectId}:tasks")   ← invalidate immediately
```

### Redis Client Configuration

```typescript
{
  enableOfflineQueue: false,  // commands fail immediately when disconnected
  lazyConnect: true,          // connect() called explicitly at startup
  enableReadyCheck: true,     // wait for READY before accepting commands
  connectTimeout: 5_000,      // TCP handshake timeout: 5s
  maxRetriesPerRequest: 3,    // retry each command up to 3x on failure
  retryStrategy: (attempts) =>
    attempts > 10 ? null                          // stop after 10 attempts
                  : Math.min(attempts * 200, 3000) // exponential backoff up to 3s
}
```

### Graceful Degradation

If Redis is unavailable:
1. `cacheGet` returns `null` → app fetches fresh from DB
2. `cacheSet` is silently swallowed (try/catch, no throw)
3. `cacheDel` is silently swallowed
4. Rate limiters use in-memory store (dev) or continue with degraded counters (prod)
5. Health endpoint reports `"status": "degraded"` with `redis: { "status": "down" }`
6. **No request is ever blocked by Redis being down**

---

## 9. Rate Limiting

### Limits

| Limiter | Window | Max Requests | Applied To | Dev Skip |
|---------|--------|-------------|------------|----------|
| Global | 15 min | 100 | All routes except `/health` | Yes |
| Auth | 15 min | 10 | `/auth/register`, `/auth/login`, `/auth/refresh` | Yes |

### Backend Store

- **Development:** In-memory (`MemoryStore` — default)
- **Production:** Redis (`RedisStore` with `rate-limit-redis`)
  - Global counter prefix: `rl:global:`
  - Auth counter prefix: `rl:auth:`

Rate limit headers returned on every response:
```
RateLimit-Limit: 100
RateLimit-Remaining: 87
RateLimit-Reset: 1716700000
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests, please try again later."
  }
}
```
HTTP Status: `429 Too Many Requests`

---

## 10. Logging & Observability

### Log Levels

| Level | Colour | When used |
|-------|--------|-----------|
| `error` | Red | Unhandled exceptions, 5xx errors, DB errors |
| `warn` | Yellow | 4xx AppErrors, failed auth attempts, Redis unavailable |
| `http` | Magenta | Every HTTP request/response (via Morgan) |
| `info` | Cyan | Server start/stop, auth events (login, logout, register) |
| `debug` | Grey | Cache hit/miss, DB pool events (dev only) |

### Development Log Format

```
HH:mm:ss [LEVEL] message  key=value key=value
18:09:25 [INFO ] Server started  port=3000 env=development pid=7184
18:09:33 [HTTP ] POST /api/v1/auth/login 200 12ms
18:09:33 [DEBUG] Cache MISS: projects:abc123:tasks
18:09:33 [WARN ] Login failed: wrong password  email=bad@user.com userId=uuid
18:09:33 [ERROR] Unhandled error  requestId=abc method=POST path=/api/v1/tasks
  Error: something went wrong
    at TasksService.create (tasks.service.ts:45:12)
```

### Production Log Format (JSON)

```json
{
  "timestamp": "2025-05-14T10:30:45.123Z",
  "level": "info",
  "message": "User logged in",
  "service": "taskapp-api",
  "env": "production",
  "requestId": "ccf8f362-8155-4fae-8dcf-48c9856b3e21",
  "userId": "a1b2c3d4-...",
  "email": "user@example.com"
}
```

### Log Files (Production)

| File | Level | Retention | Max Size | Compression |
|------|-------|-----------|----------|-------------|
| `logs/error-YYYY-MM-DD.log` | error only | 30 days | 50 MB | gzip |
| `logs/combined-YYYY-MM-DD.log` | all levels | 14 days | 100 MB | gzip |

### Context Propagation (AsyncLocalStorage)

```
requestId middleware  →  logContext middleware starts ALS scope
                              │
             ┌────────────────┼───────────────────────┐
             ▼                ▼                       ▼
      Controller.login   Service.login         Repository.findByEmail
      logger.warn(...)   logger.info(...)      (no log here)
             │                │
             └────────────────┘
     Both auto-include: requestId=abc123, userId=uuid
     No manual passing required
```

### Security Events Logged

| Event | Level | Fields |
|-------|-------|--------|
| User registered | info | userId, email |
| Login success | info | userId, email |
| Login failed (wrong password) | warn | email, userId |
| Login failed (user not found) | warn | email |
| Token refresh rejected | warn | userId |
| User logged out | info | userId |
| Registration with existing email | warn | email |

### Frontend Error Reporting

Browser errors are captured at three levels:

1. **React ErrorBoundary** — catches render-phase errors, generates `errorId`, ships to `POST /api/v1/logs/client`
2. **`window.onerror`** — catches uncaught JavaScript errors
3. **`window.onunhandledrejection`** — catches unhandled Promise rejections
4. **Axios interceptors** — logs 5xx as `error`, unexpected 4xx as `warn`

---

## 11. Health Checks & SRE

### Endpoints

| Endpoint | Use Case | Success | Failure |
|----------|----------|---------|---------|
| `GET /health/live` | Kubernetes liveness probe | 200 `{ "status": "alive" }` | — (always 200) |
| `GET /health/ready` | Kubernetes readiness probe | 200 `{ "status": "ready" }` | 503 `{ "status": "not_ready" }` |
| `GET /health` | Dashboards, uptime monitors | 200 healthy/degraded | 503 unhealthy |

### Docker Healthcheck (Dockerfile.prod)

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health/live || exit 1
```

### SLI / SLO Targets (Reference)

| SLI | Description | Target SLO |
|-----|-------------|-----------|
| Availability | % requests returning 2xx/3xx | 99.9% |
| Latency P99 | 99th percentile response time | < 500ms |
| Error Rate | % requests returning 5xx | < 0.1% |
| Cache Hit Rate | % reads served from Redis | > 70% |
| DB Connection Pool | % time pool below max | > 90% |

### Key Metrics to Monitor

```
# Application
http_requests_total{method, path, status}
http_request_duration_ms{p50, p95, p99}
auth_login_attempts_total{result: success|failure}
cache_operations_total{operation: get|set|del, result: hit|miss}

# Database
db_pool_connections_active
db_pool_connections_idle
db_query_duration_ms{p95, p99}
db_query_errors_total

# Redis
redis_connected (0 | 1)
redis_command_errors_total
redis_keys_total (DBSIZE)

# Infrastructure
process_memory_rss_bytes
process_uptime_seconds
node_version
```

### Alert Conditions

| Alert | Condition | Severity |
|-------|-----------|----------|
| High Error Rate | 5xx rate > 1% over 5min | Critical |
| DB Connection Pool Exhausted | active_connections >= pool_max | Critical |
| Redis Unavailable | health.components.redis.status == "down" | Warning |
| High Latency | P99 > 1000ms over 5min | Warning |
| Memory Pressure | RSS > 512MB | Warning |
| App Not Ready | /health/ready returns 503 | Critical |

---

## 12. Circuit Breaker

Implemented using [Opossum](https://nodeshift.dev/opossum/) for protecting external calls.

### Configuration

| Parameter | Value | Description |
|-----------|-------|-------------|
| `timeout` | 3,000 ms | Max time for a single call |
| `errorThresholdPercentage` | 50% | Error rate to trip breaker |
| `resetTimeout` | 30,000 ms | Time in OPEN before retrying |

### State Machine

```
            errors > 50%                    resetTimeout elapsed
CLOSED ──────────────────► OPEN ──────────────────────────► HALF-OPEN
  ▲                                                              │
  │                      success                                 │
  └──────────────────────────────────────────────────────────────┘
                                       failure
                      HALF-OPEN ────────────────────► OPEN
```

### Events Logged

```
WARN  Circuit breaker OPEN: <name>       ← starts rejecting requests
INFO  Circuit breaker HALF-OPEN: <name> ← testing with one request
INFO  Circuit breaker CLOSED: <name>    ← back to normal
WARN  Circuit breaker fallback: <name>  ← fallback function executed
```

---

## 13. Frontend Architecture

### State Management

```
┌─────────────────────────────────┐
│         Server State            │  TanStack Query
│  projects, tasks, user profile  │  (cache, refetch, mutations)
└─────────────────────────────────┘
┌─────────────────────────────────┐
│         Client State            │  Zustand
│  accessToken, currentUser       │  authStore
│  sidebar open, modal state      │  uiStore
└─────────────────────────────────┘
┌─────────────────────────────────┐
│          Form State             │  React Hook Form + Zod
│  login, register, create task   │
└─────────────────────────────────┘
```

### React Query Configuration

```typescript
{
  retry: (failureCount, error) => {
    // Never retry client errors (4xx) — no point
    const status = error?.response?.status;
    if (status >= 400 && status < 500) return false;
    return failureCount < 2;  // retry server errors up to 2x
  },
  refetchOnWindowFocus: false,  // prevent surprise refetches
}
```

### Token Refresh Queue

When multiple requests get 401 simultaneously:
```
Request A ──► 401 ──► starts refresh
Request B ──► 401 ──► added to queue (waits)
Request C ──► 401 ──► added to queue (waits)
              ▼
          Refresh completes → new token
              ▼
     Queue processed → A, B, C retried with new token
```
Only one refresh request is ever in flight at a time.

### Route Structure

| Path | Component | Protection |
|------|-----------|-----------|
| `/login` | LoginPage | Public (redirect to / if authed) |
| `/register` | RegisterPage | Public |
| `/` | DashboardPage | Protected |
| `/dashboard` | DashboardPage | Protected |
| `/projects` | ProjectsPage | Protected |
| `/projects/:id` | ProjectDetailPage | Protected (Kanban view) |
| `*` | NotFoundPage | Public |

### Kanban Drag-and-Drop

Built with `@dnd-kit/core` and `@dnd-kit/sortable`:
- Each Kanban column is a droppable `SortableContext`
- Each task card is a `useSortable` item
- On drag end: if column changed → `PATCH /tasks/:id` with new `status`
- Task position is preserved with a `position` integer field

### Error Boundary

```
App
└── ErrorBoundary (catches render errors)
    ├─ renders fallback UI with errorId
    ├─ ships error to POST /api/v1/logs/client
    └─ "Try again" button resets boundary state
```

---

## 14. Infrastructure & DevOps

### Docker Images

| Image | Base | Multi-stage | Size target |
|-------|------|-------------|-------------|
| Backend (dev) | node:20-alpine | No | ~300MB |
| Backend (prod) | node:20-alpine | Yes (builder + runtime) | ~150MB |
| Frontend (dev) | node:20-alpine | No | ~400MB |
| Frontend (prod) | node:20-alpine + nginx:1.27-alpine | Yes (builder + nginx) | ~30MB |
| Nginx proxy | nginx:1.27-alpine | No | ~8MB |

### Production Backend Dockerfile (Multi-stage)

```dockerfile
# Stage 1 — Build TypeScript
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json .
COPY src ./src
RUN npm run build

# Stage 2 — Lean runtime image
FROM node:20-alpine AS runtime
RUN addgroup -g 1001 -S nodejs && adduser -S nodeapp -u 1001
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY --from=builder /app/dist ./dist
USER nodeapp           # non-root user
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health/live || exit 1
CMD ["node", "dist/server.js"]
```

### Nginx Reverse Proxy

```nginx
upstream backend  { server backend:3000;  keepalive 32; }
upstream frontend { server frontend:80; }

server {
  listen 80;
  client_max_body_size 5m;

  # API requests → Express
  location /api/ {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Connection "";         # keep-alive to upstream
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_read_timeout    30s;
    proxy_connect_timeout  5s;
  }

  # Health checks → Express
  location /health { proxy_pass http://backend; }

  # Everything else → React SPA (with SPA fallback)
  location / {
    proxy_pass http://frontend;
    error_page 404 = /index.html;
  }
}
```

### Production Resource Limits

| Service | CPU | Memory | Replicas |
|---------|-----|--------|----------|
| postgres | 0.5 | 512MB | 1 |
| redis | 0.25 | 128MB | 1 |
| backend | 0.5 | 512MB | 2 |
| frontend | 0.25 | 128MB | 1 |
| nginx | 0.25 | 64MB | 1 |

---

## 15. Local Development Setup

### Prerequisites

- Node.js 22+
- Docker Desktop
- PostgreSQL 16 (or use Docker)
- Redis 7 (or use Docker)

### Option A — Fully Local (Recommended for Development)

**1. Clone and install dependencies**
```bash
git clone https://github.com/0019-KDU/three-tier-app-devops-platform.git
cd three-tier-app-devops-platform
```

**2. Start PostgreSQL and Redis via Docker**
```bash
# Start PostgreSQL
docker compose up -d postgres

# Start Redis (separate compose file)
docker compose -f docker-compose.redis.yml up -d
```

**3. Configure backend environment**
```bash
cd backend
cp ../.env.example .env
# Edit .env — set DATABASE_URL, JWT secrets, REDIS_URL
```

**4. Run database migrations**
```bash
npm install
npm run migrate
```

**5. Start backend dev server**
```bash
npm run dev
# Runs on http://localhost:3000
# Hot-reloads on file changes via ts-node-dev
```

**6. Start frontend dev server (new terminal)**
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
# Proxies /api/* to http://localhost:3000
```

Open: [http://localhost:5173](http://localhost:5173)

---

### Option B — Full Stack via Docker Compose

```bash
# Start Redis first (separate)
docker compose -f docker-compose.redis.yml up -d

# Start everything else
docker compose up -d

# View logs
docker compose logs -f backend
```

Services:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- PostgreSQL: localhost:5432
- Redis: localhost:6379

---

### Useful Commands

```bash
# Backend
npm run dev          # start dev server with hot reload
npm run build        # compile TypeScript to dist/
npm run migrate      # run all pending migrations
npm run test         # run test suite
npm run lint         # run ESLint

# Frontend
npm run dev          # start Vite dev server
npm run build        # production build to dist/
npm run preview      # preview production build locally
npm run lint         # run ESLint

# Docker
docker compose up -d                                  # start full dev stack
docker compose -f docker-compose.redis.yml up -d      # start Redis only
docker compose down                                   # stop all services
docker compose down -v                                # stop + wipe volumes
docker compose logs -f backend                        # stream backend logs
docker compose exec postgres psql -U taskapp taskapp_dev  # DB shell
docker compose exec redis redis-cli -a redis_dev_password # Redis CLI
```

---

## 16. Environment Variables

Copy `.env.example` to `backend/.env` and fill in all required values.

### Backend Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | `development` / `production` / `test` |
| `PORT` | No | `3000` | HTTP port |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `DB_POOL_MIN` | No | `2` | Minimum DB pool connections |
| `DB_POOL_MAX` | No | `10` | Maximum DB pool connections |
| `JWT_ACCESS_SECRET` | **Yes** | — | Min 32 chars — signs access tokens |
| `JWT_REFRESH_SECRET` | **Yes** | — | Min 32 chars — signs refresh tokens |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis connection string |
| `CORS_ORIGIN` | No | `http://localhost:5173` | Allowed CORS origin |
| `BCRYPT_ROUNDS` | No | `12` | bcrypt work factor (10 in dev, 12 in prod) |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Rate limit window (15 min) |
| `RATE_LIMIT_MAX` | No | `100` | Max requests per window |

### Frontend Environment Variables (Vite)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_BASE_URL` | No | `""` (empty) | API base URL (empty = same origin via proxy) |

### Production Secrets

For production Docker Compose (`docker-compose.prod.yml`), create a root `.env` file:

```env
# Database
DB_USER=taskapp
DB_PASSWORD=<strong-password>
DB_NAME=taskapp_prod

# Redis
REDIS_PASSWORD=<strong-password>

# JWT (generate with: openssl rand -base64 48)
JWT_ACCESS_SECRET=<48-char-random-string>
JWT_REFRESH_SECRET=<48-char-random-string>

# CORS
CORS_ORIGIN=https://yourdomain.com
```

> **Never commit `.env` files with real secrets.** The `.gitignore` excludes all `.env` files. Use a secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.) in production.

---

## 17. Database Migrations

Migrations live in `backend/src/db/migrations/` and are run in filename order by `runner.ts`.

```bash
npm run migrate
```

### Migration Files

| File | Creates | Description |
|------|---------|-------------|
| `001_create_users.sql` | `users` | User accounts with roles and activity flag |
| `002_create_projects.sql` | `projects`, `project_members` | Projects + N:M membership |
| `003_create_tasks.sql` | `tasks`, `task_labels` | Task management with status/priority enums |
| `004_create_refresh_tokens.sql` | `refresh_tokens` | JWT refresh token storage |
| `005_create_indexes.sql` | indexes + triggers | Query performance + auto-updated timestamps |

### Migration Runner

The runner (`runner.ts`) tracks applied migrations in a `migrations` table and skips already-run files:

```sql
CREATE TABLE IF NOT EXISTS migrations (
  id         SERIAL PRIMARY KEY,
  filename   TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);
```

Idempotent — safe to run multiple times.

### Adding a New Migration

1. Create `backend/src/db/migrations/006_your_migration.sql`
2. Write pure SQL (DDL + DML)
3. Run `npm run migrate`
4. Migration is recorded and won't run again

---

## 18. Production Deployment

### Prerequisites

- Docker + Docker Compose on the target server
- Domain name pointed to server IP
- SSL certificates (recommend Let's Encrypt + Certbot for Nginx)

### Step 1 — Clone and Configure

```bash
git clone https://github.com/0019-KDU/three-tier-app-devops-platform.git
cd three-tier-app-devops-platform

# Create production secrets
cat > .env << 'EOF'
DB_USER=taskapp
DB_PASSWORD=<strong-password>
DB_NAME=taskapp_prod
REDIS_PASSWORD=<strong-password>
JWT_ACCESS_SECRET=<openssl rand -base64 48>
JWT_REFRESH_SECRET=<openssl rand -base64 48>
CORS_ORIGIN=https://yourdomain.com
EOF
```

### Step 2 — Build and Start

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

This starts: PostgreSQL → Redis → Backend (×2) → Frontend → Nginx

### Step 3 — Run Migrations

```bash
docker compose -f docker-compose.prod.yml exec backend node dist/db/migrations/runner.js
```

### Step 4 — Verify

```bash
# Check all containers running
docker compose -f docker-compose.prod.yml ps

# Check health
curl http://localhost/health

# Tail logs
docker compose -f docker-compose.prod.yml logs -f backend
```

### Step 5 — SSL (Nginx + Let's Encrypt)

```bash
# Install Certbot
apt install certbot python3-certbot-nginx

# Obtain certificate
certbot --nginx -d yourdomain.com

# Auto-renewal
certbot renew --dry-run
```

Then update `nginx/nginx.conf` to add SSL redirects and update `CORS_ORIGIN`.

### Scaling Backend

```bash
# Scale to 3 backend replicas
docker compose -f docker-compose.prod.yml up -d --scale backend=3
```

> Redis is used as the shared rate-limit counter store, so scaling works correctly across replicas — all instances share the same rate-limit windows.

### Rolling Updates (Zero Downtime)

```bash
# Build new image
docker compose -f docker-compose.prod.yml build backend

# Update one replica at a time (Docker Swarm or Kubernetes recommended for true zero-downtime)
docker compose -f docker-compose.prod.yml up -d --no-deps backend
```

---

## 19. Runbook & SRE Operations

### Incident Response

#### App returns 5xx errors

```bash
# 1. Check health
curl http://localhost/health | jq

# 2. Check backend logs for errors
docker compose logs --tail=100 backend | grep '"level":"error"'

# 3. Check database connectivity
docker compose exec postgres pg_isready -U taskapp

# 4. Check Redis
docker compose exec redis redis-cli -a <password> ping

# 5. Restart backend if needed
docker compose restart backend
```

#### Database Connection Pool Exhausted

Symptoms: `connection timeout` errors in logs, `connectionTimeoutMs` errors

```bash
# Check active connections
docker compose exec postgres psql -U taskapp -c \
  "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"

# Terminate idle connections
docker compose exec postgres psql -U taskapp -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity
   WHERE state = 'idle' AND query_start < NOW() - INTERVAL '10 minutes';"

# Temporarily increase pool max (restart required)
# Set DB_POOL_MAX=20 in .env, then: docker compose restart backend
```

#### Redis Unavailable

```bash
# Check Redis logs
docker compose logs redis

# Check Redis health
docker compose exec redis redis-cli -a <password> info server

# Restart Redis
docker compose restart redis

# App will degrade gracefully (no cache) — check health endpoint
curl http://localhost/health | jq '.components.redis'
```

#### Login Hanging / Very Slow

```bash
# Check backend logs for DB activity
docker compose logs --tail=50 backend

# Check if Redis is blocking (enableOfflineQueue: false should prevent this)
# Look for "Redis initial connection failed" in logs

# Verify DB is responding
docker compose exec postgres psql -U taskapp -c "SELECT 1;"

# Check for slow queries (look for "Slow query detected" in logs)
docker compose logs backend | grep "Slow query"
```

#### Rate Limit Triggered Unexpectedly

```bash
# In dev: rate limiting is disabled by default (skipInDev = true)
# Check NODE_ENV in backend .env

# Clear rate limit counters in Redis (prod)
docker compose exec redis redis-cli -a <password> --scan --pattern "rl:*" | \
  xargs docker compose exec redis redis-cli -a <password> del
```

#### High Memory Usage

```bash
# Check backend memory
docker stats taskapp_backend

# Check memory in health endpoint
curl http://localhost/health | jq '.memoryMb'

# Force garbage collection (restart — GC happens automatically but restart clears leaks)
docker compose restart backend
```

### Log Querying

```bash
# All errors in the last hour (production JSON logs)
docker compose logs backend | \
  jq -r 'select(.level == "error") | [.timestamp, .message, .requestId] | @csv'

# Failed login attempts
docker compose logs backend | \
  jq -r 'select(.message | contains("Login failed")) | [.timestamp, .email] | @tsv'

# Slow queries
docker compose logs backend | \
  jq 'select(.message == "Slow query detected") | {timestamp, durationMs, query}'

# All requests for a specific requestId (trace a full request chain)
docker compose logs backend | grep "ccf8f362-8155-4fae-8dcf-48c9856b3e21"

# 5xx error rate (last 100 http logs)
docker compose logs backend | \
  jq -r 'select(.type == "http") | .statusCode' | \
  awk '$1 >= 500 {e++} {t++} END {print e"/"t" 5xx errors"}'
```

### Backup & Restore

```bash
# Database backup
docker compose exec postgres pg_dump -U taskapp taskapp_prod > backup_$(date +%Y%m%d).sql

# Database restore
docker compose exec -T postgres psql -U taskapp taskapp_prod < backup_20250514.sql

# Redis backup (AOF or RDB)
docker compose exec redis redis-cli -a <password> bgsave
docker cp taskapp_redis:/data/dump.rdb ./redis-backup-$(date +%Y%m%d).rdb
```

### Maintenance Mode

```bash
# Update Nginx to serve 503 maintenance page
# Edit nginx/nginx.conf to return 503 for all /api routes, then:
docker compose restart nginx

# Perform DB migration, backend update, etc.

# Restore Nginx config
docker compose restart nginx
```

---

## License

MIT — see [LICENSE](LICENSE)

---

*Built with Node.js · PostgreSQL · Redis · React · Docker*
