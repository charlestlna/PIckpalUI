# PickPal System Documentation

## 1. System Overview

PickPal is a student election and supplementary survey system designed for Dominican College of Tarlac. It supports department-based election management, voter registration approval, official student-list validation, candidate management, secure voting with face verification, results publishing, surveys, analytics, and audit logs.

The system is built as a Progressive Web App (PWA), so users can open it in a browser or install it as an app on supported Android and iOS browsers. PickPal uses an online-first approach: the application shell can be cached, but sensitive actions such as login, registration, voting, approval, password reset, and vote counting require a live backend connection.

## 2. Main Objectives

- Provide a controlled election system for student departments.
- Allow students to register as voters using their official student information.
- Let administrators approve or reject registrations based on the official student list.
- Restrict department elections to voters from the same department.
- Allow SSC elections to be visible and votable by all departments.
- Support candidate photos, positions, ballots, and result publishing.
- Keep surveys separate from elections because surveys are supplementary data-gathering tools.
- Maintain audit logs for important admin and system actions.

## 3. User Roles

### Voter

Voters are students who register through the voter side of the system. A voter can:

- Register using student number, name, department, year level, section, email, password, and face scan.
- Log in after admin approval.
- View eligible elections.
- View candidates.
- Cast one vote per election after face verification.
- View published results.
- Answer available surveys.
- View profile and voting status.
- Change password.

### Department Administrator

Each department has its own admin account. A department admin can:

- Manage elections for their department.
- Manage election positions.
- Manage candidates.
- Import the official student list.
- Review voter registrations for their department.
- Approve or reject voter registrations.
- View department-scoped results.
- Create and manage surveys.
- View survey analytics.
- View department-scoped audit logs.
- Change password or transfer the admin account by email.

### SSC Administrator

SSC is treated as an overall election department. If an election is created under SSC, all approved voters from all departments can vote in that election. SSC admin access does not mean SSC can manage private records of every department unless the system explicitly allows it.

## 4. Supported Departments

The system currently supports:

- SSC - Supreme Student Council
- CLA - College of Liberal Arts
- CED - College of Education
- CHM - College of Hospitality Management
- CCS - College of Computer Studies
- CBA - College of Business and Accountancy
- CCJE - College of Criminal Justice Education

SSC is used for college-wide elections and should not appear as a normal voter registration department.

## 5. Major Modules

### Authentication

The authentication module handles voter login, admin login, registration, password reset, password update, session restore, and logout. The frontend stores the API token returned by Laravel and sends it with protected requests.

### Voter Registration

Students register themselves from the voter side. Registration is not automatically approved. Admin approval depends on whether the registration matches the official student list.

The student number is expected to be a 9-digit number. Name fields should contain letters only. Department, year level, and section are selected through controlled options where applicable.

### Official Student List

The official student list is imported by the admin. It is used as the validation source for voter registrations. This avoids letting students register if they are not part of the approved school list.

The import template uses these required columns:

```text
studentnumber,firstname,lastname,department,year,section,email
```

Year level values are normalized, so values such as `4`, `4th`, `fourth`, and `4th year` can be interpreted as `4th Year`. Sections use program-based formats such as `BSIT-4D`, not department-based formats such as `CCS-4D`.

### Elections

Admins can create, edit, open, close, archive, and delete elections. Elections contain positions and candidates. Department admins create elections for their own department. SSC elections are votable by all departments.

Archived elections are hidden from active management areas such as candidates and results lists unless an archive view is intentionally provided.

### Positions

Positions define the ballot structure for an election. Default positions include:

- President
- Vice President
- Secretary
- Treasurer
- Auditor
- PIO
- 1st Year Representative
- 2nd Year Representative
- 3rd Year Representative
- Sports Coordinator

Admins can still add custom positions because not every department has the same election structure.

### Candidates

Candidates are connected to an election and position. Candidate information may include name, platform, department, year level, section, linked official student record, and photo.

Candidate photos are uploaded through the Laravel backend and stored as public image files. Voters can view candidate information before voting.

### Voting

Voting is limited to approved voters. A voter can vote only once per election. Before submitting a ballot, the voter must pass face verification. The backend checks the current face descriptor against the stored voter descriptor.

Votes are stored separately from survey responses. Vote selections are recorded per position and candidate.

### Results

Admins can view election results and publish them when ready. Voters can only view results after they are published. If there are no available results, the system shows an empty-state message instead of a broken or blank view.

### Surveys

Surveys are supplementary and are not directly tied to elections. They are used for gathering information or feedback. Voters can answer available published surveys, and admins can review survey analytics and responses.

Survey responses may support anonymous submission depending on the survey options.

### Analytics

Analytics currently focuses on survey results and response summaries. It is treated as part of the survey workflow.

### Audit Logs

Audit logs record important system and admin actions. Logs are department-scoped so one department admin does not casually view another department's activity. Long audit logs should be paginated and can be archived or cleaned based on the retention policy chosen by the school.

## 6. Technology Stack

### Frontend

