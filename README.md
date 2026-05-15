# Team Task Manager Pro

A full-stack Team Task Management web app built for the assignment requirements: authentication, project/team management, tasks, dashboard analytics, role-based access, database relationships, validations, and Railway deployment.

## Tech Stack

- **Frontend:** React + Vite + custom responsive CSS
- **Backend:** Node.js + Express REST APIs
- **Database:** PostgreSQL with Prisma ORM
- **Auth:** JWT + bcrypt password hashing
- **Security:** Helmet, CORS, rate limiting, input validation with Zod
- **Deployment:** Railway-ready single service serving both API and React build

## Features

### Authentication

- Signup with name, email, password
- Secure login with JWT
- Password reset button and flow
- Reset token expiry and one-time usage

### Project & Team Management

- Create projects
- Project creator automatically becomes Admin
- Admin can add/remove members
- Admin can change member role
- Members can view their projects

### Task Management

- Create tasks with title, description, due date, priority
- Assign tasks to project members
- Update task status: To Do, In Progress, Done
- Admin can edit/delete tasks
- Members can only update status of their assigned tasks

### Dashboard

- Total tasks
- Completion rate
- Tasks by status
- Tasks per user
- Overdue tasks
- Role-aware dashboard view

## Folder Structure

```txt
team-task-manager-pro/
├── client/                 # React frontend
│   └── src/
│       ├── main.jsx
│       └── styles.css
├── prisma/
│   ├── schema.prisma       # Database schema and relationships
│   └── seed.js             # Demo data
├── server/
│   ├── routes/             # REST API routes
│   ├── middleware/         # Auth middleware
│   ├── utils/              # Access helpers, mailer, token helpers
│   ├── scripts/start.js    # Railway start script with prisma db push
│   └── index.js            # Express app
├── .env.example
├── railway.json
└── package.json
```

## Database Relationships

- **User** has many project memberships and assigned tasks
- **Project** has one owner, many members, and many tasks
- **ProjectMember** connects users to projects with role: `ADMIN` or `MEMBER`
- **Task** belongs to one project and can be assigned to one user
- **PasswordReset** stores secure hashed reset tokens

## Local Setup

### 1. Create environment file

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Update `DATABASE_URL` with your PostgreSQL connection string.

Example:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/team_task_manager?schema=public"
JWT_SECRET="replace-this-with-a-long-random-secret"
PORT=8080
APP_URL="http://localhost:8080"
CLIENT_URL="http://localhost:5173"
ALLOW_DEMO_RESET_LINK="true"
```

### 2. Install dependencies

```bash
npm install
```

### 3. Push database schema

```bash
npm run db:push
```

### 4. Seed demo data

```bash
npm run db:seed
```

Demo login accounts:

```txt
Admin:  admin@taskpro.dev / Admin@12345
Member: member@taskpro.dev / Member@12345
```

### 5. Run locally

```bash
npm run dev
```

Frontend: `http://localhost:5173`

Backend API: `http://localhost:8080/api/health`

## Production Build

```bash
npm run build
npm start
```

The Express server serves the React production build from `client/dist`.

## Railway Deployment Steps

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Build team task manager full-stack app"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

### 2. Create Railway project

1. Open Railway.
2. Create a new project.
3. Choose **Deploy from GitHub repo**.
4. Select this repository.

### 3. Add PostgreSQL

1. In the Railway project canvas, click **New**.
2. Choose **Database**.
3. Select **PostgreSQL**.
4. Add a variable reference in the app service:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

### 4. Add required variables

In the Railway app service variables, add:

```env
JWT_SECRET=replace-this-with-a-long-random-secret
APP_URL=https://your-railway-domain.up.railway.app
ALLOW_DEMO_RESET_LINK=true
NODE_ENV=production
```

Optional SMTP variables for real email reset links:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-app-password
SMTP_FROM="Team Task Manager <your-email@example.com>"
```

### 5. Deploy

Railway will use `railway.json`:

- Build command: `npm run build`
- Start command: `npm start`

The start command automatically runs `prisma db push` before starting the server.

### 6. Generate public domain

In Railway, open the app service settings and generate a public domain. Use that as your **Live URL**.

## API Overview

### Auth

```txt
POST /api/auth/signup
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/forgot-password
POST /api/auth/reset-password
```

### Projects

```txt
GET    /api/projects
POST   /api/projects
GET    /api/projects/:projectId
PATCH  /api/projects/:projectId
DELETE /api/projects/:projectId
POST   /api/projects/:projectId/members
PATCH  /api/projects/:projectId/members/:userId
DELETE /api/projects/:projectId/members/:userId
```

### Tasks

```txt
GET    /api/projects/:projectId/tasks
POST   /api/projects/:projectId/tasks
PATCH  /api/tasks/:taskId
DELETE /api/tasks/:taskId
```

### Dashboard

```txt
GET /api/dashboard/project/:projectId
```

## Role Rules

### Admin

- Create/update/delete tasks
- Assign tasks
- Add/remove members
- Change roles
- View full project dashboard

### Member

- View projects where they are a member
- View only assigned tasks
- Update only the status of assigned tasks
- Cannot manage users or edit task details

## Password Reset Notes

For assignment/demo testing, `ALLOW_DEMO_RESET_LINK=true` returns a reset link in the UI when SMTP is not configured. For real production usage, configure SMTP and set:

```env
ALLOW_DEMO_RESET_LINK=false
```

## Submission Checklist

- [ ] Live Railway URL
- [ ] GitHub repository URL
- [ ] README included
- [ ] Demo video of 2–5 minutes
- [ ] App fully functional
- [ ] Environment variables configured
