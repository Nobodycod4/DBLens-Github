# DBLens – Executable / production build

This guide explains how to build DBLens so the backend serves the frontend and how to create a runnable executable (PyInstaller).

## Prerequisites

- **Node.js** (for frontend build)
- **Python 3.9+** with backend dependencies
- **PostgreSQL** running (DBLens metadata database)

## 1. One-command build and run

### macOS / Linux

```bash
chmod +x build.sh
./build.sh run
```

- Builds the React frontend (`npm run build`).
- Copies `frontend/dist` → `backend/static`.
- Starts the server with `STATIC_DIR=static` so the app is served at `http://localhost:8000`.

### Windows

```cmd
build.bat run
```

Same steps as above on Windows.

## 2. Build only (no run)

- **macOS/Linux:** `./build.sh`
- **Windows:** `build.bat`

Then start the backend yourself from `backend/` with `STATIC_DIR` set:

```bash
cd backend
export STATIC_DIR=static   # or set in .env
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## 3. Environment for production

In `backend/` (or `.env`):

- `STATIC_DIR=static` – so the app serves the built frontend from `backend/static`.
- `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME` – PostgreSQL for DBLens metadata.
- `JWT_SECRET_KEY` – set a strong secret in production.

After building, open: **http://localhost:8000** (no separate frontend dev server).

## 4. PyInstaller executable (optional)

To package the backend into a single executable that runs the server:

```bash
cd backend
pip install pyinstaller
pyinstaller dblens.spec
```

The executable will be in `backend/dist/dblens/` (or `dist/dblens.exe` on Windows). Run it; it starts the server. You still need:

- PostgreSQL running and configured (e.g. via `.env` next to the executable).
- A pre-built `static` folder (run `../build.sh` or `build.bat` once) and either:
  - Copy `backend/static` next to the executable, or
  - Set `STATIC_DIR` to the path of that folder.

**Note:** The executable only runs the backend. It does not bundle PostgreSQL or the frontend; you must build the frontend and set `STATIC_DIR` (or ship the `static` folder) as above.

## 5. Summary

| Goal                    | Command / step                                      |
|-------------------------|-----------------------------------------------------|
| Build + run in one go   | `./build.sh run` or `build.bat run`                 |
| Build only              | `./build.sh` or `build.bat`                         |
| Run after build         | From `backend/`: `STATIC_DIR=static uvicorn app.main:app --host 0.0.0.0 --port 8000` |
| Standalone executable  | `cd backend && pyinstaller dblens.spec` (see §4)     |