- React 18
- Vite 8
- JavaScript
- Plain CSS with CSS variables
- face-api.js for browser-based face descriptor extraction
- Browser MediaStream API for camera access
- Web App Manifest for PWA install support
- Service Worker for online-first app-shell caching

### Backend

- PHP 8.3+
- Laravel 13
- Laravel Eloquent ORM
- Laravel migrations and seeders
- Laravel mail for password reset email
- PHPUnit for backend feature tests

### Database

- PostgreSQL for the current local database setup
- Laravel database configuration through `backend/.env`
- Tables managed through Laravel migrations

### Development Tools

- Node.js and npm
- Composer
- Laravel Artisan
- Laravel Herd or `php artisan serve`
- Vite development server

## 7. Database Overview

The main application tables include:

```text
departments
users
api_tokens
official_students
voters
elections
positions
candidates
votes
vote_selections
surveys
survey_questions
survey_responses
survey_answers
audit_logs
```

Important relationships:

- A department has many admins, voters, official students, elections, surveys, and audit logs.
- An election belongs to a department.
- An election has many positions.
- A position has many candidates.
- A voter belongs to a department.
- A vote belongs to a voter and election.
- A vote has many vote selections.
- A survey belongs to a department.
- A survey has many questions and responses.

## 8. Security and Validation

PickPal includes the following security and validation behaviors:

- Protected API routes use bearer tokens.
- Admin-only routes require an admin token.
- Voter-only routes require a voter token.
- Voter registration is checked against the official student list.
- Department admins are scoped to their own department records.
- SSC elections are available to all departments.
- Voters can vote only once per election.
- Vote submission requires face verification.
- Face descriptors are hidden from normal API output.
- Passwords are hashed by Laravel.
- Forgot password uses email-based reset codes.
- Sensitive PWA actions are not allowed offline.

## 9. PWA Behavior

PickPal includes:

- `public/manifest.webmanifest`
- `public/sw.js`
- app icons
- offline page support
- installable browser experience

The service worker caches the application shell and static files. API requests and sensitive actions still go directly to the Laravel backend.

This means the app can be installed, but the actual election process remains server-verified.

## 10. Local Setup

### Backend

```bash
cd backend
composer install
copy .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

The local API is usually available at:

```text
http://localhost:8000/api
```

If using Laravel Herd:

```text
http://pickpal.test/api
```

### Frontend

```bash
npm install
npm run dev
```

The frontend API URL is configured through:

```text
VITE_API_BASE_URL
```

Example:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

## 11. Initial Admin Accounts

The seeder creates department records and department admin accounts.

Default password comes from:

```text
PICKPAL_ADMIN_PASSWORD
```

If not changed, the default development password is:

```text
password
```

Generated department admin emails follow this pattern:

```text
ccs.admin@pickpal.test
cla.admin@pickpal.test
ced.admin@pickpal.test
chm.admin@pickpal.test
cba.admin@pickpal.test
ccje.admin@pickpal.test
ssc.admin@pickpal.test
```

These should be changed before real deployment.

## 12. Testing the System

Useful backend checks:

```bash
cd backend
php artisan test
php artisan route:list
php artisan optimize:clear
```

Useful frontend checks:

```bash
npm run build
```

Manual testing checklist:

1. Start the Laravel backend.
2. Start the Vite frontend.
3. Log in as an admin.
4. Import official student list.
5. Register a voter from the voter side.
6. Approve the voter from the admin side.
7. Create an election.
8. Add positions.
9. Add candidates.
10. Open the election.
11. Log in as the voter.
12. View candidates.
13. Cast a vote with face verification.
14. Check admin results.
15. Publish results.
16. Confirm voter can view published results.
17. Create and publish a survey.
18. Submit a survey response as voter.
19. Check survey analytics and audit logs.

## 13. Deployment Notes

For shared hosting, the most important requirement is database support. PickPal currently uses PostgreSQL locally. If the hosting provider supports PostgreSQL, the current setup can stay closer to the local system.

If the hosting provider only supports MySQL or MariaDB, the Laravel app can be adjusted later, but database-specific behavior must be tested carefully.

Firebase can be used by the school's main domain without forcing PickPal to use Firebase. A subdomain can use its own Laravel backend and SQL database.

## 14. Current Scope Boundaries

Included in scope:

- Department elections
- SSC-wide elections
- Official student-list validation
- Voter approval workflow
- Candidate photo upload
- Face verification
- Surveys
- Results publishing
- Audit logs
- PWA install support

Not currently included in scope:

- Voter profile picture upload
- Push notifications
- Real-time chat
- Offline voting
- Direct Firebase database integration
- Public election pages without login

## 15. Maintenance Notes

- Keep `.env` files private.
- Change all default passwords before deployment.
- Back up the database before elections.
- Test face verification on the actual devices that will be used.
- Keep the official student list updated before opening registration.
- Review audit logs after important admin actions.
- Run backend tests before major deployment changes.
- Confirm email reset configuration before presenting forgot password.

