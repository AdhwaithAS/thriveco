# Deploying THRIVE&CO to Render

This guide explains how to deploy **THRIVE&CO** (Java 21 + Spring Boot + Static Frontend + PostgreSQL) to [Render](https://render.com) using Docker.

---

## Overview

- **Runtime**: Docker Web Service (Render automatically builds the multi-stage `Dockerfile`).
- **Frontend & Backend**: Both are served together by Spring Boot on the dynamically assigned `PORT`.
- **Database**: 
  - **Neon PostgreSQL** (Recommended, free serverless PostgreSQL already pre-configured).
  - OR **Render PostgreSQL** (Render managed database).
  - OR **Embedded H2 Demo** (Zero database setup, set `SPRING_PROFILES_ACTIVE=local`).
- **Health Check Path**: `/api/health` (pre-configured lightweight endpoint).

---

## Option 1: Quick Deploy via Render Blueprint (`render.yaml`)

The repository includes a ready-to-use [`render.yaml`](./render.yaml).

1. Push your repository to **GitHub** or **GitLab**.
2. Log in to [dashboard.render.com](https://dashboard.render.com/).
3. Click **New +** → **Blueprint**.
4. Connect your repository and select the branch (e.g. `main`).
5. Render will detect `render.yaml` and prompt you for the environment variables:
   - `DB_URL`: Your Neon JDBC connection string, e.g.:
     `jdbc:postgresql://ep-xyz-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
   - `DB_USER`: Your Neon user (e.g. `neondb_owner`)
   - `DB_PASSWORD`: Your Neon password
6. Click **Apply**. Render will build and deploy the container.

---

## Option 2: Manual Setup via Render Dashboard

If you prefer setting up the Web Service manually:

### Step 1: Push Code to GitHub / GitLab
Make sure your latest commits (including `Dockerfile`, `docker-entrypoint.sh`, and `.dockerignore`) are pushed to your remote repository.

### Step 2: Create a Web Service on Render
1. Open [dashboard.render.com](https://dashboard.render.com/).
2. Click **New +** → **Web Service**.
3. Choose **Build and deploy from a Git repository** and connect your GitHub/GitLab repo.
4. Configure the settings:
   - **Name**: `thriveco` (or any name you prefer)
   - **Region**: Choose the region closest to your database (e.g., *Oregon (US West)* or *Frankfurt (EU)*)
   - **Branch**: `main`
   - **Runtime**: **Docker**
   - **Instance Type**: **Free** (or Starter/Standard)

### Step 3: Configure Environment Variables
Under the **Environment Variables** section, add:

| Key | Value / Example | Description |
|---|---|---|
| `DB_URL` | `jdbc:postgresql://<neon-pooler-host>/neondb?sslmode=require&channel_binding=require` | Pooled Neon JDBC URL |
| `DB_USER` | `neondb_owner` | Database username |
| `DB_PASSWORD` | `<your-database-password>` | Database password |

> **Tip (Zero-database offline demo)**: If you just want to test or demo the app live without creating a Neon PostgreSQL database, set:
> - `SPRING_PROFILES_ACTIVE` = `local`
>
> The app will run using its embedded in-memory H2 database with automatic seed data!

### Step 4: Configure Health Check Path
Under **Advanced**:
- **Health Check Path**: `/api/health`
- **Auto-Deploy**: Yes (re-deploys on push)

### Step 5: Deploy
Click **Create Web Service**. 

Render will:
1. Pull the repository.
2. Build the Docker image using Maven + JDK 21.
3. Package the executable JAR into a lean Alpine JRE 21 container.
4. Start the service on Render's assigned port.

Once the build is complete, your app is live at:
`https://<your-service-name>.onrender.com`

---

## Using Render PostgreSQL Instead of Neon (Alternative)

If you prefer running a PostgreSQL database managed directly inside Render:
1. On Render Dashboard, click **New +** → **PostgreSQL**.
2. Create the database (e.g. name `thriveco-db`).
3. Under your Web Service settings, connect the database or copy the **Internal Database URL**.
4. Set the environment variable:
   - `DATABASE_URL`: paste the connection string.
   
*The included `docker-entrypoint.sh` automatically converts `postgres://` or `postgresql://` into `jdbc:postgresql://` for Spring Boot.*

---

## Important Render Free-Tier Notes

1. **Spin down on inactivity (Cold Starts)**:
   Render Free instances spin down after 15 minutes of inactivity. When a new request arrives, Render wakes the container. The first load may take 30–50 seconds. Subsequent requests will be instant.

2. **Memory Limit (512 MB)**:
   The `Dockerfile` is pre-configured with:
   `-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+ExitOnOutOfMemoryError`
   This guarantees that the JVM caps its heap around ~384 MB, preventing out-of-memory container crashes on Render's 512 MB free tier.

3. **Database TLS / Channel Binding**:
   If connecting to Neon and you see a SCRAM or handshake error, remove `&channel_binding=require` from `DB_URL` and keep `?sslmode=require`.
