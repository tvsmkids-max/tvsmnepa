# TVSMNEPA School Attendance Management System

An attendance and school-record management web application for Thakur Virendra
Singh Memorial School, Nepanagar. This guide is for someone who has just cloned
the project and wants to run it locally.

## Purpose

The system gives school administrators and teachers one place to manage school
records and daily attendance. It is intended to reduce manual attendance
tracking and make it easier to review attendance and produce reports.

## What it includes

- Sign-in for administrator and teacher accounts
- Student, class, and teacher management
- Academic-session and school settings management
- Daily attendance marking and attendance reports
- Analytics dashboard
- Excel import/export and PDF reports
- A progressive web app (PWA) frontend

## Technology

- **Frontend:** React 19, Vite, Material UI
- **Backend:** Node.js, Express
- **Database:** MongoDB (local MongoDB or MongoDB Atlas)

The frontend and backend run as separate applications. The backend connects to
MongoDB and serves the API; the frontend calls that API.

## Requirements

- Node.js **20.19 or newer** (recommended for this frontend); npm
- A MongoDB database: either a local MongoDB server or a MongoDB Atlas cluster
- Git, if you are cloning the repository

The backend package itself supports Node.js 18+, but use Node.js 20.19+ to meet
the frontend's Vite requirement as well.

## Run locally

### 1. Get the project

```sh
git clone <repository-url>
cd tvsmnepa
```

Replace `<repository-url>` with the URL of your repository. If you already have
the source code, open a terminal in the project folder instead.

### 2. Configure MongoDB and the backend

Create a database and make sure it is running and reachable. For a local
MongoDB server, a URI can look like:

```text
mongodb://127.0.0.1:27017/tvsmnepa
```

For MongoDB Atlas, use the connection URI provided by Atlas and ensure your
development computer is allowed to connect to the cluster.

In one terminal, from the project root:

```sh
cd backend
```

Copy the example environment file:

```powershell
Copy-Item .env.example .env
```

On macOS/Linux, use `cp .env.example .env` instead. Edit `backend/.env` and set
at least:

- `MONGODB_URI` — your database connection URI
- `JWT_SECRET` and `JWT_REFRESH_SECRET` — two different, long, random secrets
- `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` — credentials for the first
  administrator
- `DEFAULT_SCHOOL_NAME` — the name shown when initial settings are created
- `NODE_ENV=development` for local development
- `ALLOWED_ORIGINS=http://localhost:5173` for the local frontend

You can generate a random secret with Node.js; run the command twice to get two
different values:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Do not use example or default passwords outside a disposable local setup. Keep
`.env` private and never commit it or share its contents.

Install backend dependencies and create the first administrator:

```sh
npm install
npm run create-admin
```

The admin script creates the account using the `ADMIN_*` values in `.env`. If
that email already exists, the script does not reset or change its password.

Start the API:

```sh
npm run dev
```

Leave this terminal running. The backend listens on port `5000` by default.
Check that it is running at:

```text
http://localhost:5000/api/v1/health
```

### 3. Start the frontend

Open a **second terminal** at the project root:

```sh
cd frontend
npm install
npm run dev
```

Open the local address Vite prints, normally
`http://localhost:5173`. Sign in with the administrator email and password you
configured in `backend/.env`.

The frontend's default API address is
`http://localhost:5000/api/v1`. If your backend uses a different address, create
`frontend/.env.local` and set:

```dotenv
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

Restart the frontend after changing frontend environment values.

## First-time setup in the app

The administrator account is created without sample school data. After signing
in, use the management screens to:

1. Check the school settings.
2. Create and activate an academic session.
3. Add classes and teachers.
4. Add students (or use the available import tools).
5. Begin marking attendance and reviewing reports.

Create teacher accounts through the application and assign the appropriate
class/access settings. Do not share an administrator account for routine
attendance work.

## Useful commands

Run these from the relevant folder (`backend` or `frontend`):

| Folder | Command | Purpose |
| --- | --- | --- |
| `backend` | `npm run dev` | Start the backend with automatic restart during development |
| `backend` | `npm start` | Start the backend without the development watcher |
| `backend` | `npm run create-admin` | Create the initial administrator if that email is not already present |
| `frontend` | `npm run dev` | Start the Vite development server |
| `frontend` | `npm run build` | Build the frontend for deployment |
| `frontend` | `npm run lint` | Run ESLint on the frontend |
| `frontend` | `npm run preview` | Preview a previously built frontend |

There is no test command configured in the package scripts at the time this
guide was written.

## Deployment overview

The project has separate frontend and backend deployments. The existing
project notes name Vercel for the frontend, Render for the backend, and MongoDB
Atlas for the database; other providers can work if they support the required
Node.js version and persistent MongoDB connectivity.

Before deploying:

- Set the backend environment variables in the hosting provider's secret
  settings. Use `NODE_ENV=production`, strong unique JWT secrets, a secure
  administrator password, and the production MongoDB URI.
- Set backend `ALLOWED_ORIGINS` to the exact production frontend origin(s),
  comma-separated. Do not leave placeholder domains in the list.
- Set frontend `VITE_API_BASE_URL` to the deployed backend API base, for example
  `https://your-backend.example.com/api/v1`.
- Ensure HTTPS is enabled and that uploaded files, if used, are stored
  somewhere persistent. A host's temporary local disk may be cleared when an
  instance restarts or is replaced.
- Build the frontend with `npm run build` and deploy the generated `frontend/dist`
  directory using the hosting provider's Vite/static-site instructions.
- Back up MongoDB and verify you can restore a backup before relying on the
  system for real school records.

## Important limits and safety notes

- A reachable MongoDB database is required for normal application use. The
  health endpoint reports whether the backend has connected to its database.
- The initial admin command creates an account, not demo students, classes, or
  attendance records. School data must be entered or imported.
- This project is configured around one application/database deployment; it is
  not documented as a multi-school hosted service with tenant isolation.
- Attendance, student, and staff records are sensitive. Restrict database and
  hosting access, use strong individual accounts, and follow the school's
  privacy and data-retention requirements.
- The app's PWA features do not replace a database backup or a tested recovery
  plan. Do not assume unsaved attendance changes can be recovered offline.
- Uploaded content may be stored on the backend host's local filesystem.
  Confirm persistence and backup behavior for your chosen hosting provider.
- This README describes the current setup, not a security, legal, or production
  readiness certification. Review access controls, backups, privacy obligations,
  and operational monitoring before using real student data.

> **Warning:** `npm run seed` is destructive. The seed script drops existing
> collections for users, teachers, classes, students, academic sessions,
> settings, notifications, activity logs, attendance, and holidays before
> creating a new administrator. Do not run it against a database containing
> records you need to keep.

## Troubleshooting

- **Backend exits with missing environment variables:** Ensure `backend/.env`
  exists and has `MONGODB_URI`, `JWT_SECRET`, and `JWT_REFRESH_SECRET`.
- **MongoDB connection fails:** Check that MongoDB is running, the URI is
  correct, the Atlas network access rules allow your IP, and database
  credentials are URL-encoded if needed.
- **Frontend reports a network/CORS error:** Confirm both servers are running,
  the API URL is correct, and `ALLOWED_ORIGINS` includes the frontend's exact
  origin. For local development, set `NODE_ENV=development` and include
  `http://localhost:5173`.
- **Port is already in use:** Stop the other process using port `5000` or `5173`,
  or configure a different port and update the API URL accordingly.
- **Login does not work:** Verify the admin email/password values in
  `backend/.env`; `create-admin` will not overwrite an account that already
  exists. Use the application's supported account-management flow to resolve
  existing accounts.

## Project layout

```text
backend/    Express API, MongoDB models, routes, and setup scripts
frontend/   React/Vite web application
README.md   Project setup and usage guide
```
