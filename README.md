# PickPal

Department-Isolated Student Election PWA - DCT Capstone 2025-2026

## Project Structure

```text
PickpalUI/
|-- backend/                  # Laravel app served by Herd
|   |-- app/
|   |-- database/
|   |-- routes/
|   |   |-- api.php           # PickPal JSON API routes
|   |   `-- web.php
|   `-- .env                  # Local backend environment
|-- index.html
|-- vite.config.js
|-- package.json
`-- src/                      # React + Vite frontend
    |-- lib/api.js            # Frontend API client
    |-- main.jsx
    |-- App.jsx
    |-- styles/
    |-- components/
    `-- features/
        |-- auth/
        |-- voter/
        `-- admin/
```

## Backend - Laravel Herd

Start Herd Desktop, then link the Laravel backend:

```bash
cd backend
herd link pickpal
```

The API will be available from Herd at:

```text
http://pickpal.test/api
```

You can also run Laravel without Herd:

```bash
cd backend
php artisan serve
```

That exposes the API at:

```text
http://localhost:8000/api
```

Useful backend checks:

```bash
php artisan route:list
php artisan test
```

## Frontend - React + Vite

```bash
npm install
npm run dev
npm run build
```

The frontend reads its backend URL from `VITE_API_BASE_URL`.

For Laravel served by `php artisan serve`, use:

```text
VITE_API_BASE_URL=http://localhost:8000/api
```

For Laravel served by Herd, use:

```text
VITE_API_BASE_URL=http://pickpal.test/api
```

## Initial Admin Account

| Role  | Login ID | Password |
|-------|----------|----------|
| Admin | admin@pickpal.test | password |

The seeder creates only departments and the initial admin account. Voters, elections, candidates, surveys, votes, and results should be created/imported through the application.

## Tech Stack

| Layer     | Technology |
|-----------|------------|
| Frontend  | React 18 + Vite 8 |
| Styling   | Plain CSS with CSS variables |
| Backend   | Laravel 13 via Herd |
| Database  | SQLite locally, Supabase PostgreSQL for shared/cloud data |
| Face Scan | Browser MediaStream API with face-api.js descriptors |
| PWA       | Web App Manifest + online-first Service Worker |
| CSV       | Browser CSV parsing and Blob API export |
| Charts    | CSS-based analytics bars |
| Session   | Frontend session persistence with Laravel-backed login checks |

## Supabase Database

Laravel can use Supabase as the shared project database because Supabase provides a hosted PostgreSQL database. Keep React talking to Laravel, and let Laravel talk to Supabase:

```text
React frontend -> Laravel API -> Supabase PostgreSQL
```

To switch the backend from local SQLite to Supabase:

1. Create a Supabase project.
2. Open `Project Settings > Database`.
3. Copy the pooled PostgreSQL connection values.
4. Copy `backend/.env.supabase.example` to `backend/.env`.
5. Fill in `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, and `DB_PASSWORD`.
6. Keep `DB_CONNECTION=pgsql` and `DB_SSLMODE=require`.
7. Run:

```bash
cd backend
php artisan config:clear
php artisan migrate --seed
```

Use `migrate --seed` for a new Supabase database. Use `migrate:fresh --seed` only if you intentionally want to delete and recreate all Supabase tables.

## Image Storage

Candidate photos and voter profile photos are uploaded through Laravel and saved on the public storage disk. The database stores only the image URL.

Run this once in the backend so uploaded images are web-accessible:

```bash
cd backend
php artisan storage:link
```

Keep `APP_URL` set to the backend URL, for example `http://localhost:8000` during local testing, so returned image URLs load correctly in the React app.

## Password Reset Email

