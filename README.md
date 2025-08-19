# CRM Socket Service

## Events

- `auth:login` → `auth:ok` / `auth:error`
- `lists:bootstrap` → `lists:data` / `lists:error`
- `tasks:create` → `tasks:created` / `tasks:error`
- `tasks:listToday` → `tasks:list` / `tasks:error`

## Local Development

1. Copy `backend/.env.example` to `backend/.env` and set values.
2. Run `docker-compose up` to start MongoDB, Redis, backend (port 4000) and frontend (port 5173).
3. Seed demo data: `npm run seed --workspace backend`.

## Cache

- Redis keys `lists:*` cache branches, departments and teams for 600s.

## Security

- JWTs expire after 1h; rotate secrets regularly.
- Socket connections allowed from origins in `CORS_ORIGINS` env.
- Rooms follow `user:{userId}`, `branch:{branchId}`, `department:{departmentId}`, `team:{teamId}`, `lead:{teamLeadId}`, `role:{role}`.
- Server projects whitelisted fields only and enforces deny-by-default RBAC.

## Observability

- Metrics exposed at `/metrics`; summary printed on shutdown.

## Task 1 Acceptance Checklist

- Jest + ts-jest configuration
- Env template coverage
- Server bootstrap with Mongo + Redis
- Tasks events with rate limiting
- Lists bootstrap caching
- Authentication flow with room joins
- Audit logging and metrics
