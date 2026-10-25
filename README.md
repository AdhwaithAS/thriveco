# THRIVE&CO — Healthcare Resource Management System

A full-stack healthcare resource management platform for hospitals, pharmacies and blood banks.
Originally a JavaScript/localStorage prototype, now rebuilt with a **Java 21 + Spring Boot REST backend**
and a **plain HTML/CSS/JavaScript frontend**, with **Neon (PostgreSQL)** for persistence.

**Marian College of Engineering — B.Tech CSE Project 2026–2027**
Team: Nidha Nafeer, Harinandana K, Asher Satyadas, Suryanarayanan SD

---

## What changed from the JavaScript version

| Before | Now |
|---|---|
| `server.js` (Express, routes were missing) | Spring Boot REST API with full CRUD |
| `store.js` + browser `localStorage` | Neon PostgreSQL via Spring Data JPA |
| `data.js` seed in the browser | No automatic demo data; tests use a test-only fixture |
| Alerts calculated in the browser | Alert engine on the Java backend |
| API Explorer showed fake data | API Explorer calls the real endpoints |

The original JavaScript files are preserved in `legacy-nodejs/` for reference.

---

## Features

- **Dashboard** — facility count, medicine units, blood units, alert totals, ICU/emergency beds.
- **Emergency Resource Search** — search medicines and blood across every connected facility, filter by blood group, direct-call confirmation modal.
- **Pharmacy Inventory** — search/filter, add, update and delete medicine stock with reorder thresholds.
- **Blood Bank Ledger** — ABO/Rh matrix, component tracking, status derived automatically from quantity.
- **Hospital Resources** — beds, ventilators, oxygen cylinders and monitors with occupancy bars.
- **Automated Low-Stock Alerts** — recalculated live from current stock (`TC-07`, `TC-08`, Section 5.5).
- **Facilities Directory** — connected hospitals, pharmacies and blood banks.
- **API & Schema Explorer** — live JSON viewer for the REST API.
- **Sign-in with real roles (RBAC)** — every role signs in with username + password; write
  permissions are enforced on the server, not just hidden in the UI.
- **Polished frontend** — inline SVG icon set (no emoji characters), loading skeletons,
  toast feedback, empty states and styled confirmation dialogs.

---

## Requirements

- **Java 21** (check with `java -version`)
- Internet access on first run (Maven downloads dependencies)
- A Neon PostgreSQL database (free tier is fine) — or use the local H2 profile

Maven itself is **not** required: the project includes the Maven wrapper (`mvnw`).

---

## Quick start (launcher scripts)

The repository includes one-command launchers that build the JAR when needed and start
the server. They use Java from your `PATH`, so no manual Maven setup is required.

**Linux / macOS**

```bash
./run.sh              # Neon PostgreSQL (reads .env)
./run.sh local        # embedded H2, no cloud database needed
./run.sh --open       # start and open the browser
./run.sh build        # build the JAR only
./run.sh test         # run the integration tests
./run.sh stop         # stop a running server
```

**Windows**

```bat
run.bat               :: Neon PostgreSQL (reads .env)
run.bat local         :: embedded H2, no cloud database needed
run.bat --open        :: start and open the browser
run.bat build         :: build the JAR only
run.bat test          :: run the integration tests
run.bat stop          :: stop a running server
```

The first run downloads Maven dependencies and compiles the project. After that, startup
is quick. If you change Java sources, the script rebuilds automatically. The launcher
also auto-detects a JDK 21 installation from `JAVA_HOME`, your `PATH`, `/usr/lib/jvm`,
SDKMAN, asdf/mise and Homebrew, so Java does not have to be on `PATH`.

---

## 1. Neon PostgreSQL setup

