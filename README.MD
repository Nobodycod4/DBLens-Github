# DBLens

**DBLens** is a web-based database management and migration platform. It lets you connect to multiple databases (PostgreSQL, MySQL, SQLite, MongoDB), inspect schemas, run queries, create backups and snapshots, schedule jobs, and move or sync data between databases—all through a single UI with support for teams and organizations.

**UI:** 100% vibecoded  
**Backend:** 25% vibecoded  
**Overall:** ~65% vibecoded  
**LLM Used:** opus 4.5

---

## What it does

- **Multi-database support** — Add and manage connections to PostgreSQL, MySQL, SQLite, and MongoDB. Switch between them from one dashboard.
- **Schema viewer & diagram** — Browse tables, columns, and relationships; view an interactive schema diagram for any connected database.
- **Query editor** — Run ad-hoc SQL (or NoSQL) against your databases with result grids and basic execution feedback.
- **Backups & snapshots** — Create on-demand backups and point-in-time snapshots. Restore or use snapshots as sources for migrations.
- **Scheduled jobs** — Set up backup schedules and recurring tasks so critical data is protected without manual runs.
- **Migrations** — Move or sync schema and data between databases (e.g. dev → staging, or across different engine types). Supports full and incremental flows, with options for dry runs and rollback.
- **Audit logs** — See who did what and when: connection changes, backups, migrations, and other important actions.
- **Monitoring & performance** — Monitor database and app health, and inspect performance-related metrics from the UI.
- **Organizations & roles** — Organize users and connections by organization; use role-based access (e.g. Admin, Super Admin) to control what users can do.
- **Auth & security** — Sign up, log in, password reset; JWT-based API auth and optional hardening (rate limits, security headers).

---

## Tech stack

- **Frontend:** React (Vite), React Router, Tailwind CSS, Chart.js, React Flow (for schema diagram), Axios, React Hot Toast.
- **Backend:** FastAPI (Python 3.9+), SQLAlchemy (async), Alembic for migrations. API routes for auth, databases, backups, schedules, snapshots, migrations, audit logs, organizations, roles, health, and app settings.
- **Metadata store:** PostgreSQL is used to store DBLens’ own data (users, connections, backup/snapshot/migration metadata, audit logs). Your connected databases (MySQL, SQLite, MongoDB, etc.) are not modified except by your own actions (queries, backups, migrations).

---

## Prerequisites

- **Node.js** (LTS) — for building and running the frontend.
- **Python 3.9+** — for running the backend.
- **PostgreSQL** — one instance for DBLens metadata (users, connections, job history, etc.). Your other databases (MySQL, SQLite, MongoDB) are optional and only needed when you add connections to them.

---

## Quick start

### 1. Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env`: set PostgreSQL URL for DBLens metadata (`DATABASE_*`), `JWT_SECRET_KEY`, and any other options (see `.env.example`).

```bash
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Optional (first-time DB setup):  
`alembic upgrade head`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** (or the URL Vite prints). Sign up or log in, then add a database connection from the UI.

### 3. Single-command build (optional)

To build the frontend and serve it from the backend (e.g. for production), see **[BUILD.md](BUILD.md)**.

---

## Project layout

| Path | Description |
|------|-------------|
| `backend/` | FastAPI app: API routes, models, migrations (Alembic), DB connectors, backup/snapshot/migration logic, auth, org/role helpers. |
| `backend/app/api/routes/` | Route modules: auth, databases, audit_logs, health, backups, backup_schedules, snapshots, migrations, roles, organizations, app_settings. |
| `backend/app/utils/` | Core logic: database_connector, schema_inspector, query_executor, backup_manager, snapshot_manager, migration_engine, org_scope, etc. |
| `frontend/src/` | React app: pages (Dashboard, Connections, Schema, Query, Backups, Schedules, Migration, Snapshots, Audit logs, Monitoring, Settings, Roles, etc.), components, context, services. |
| `frontend/src/pages/` | Main screens: Dashboard, Connections, SchemaViewer, SchemaDiagram, QueryEditor, Backups, Schedules, Migration, Snapshots, AuditLogs, Monitoring, PerformanceAndHealth, RoleManagement, Documentation, ConnectionPool, Teams, Profile, plus Login, Signup, ForgotPassword, Setup. |
| `.github/workflows/` | CI workflow (e.g. backend tests on push/PR). |

---

## Features in brief

- **Connections** — Add and test PostgreSQL, MySQL, SQLite, MongoDB; credentials stored securely; optional per-connection encryption for backup data.
- **Schema** — List tables/columns, view ER-style diagram (React Flow).
- **Query** — Execute SQL (or NoSQL) and view results; supports multiple connections.
- **Backups** — On-demand dumps (e.g. pg_dump, mysqldump, sqlite3, mongodump); optional compression; list and restore.
- **Schedules** — Cron-like backup schedules; history and status in the UI.
- **Snapshots** — Point-in-time snapshots used for migration source or rollback.
- **Migrations** — Configure source/target, options, and run full or incremental migrations; view logs and rollback when supported.
- **Audit logs** — Filter by user, connection, action, date.
- **Organizations** — Switch context by org; data (connections, backups, migrations, etc.) is scoped per organization.
- **Roles** — Role-based permissions (e.g. Super Admin, Admin) for access control.

---

## License

See **[LICENSE](LICENSE)**. This project uses the PolyForm Small Business License 1.0.0 with additional restrictions (no modification or redistribution without permission; revenue threshold for commercial use).
