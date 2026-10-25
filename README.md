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
- **Role switcher** — hides admin actions for the Emergency Search User role.

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
   ```

   - Keep the `jdbc:` prefix.
   - Keep `sslmode=require`.
   - `channel_binding=require` works with the PostgreSQL JDBC driver and Neon.
     Remove it only if your network cannot negotiate SCRAM channel binding.

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

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Service heartbeat |
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
curl http://localhost:8080/api/health
curl http://localhost:8080/api/dashboard/metrics
curl "http://localhost:8080/api/emergency/search?type=blood&bloodGroup=O-"
curl -X POST http://localhost:8080/api/medicines \
  -H "Content-Type: application/json" \
  -d '{"medicineName":"Test Medicine","facilityId":"FAC001","category":"Antibiotics","quantity":40,"unit":"Vials","reorderLevel":20}'
```

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
    │   ├── config/                # CORS, error handling
    │   ├── controller/            # REST endpoints
    │   ├── dto/                   # request/response records
    │   ├── model/                 # JPA entities
    │   ├── repository/            # Spring Data repositories
    │   ├── service/               # business logic, alerts
    │   └── util/                  # ID + timestamp helpers
    └── resources
        ├── application.properties
        ├── application-neon.properties
        ├── application-local.properties
        └── static/                # HTML frontend served by Spring Boot
            ├── index.html
            ├── style.css
            ├── api.js             # fetch() wrapper
            └── app.js             # UI controller
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

## Troubleshooting

**`Cannot reach the Thrive&Co backend` in the UI**
Start the Spring Boot server and open the app through `http://localhost:8080`, not by double-clicking `index.html`.

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
- Authentication is intentionally out of scope for this prototype; roles are a UI demonstration.
  For a production version, add Spring Security + JWT (or Neon Auth).
