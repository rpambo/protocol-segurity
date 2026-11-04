# Spirit Embassy backend

Go modular-monolith foundation for the Protocol & Security platform. PostgreSQL is the source of truth; Redis provides shared login rate limiting. Docker Compose runs the local API, PostgreSQL, Redis, and migrations. GopherSocial is an architectural reference, not a source of code to copy blindly.

## Requirements

- Go 1.24+
- PostgreSQL 14+
- Redis 7+
- Docker Engine with Docker Compose v2 (for the containerized local environment)

## Configure

Copy `.env.example` to `.env` and replace the local-only database and Redis passwords. Do not use the example values outside local development. The API reads environment variables directly.

Required:

- `DATABASE_URL`
- `REDIS_URL` (`redis://` or `rediss://`); Redis is required for distributed login rate limiting, with no in-memory fallback.
- `JWT_SIGNING_KEY` for the API, as base64-encoded random data of at least 32 bytes. Keep the same secret across API instances and restarts; store it in a secret manager and never commit it.

In production, use a TLS-enabled database URL; the application rejects `sslmode=disable`.

Optional:

- `APP_ENV` (`development`, `test`, `staging`, `production`)
- `HTTP_ADDR` (default `:8080`)
- `CORS_ALLOWED_ORIGINS` (comma-separated exact origins; wildcard is rejected)
- HTTP timeout and PostgreSQL pool settings documented in `.env.example`

## Run with Docker Compose

From the repository root, copy `backend/.env.example` to `backend/.env`, replace the local-only passwords with random alphanumeric values, and set a random JWT signing key. Then start the full local stack:

```powershell
Copy-Item backend/.env.example backend/.env
$random = [Security.Cryptography.RandomNumberGenerator]::Create()
function New-Secret([int]$length) {
    $bytes = New-Object byte[] $length
    $random.GetBytes($bytes)
    return [BitConverter]::ToString($bytes).Replace('-', '')
}
$keyBytes = New-Object byte[] 32
$random.GetBytes($keyBytes)
$key = [Convert]::ToBase64String($keyBytes)
$postgresPassword = New-Secret 24
$redisPassword = New-Secret 24
$random.Dispose()
$content = Get-Content backend/.env
$content = $content -replace '^JWT_SIGNING_KEY=.*$', "JWT_SIGNING_KEY=$key"
$content = $content -replace '^POSTGRES_PASSWORD=.*$', "POSTGRES_PASSWORD=$postgresPassword"
$content = $content -replace '^REDIS_PASSWORD=.*$', "REDIS_PASSWORD=$redisPassword"
$content = $content -replace '^REDIS_URL=.*$', "REDIS_URL=redis://:$redisPassword@localhost:6379/0"
Set-Content backend/.env $content
docker compose -f backend/compose.yaml --env-file backend/.env up --build -d
```

The Compose stack exposes the API at `http://localhost:8080`, PostgreSQL at `localhost:5432`, and Redis at `localhost:6379`, all bound to loopback. PostgreSQL and Redis data persist in named volumes. The migration service runs before the API starts. The Redis-backed limiter allows up to 10 attempts per account and 40 per client IP in a 15-minute window; a successful login resets that account's counter. Throttled requests receive `429` and `Retry-After`. Redis outages fail closed for login and mark readiness as unavailable.

Open the interactive API documentation at `http://localhost:8080/swagger`; the OpenAPI 3.1 specification is served at `http://localhost:8080/openapi.yaml`. The Swagger UI uses a pinned Swagger UI CDN release, so its interface needs internet access; API requests and the specification remain served by the backend.

To create the initial Global Admin, securely set `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_NAME`, and `BOOTSTRAP_ADMIN_PASSWORD` in the shell, then run `docker compose -f backend/compose.yaml --env-file backend/.env --profile bootstrap run --rm bootstrap-admin`. Do not save the admin password in `.env`; clear those shell variables after the command. The bootstrap command refuses to run after an account already exists.

Stop the local stack with `docker compose -f backend/compose.yaml --env-file backend/.env down`. To preserve local data, do not add `-v`.

## Run without Docker

Apply the embedded, versioned schema migrations:

```powershell
$env:DATABASE_URL = "postgres://USER:PASSWORD@localhost:5432/spirit_embassy?sslmode=disable"
$env:REDIS_URL = "redis://:PASSWORD@localhost:6379/0"
go run ./cmd/migrate
```

Before starting the API locally, create a signing key in PowerShell and keep it only in the current process environment:

```powershell
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
$keyBytes = New-Object byte[] 32
$rng.GetBytes($keyBytes)
$env:JWT_SIGNING_KEY = [Convert]::ToBase64String($keyBytes)
$rng.Dispose()
```

In deployed environments, inject `JWT_SIGNING_KEY` from a secret manager instead of generating a new value at every startup.
Also provide `REDIS_URL` pointing to the shared Redis instance; do not use the local unauthenticated default in production.

Start the API:

```powershell
go run ./cmd/api
```

Create the first Global Admin exactly once, before any other account exists. Supply credentials through the process environment or a secret manager; never put the password in source control or command history:

```powershell
$env:DATABASE_URL = "postgres://USER:PASSWORD@localhost:5432/spirit_embassy?sslmode=disable"
$env:BOOTSTRAP_ADMIN_EMAIL = "admin@example.org"
$env:BOOTSTRAP_ADMIN_NAME = "Initial Global Admin"
$securePassword = Read-Host "Initial Admin password" -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
    $env:BOOTSTRAP_ADMIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    go run ./cmd/bootstrap-admin
} finally {
    Remove-Item Env:BOOTSTRAP_ADMIN_PASSWORD -ErrorAction SilentlyContinue
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    $securePassword.Dispose()
}
```

The password is converted to a process environment string only while the bootstrap command runs; do not print it or pass it as a command-line argument. Use a secret manager in deployed environments. The command refuses to run after the first account exists and stores an Argon2id password hash. Passwords must be between 12 and 1024 bytes.

Endpoints:

- `GET /health/live` — process liveness, independent of PostgreSQL.
- `GET /health/ready` — readiness; returns `503` if PostgreSQL or Redis is unavailable.
- `/api/v1/health/live` and `/api/v1/health/ready` — versioned aliases.
- `POST /api/v1/auth/login` — return a short-lived JWT access token and set a rotating refresh token in an HttpOnly cookie; returns `429` with `Retry-After` when Redis limits are reached.
- `POST /api/v1/auth/refresh` — validate and rotate the refresh cookie; requires the current `X-CSRF-Token`.
- `GET /api/v1/auth/me` — return the authenticated account; requires an `Authorization` header with a Bearer access token.
- `POST /api/v1/auth/logout` — revoke the refresh session and clear its cookie; requires the refresh cookie and current `X-CSRF-Token`.
- Login attempts are rate limited using Redis. The API returns `503` rather than silently bypassing the limiter if Redis is unavailable.

Access tokens expire after 15 minutes. Refresh tokens expire after 30 days, are stored only as hashes, and rotate on each refresh. Tokens are validated for the HS256 signature, issuer, audience, `exp`, `nbf`, and active database session. Keep access JWTs in frontend memory, not browser local storage; use `credentials: include` for refresh-cookie requests and the latest `csrfToken` from login/refresh as `X-CSRF-Token`.

## Validate

```powershell
gofmt -w ./cmd ./internal
go vet ./...
go test ./...
go test -race ./...
```

## Current implementation boundary

This is the backend foundation, not a completed production backend. It currently provides configuration validation, Docker Compose for API/PostgreSQL/Redis, PostgreSQL pooling, an embedded migration runner, initial organization/account/role/session/audit/notification schema, API middleware, health endpoints, Redis-backed distributed login rate limiting, password hashing, short-lived JWT access tokens, rotating database-backed refresh tokens, CSRF validation, first Global Admin bootstrap, and tests.

Invitation/email delivery, role/scope authorization middleware, account APIs, chat, help requests, notification delivery, protocols, media uploads, and Angular integration are not implemented yet. Do not enter real member data until all required modules and server-side authorization are implemented and tested. The initial SQL schema is versioned and must be evolved through new migrations rather than manual production edits.