1. Create a project at [neon.tech](https://neon.tech).
2. Open the project dashboard and click **Connection Details**.
3. Copy the **pooled** connection string (its host contains `-pooler`). It looks like:

   ```text
   postgresql://<user>:<password>@<host>-pooler.<region>.aws.neon.tech/neondb?sslmode=require
   ```

4. In the repository root, copy `.env.example` to `.env`:

   ```bash
   cp .env.example .env
   ```

5. Fill in your values:

   ```env
   PORT=8080
   DB_URL=jdbc:postgresql://<host>-pooler.<region>.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   DB_USER=neondb_owner
   DB_PASSWORD=your-real-password
   AUTH_SECRET=change-me-to-a-long-random-string
   DEMO_USER_PASSWORD=thrive123
   ```

   - Keep the `jdbc:` prefix.
   - Keep `sslmode=require`.
   - `channel_binding=require` works with the PostgreSQL JDBC driver and Neon.
     Remove it only if your network cannot negotiate SCRAM channel binding.
   - `AUTH_SECRET` signs the login tokens (HMAC-SHA256). Use a long random
     string and keep it private; rotating it signs everyone out.
   - `DEMO_USER_PASSWORD` is the default password used when demo accounts are
     seeded or when existing accounts have no password hash yet.

6. Run the application:

   ```bash
   ./run.sh
   ```

   On Windows:

   ```bat
   run.bat
   ```

   Or, without the launcher:

   ```bash
   ./mvnw spring-boot:run
   ```

7. Open **http://localhost:8080**.

On first startup Hibernate creates the tables automatically. The application does **not**
insert demo data, so an empty database stays empty and existing rows are preserved.

> **Security note:** `.env` is git-ignored. Never commit your Neon password.
> The `neondb_owner` role has full access to the database, so keep the backend on a
> trusted machine/server.

---

## 2. Local H2 database without a cloud database (recommended for quick testing/viva)

The project includes an embedded H2 database. This runs with zero external setup:

```bash
./run.sh local
```

On Windows:

```bat
run.bat local
```

Or, without the launcher:

```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

- App: <http://localhost:8080>
- H2 console: <http://localhost:8080/h2-console>
  - JDBC URL: `jdbc:h2:file:./data/thriveco`
  - User: `sa`, password: empty

The local database file is created under `data/` and is git-ignored.
Delete the `data/` folder to start fresh. The local database starts empty — add facilities,
medicines, blood stock and hospital resources through the UI or API. No demo rows are inserted.

---

## 3. Build a runnable JAR

```bash
./mvnw clean package
java -jar target/thriveco-1.0.0.jar
```

To force the local profile from a JAR:

```bash
java -jar target/thriveco-1.0.0.jar --spring.profiles.active=local
```

---

## REST API

Base URL: `http://localhost:8080/api`

All endpoints except `GET /health` and the auth endpoints require a signed-in
session: send the token returned by `/auth/login` in the `X-Auth-Token` header
(see [Access control (RBAC)](#access-control-rbac) below).

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Service heartbeat (public) |
| POST | `/auth/login` | Sign in, returns a session token (public) |
| GET | `/auth/me` | Current signed-in user |
| GET | `/auth/accounts` | Demo accounts for the sign-in screen (public) |
| POST | `/auth/logout` | Invalidate the current token |
| GET | `/dashboard/metrics` | Dashboard card values |
| GET | `/facilities` | List connected facilities |
| GET | `/facilities/{facilityId}` | One facility |
| POST | `/facilities` | Connect a new facility |
| GET | `/medicines?name=&facilityId=&lowStockOnly=` | Filtered medicine list |
| GET | `/medicines/{medicineId}` | One medicine |
| POST | `/medicines` | Add medicine stock |
| PUT | `/medicines/{medicineId}` | Update medicine stock |
| DELETE | `/medicines/{medicineId}` | Delete medicine record |
| GET | `/blood-stock?group=&facilityId=&status=` | Filtered blood ledger |
| GET | `/blood-stock/{recordId}` | One blood record |
| POST | `/blood-stock` | Record blood units |
| PUT | `/blood-stock/{recordId}` | Update blood units |
| DELETE | `/blood-stock/{recordId}` | Delete blood record |
| GET | `/hospital-resources?facilityId=&category=` | Hospital assets |
| GET | `/hospital-resources/{resourceId}` | One asset |
| POST | `/hospital-resources` | Add hospital asset |
| PUT | `/hospital-resources/{resourceId}` | Adjust capacity |
| DELETE | `/hospital-resources/{resourceId}` | Delete asset |
| GET | `/alerts?severity=&resourceType=` | Live computed alerts |
| GET | `/emergency/search?type=all&query=&bloodGroup=` | Multi-facility search (Section 5.4) |
| GET | `/users` | Application role accounts |

### Sample requests

```bash
# Public heartbeat
curl http://localhost:8080/api/health

# Sign in and capture the token
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"USR004","password":"thrive123"}' | sed 's/.*"token":"\([^"]*\)".*/\1/')

# Authenticated reads carry the session header
curl -H "X-Auth-Token: $TOKEN" http://localhost:8080/api/dashboard/metrics
curl -H "X-Auth-Token: $TOKEN" "http://localhost:8080/api/emergency/search?type=blood&bloodGroup=O-"

# Authenticated writes — System Admin may write to every resource
curl -X POST http://localhost:8080/api/medicines \
  -H "X-Auth-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"medicineName":"Test Medicine","facilityId":"FAC001","category":"Antibiotics","quantity":40,"unit":"Vials","reorderLevel":20}'

# Pharmacy Staff (USR002) may manage medicines but gets 403 on anything else
curl -X POST http://localhost:8080/api/facilities \
  -H "X-Auth-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"facilityName":"Test","address":"Somewhere"}'
```

Without a valid token, protected endpoints answer `401 Unauthorized`; with a
token belonging to a role that cannot write the resource, writes answer
`403 Forbidden`. On `401`, `WebApi` in the frontend drops the stored session and
shows the sign-in screen again.

Validation rules (mirrored by the UI):

- Medicine name required, quantity and reorder level must be `>= 0`.
- Blood quantity must be `>= 0`; status is derived: `<=2` Critical Alert, `<=5` Low Stock, else Available.
- Available hospital capacity cannot exceed total capacity.
- Unknown facility IDs are rejected with `400`.

Errors return a consistent JSON body:

```json
{
  "timestamp": "2026-10-25T18:30:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Quantity cannot be negative",
  "path": "/api/medicines"
}
```

---

## Access control (RBAC)

The application implements role-based access control end to end: a password
sign-in on the server, signed session tokens, and per-resource write rules
enforced by an interceptor before any handler runs.

### Demo accounts

On startup seeder (`DemoUserSeeder`) makes sure the five team accounts exist and
can sign in. If a database already contains these users without password hashes
(as the Neon database did), the seeder sets the default password for them
without touching their names, roles or other data. Existing password hashes are
never altered.

| User ID | Name | Role | May write |
|---|---|---|---|
| `USR001` | Nidha Nafeer | Hospital Staff | Hospital resources |
| `USR002` | Harinandana K | Pharmacy Staff | Medicines |
| `USR003` | Asher Satyadas | Blood Bank Officer | Blood stock |
| `USR004` | Suryanarayanan SD | System Admin | Everything (facilities, medicines, blood, hospital resources) |
| `USR005` | Emergency Search | Emergency Search User | Nothing (read-only) |

Default password for all demo accounts: `thrive123` (configurable via
`DEMO_USER_PASSWORD` in `.env`). Every role may read all data once signed in.

The current canonical list is also served publicly by `GET /api/auth/accounts`,
which is what fills the user list on the sign-in screen.

### How tokens work

- `POST /api/auth/login` verifies the password (PBKDF2 hash) and returns a
  token: `base64url(userId|expiry)` + HMAC-SHA256 signature, 12-hour lifetime.
- Clients send the token in the `X-Auth-Token` header on every protected call.
- `WebConfig` registers `AuthInterceptor`, which rejects missing/invalid/expired
  tokens with `401`, then `AccessPolicy` rejects writes outside the role's
  permissions with `403`. Read endpoints stay open to every signed-in role.
- `/api/health`, `/api/auth/login`, `/api/auth/accounts` and `OPTIONS`
  preflights are public.
- `POST /api/auth/logout` drops the token from the in-store list so it cannot be
  reused before expiry.

> **Security note:** This is a stateless demo token scheme, not a full
> Spring Security setup. For a production deployment move to Spring Security +
> JWT (or Neon Auth) — see Academic notes.

### Frontend behaviour

- `api.js` stores the session in `localStorage` (`thriveco.session`) and adds
  `X-Auth-Token` automatically. On `401` it clears the session, dispatches
  `thriveco:session-expired`, and the app returns to the sign-in screen.
- Write buttons (add / update / delete, alert restock) only render for roles
  that may write the resource; the server enforces the same rules.
- The signed-in user chip in the header opens a menu with role, sign-out and
  (for demo purposes) quick-account switching.

---

## Project structure

```
.
├── pom.xml
├── mvnw / mvnw.cmd
├── run.sh / run.bat               # one-command launchers (build + start)
├── .env.example
├── legacy-nodejs/                 # original JavaScript prototype (reference only)
├── src/test                       # integration tests (H2, in-memory)
└── src/main
    ├── java/com/marian/thriveco
    │   ├── ThriveCoApplication.java
    │   ├── config/                # CORS, error handling, auth interceptor, RBAC policy, demo-user seeder
    │   ├── controller/            # REST endpoints (incl. /api/auth/*)
    │   ├── dto/                   # request/response records
    │   ├── model/                 # JPA entities
    │   ├── repository/            # Spring Data repositories
    │   ├── service/               # business logic, alerts, auth session management
    │   └── util/                  # ID + timestamp + password hashing helpers
    └── resources
        ├── application.properties
        ├── application-neon.properties
        ├── application-local.properties
        └── static/                # HTML frontend served by Spring Boot
            ├── index.html
            ├── style.css
            ├── api.js             # fetch() wrapper with the session token
            ├── app.js             # UI controller
            └── icons.js           # inline SVG icon library
```

The integration tests use a test-only fixture (`src/test/resources/seed-data.json`) so they
can assert deterministic stock and alert counts without affecting the application database.

---

## How the alert engine works (Section 5.5)

Alerts are computed on every request from the current database state — they are never stale:

| Resource | Warning condition | Critical condition |
|---|---|---|
| Medicine | `quantity <= reorderLevel` | `quantity <= reorderLevel / 2` |
| Blood | `quantity <= 5` units | `quantity <= 2` units or status `Critical Alert` |
| Hospital asset | `availableQuantity <= reorderLevel` | `availableQuantity <= 2` |

Alert IDs are generated in the form `ALT-MED-001`, `ALT-BLD-002`, etc.

---

## Hosting on Render

The project is fully prepared for containerized deployment on **Render** (Web Service with Docker runtime):

- **Dockerfile**: Multi-stage build with Eclipse Temurin JDK 21 and lean JRE 21 Alpine image.
- **Render Blueprint**: [`render.yaml`](./render.yaml) for 1-click blueprint deployment.
- **Memory optimization**: JVM options configured for Render's 512 MB Free tier (`-XX:MaxRAMPercentage=75.0`).
- **Health check**: `/api/health` heartbeat endpoint configured for zero-downtime deployment.
- **Database compatibility**: Auto-translates connection strings for Neon PostgreSQL, Render Managed PostgreSQL, or standalone demo mode (`SPRING_PROFILES_ACTIVE=local`).

See the complete step-by-step instructions in [**`RENDER_DEPLOYMENT.md`**](./RENDER_DEPLOYMENT.md).

---

## Troubleshooting

**`Cannot reach the Thrive&Co backend` in the UI**
Start the Spring Boot server and open the app through `http://localhost:8080`, not by double-clicking `index.html`.

**401 Unauthorized on API calls in curl or the UI**
The endpoint requires a session. Sign in with
`POST /api/auth/login` and send the returned value in the
`X-Auth-Token` header, or just use the UI (it handles the header for you).
If tokens stop working without reason, someone changed `AUTH_SECRET` in `.env` —
restarting with the original value restores sessions.

**Demo accounts rejected / password forgotten**
`DemoUserSeeder` restores the default password (`DEMO_USER_PASSWORD` in `.env`,
by default `thrive123`) only for accounts whose password hash is missing. If a
hash exists with a different password, set the row's `password_hash` to `NULL`
in the database, restart the app, and the seeder will set the default password.

**Neon connection timeout / `UnknownHostException`**
Use the **pooled** connection string from the Neon dashboard (the host contains `-pooler`).
Ensure the JDBC URL starts with `jdbc:postgresql://`, includes `sslmode=require`, and that
the Neon project is active (free-tier projects can be suspended when idle).

**`password authentication failed`**
Double-check `DB_USER` and `DB_PASSWORD` against **Connection Details** in Neon. Use the
`neondb_owner` role (or the role shown in the connection string) and copy the password exactly.
If the password contains special characters, keep it in `DB_PASSWORD` rather than embedding it
in the JDBC URL.

**TLS / channel binding error**
Keep `sslmode=require` and remove `&channel_binding=require` from `DB_URL`. The connection is
still encrypted; channel binding is an additional SCRAM security feature.

**Tables are not created**
Make sure the database user has DDL permissions (the Neon `neondb_owner` role does) and that
`spring.jpa.hibernate.ddl-auto=update` is active in the Neon profile.

**Port already in use**
Change `PORT` in `.env`, then run `./run.sh` again. Without the launcher, use
`./mvnw spring-boot:run -Dspring-boot.run.arguments=--server.port=9090`.

---

## Academic notes

- The backend follows a layered architecture: **Controller → Service → Repository → Entity**.
- Alerts are a derived view, not a stored collection, so they cannot drift from inventory.
- The browser never sees database credentials; all Neon access goes through the Java API.
- Authentication and RBAC run on the server: passwords are PBKDF2-hashed, sessions are
  HMAC-signed tokens, and an interceptor enforces per-role write rules before handlers run.
  The frontend only *hides* what the server will not allow — it never *grants* anything.
- For production-grade deployments, swap the demo token scheme for Spring Security + JWT
  (or Neon Auth, the managed OAuth equivalent) and individuate each account's password.