Forgot password sends a reset code to the account email through Laravel mail. For Gmail, use an app password and set these in `backend/.env`:

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-gmail-address@gmail.com
MAIL_PASSWORD=your-gmail-app-password
MAIL_SCHEME=tls
MAIL_FROM_ADDRESS=your-gmail-address@gmail.com
```

## PWA Behavior

PickPal is configured as an online-first PWA for Android and iOS. The app can be installed on supported browsers, and the service worker caches the app shell, PNG/SVG icons, offline page, face-api model files, and static assets.

Sensitive election actions still require a live server connection:

- login and logout
- voter registration
- face verification
- vote submission
- admin approval/import actions
- password reset

This protects election integrity by keeping identity checks, duplicate-vote checks, election status checks, and vote storage on the Laravel backend. If the device is offline, PickPal shows an offline banner instead of allowing secure actions to proceed.

## API Routes

```text
GET /api/health
GET /api/me
POST /api/logout
POST /api/uploads/images
POST /api/admin/login
POST /api/admin/password
GET /api/admin/dashboard
GET /api/admin/analytics
POST /api/voter/login
POST /api/voter/password
GET /api/elections
POST /api/elections
GET /api/admin/elections
GET /api/elections/{publicId}
PATCH /api/elections/{publicId}/status
PATCH /api/elections/{publicId}/archive
DELETE /api/elections/{publicId}
PATCH /api/elections/{publicId}/results-publish
GET /api/admin/elections/{publicId}/results
POST /api/elections/{publicId}/positions
PUT /api/elections/{publicId}/positions/{position}
DELETE /api/elections/{publicId}/positions/{position}
GET /api/admin/elections/{publicId}/candidates
GET /api/elections/{publicId}/candidates
POST /api/elections/{publicId}/candidates
PUT /api/elections/{publicId}/candidates/{candidate}
DELETE /api/elections/{publicId}/candidates/{candidate}
GET /api/elections/{publicId}/results
GET /api/elections/{publicId}/eligibility
GET /api/surveys
POST /api/surveys
GET /api/surveys/{publicId}/responses
POST /api/surveys/{publicId}/responses
PUT /api/surveys/{publicId}
DELETE /api/surveys/{publicId}
GET /api/voters
POST /api/voters/register
GET /api/official-students
POST /api/official-students/import
PATCH /api/voters/{voter}/status
POST /api/votes
GET /api/audit-logs
```

These routes are backed by Laravel controllers, Eloquent models, migrations, and database records created through the app.

Admin write/review routes require an admin bearer token. Voter password, eligibility, and vote submission routes require a voter bearer token. Login endpoints return the token used by the frontend session.

Public election results are only returned after an admin publishes them. Admins use the protected admin results route to preview totals before publishing. Survey response submission also requires a voter bearer token so responses cannot be attached to another student's account from the browser.

Official student CSV import accepts:

```text
studentnumber,firstname,middlename,lastname,department,year,section,email
```

The import creates or updates official student records only. Students still register themselves from the voter side, and admin approval checks each registration against this official list.

## Backend Data Model

The working backend layer includes:

```text
departments
official_students
elections
positions
candidates
voters
votes
vote_selections
surveys
survey_questions
survey_responses
survey_answers
audit_logs
```

## Working Feature Slices

```text
Admin login
Voter login and registration
Session restore and logout
Dashboard statistics
Election creation and status management
Election position management
Candidate CRUD
Voter approval, rejection, and official-list CSV validation
Ballot loading and vote submission
Live camera face scan for registration and voting
Results publishing and results views
Supplementary survey CRUD
Survey response submission
Survey analytics and response export
Audit log search, filters, and export
```

## Presentation Checklist

1. Start the backend with Herd or `php artisan serve`.
2. Confirm `GET /api/health` returns `status: ok`.
3. Run migrations and the minimal admin/department seeder with `php artisan migrate --seed`.
4. Set frontend `.env` to the active API base URL.
5. Start the frontend with `npm run dev`.
6. Sign in as admin and confirm dashboard, voters, elections, candidates, surveys, analytics, results, and audit logs load.
7. Sign in as voter and confirm elections, survey, face scan, vote submission, profile, and results load.
8. Before a final presentation, run `npm run build`.

## Known Demo Notes

Face recognition uses `face-api.js` model files in `public/models/face-api`. Registration stores a 128-value face descriptor for the voter, and vote submission compares the live descriptor against the stored descriptor on the Laravel backend.
#   P I c k p a l U I  
 