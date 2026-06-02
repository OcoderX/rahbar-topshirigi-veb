# TaskFlow — Employee Task Tracker

A small full-stack application where an **admin** manages employees and assigns tasks, and **employees** update the status of the tasks assigned to them.

Built with **Node.js + Express + MySQL** (backend) and **React + Vite** (frontend), using JWT authentication, bcrypt password hashing, and role-based access control.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Features](#features)
3. [Project Structure](#project-structure)
4. [Prerequisites](#prerequisites)
5. [Setup — Option A: Local (recommended)](#setup--option-a-local-recommended)
6. [Setup — Option B: Docker](#setup--option-b-docker)
7. [Demo Accounts](#demo-accounts)
8. [API Reference](#api-reference)
9. [Database Schema](#database-schema)
10. [Postman Collection](#postman-collection)
11. [Notes & Design Decisions](#notes--design-decisions)

---

## Tech Stack

| Layer    | Technology                                   |
| -------- | -------------------------------------------- |
| Backend  | Node.js, Express, MySQL (`mysql2`)           |
| Auth     | JWT (`jsonwebtoken`), bcrypt (`bcryptjs`)    |
| Frontend | React 18, Vite, React Router, Axios          |
| DB       | MySQL 8                                       |

---

## Features

**Core (per the assignment)**

- JWT authentication (register / login) with bcrypt-hashed passwords
- Role-based access control middleware (`admin`, `employee`)
- Clean layered backend: `routes → controllers → services → models`
- Central error handling with a consistent error response shape
- At least one API using a **SQL JOIN** (task lists join `users` for assignee details — see [`task.model.js`](backend/src/models/task.model.js))
- React UI: Login → role-based redirect → Admin Dashboard / Employee Dashboard
- Admin: view employees, create tasks, view all tasks in a table with edit
- Employee: view only their tasks, advance status (Pending → In Progress → Completed)

**Bonus (implemented)**

- ✅ Role-based route protection in React (`ProtectedRoute`)
- ✅ Filters (by status and due date) and server-side sorting
- ✅ Pagination (server-side `LIMIT`/`OFFSET` with total counts)
- ✅ Activity logs (audit trail table + `GET /activity-logs`)
- ✅ Dockerized backend + MySQL (`docker-compose.yml`)

---

## Project Structure

```
employee-task-tracker/
├── backend/
│   ├── src/
│   │   ├── config/db.js            # MySQL connection pool
│   │   ├── middleware/             # auth (JWT + roles), validation, error handler
│   │   ├── routes/                 # auth, users, tasks, activity-logs
│   │   ├── controllers/            # thin HTTP layer
│   │   ├── services/               # business logic + access rules
│   │   ├── models/                 # SQL data access (JOINs live here)
│   │   ├── utils/                  # JWT, ApiError, asyncHandler, migrate, seed
│   │   ├── app.js                  # Express app (routes + middleware)
│   │   └── server.js               # entry point (DB ping + listen)
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/                     # axios client + endpoint wrappers
│   │   ├── context/AuthContext.jsx  # session state
│   │   ├── components/              # Navbar, ProtectedRoute, TaskModal, etc.
│   │   ├── pages/                   # Login, AdminDashboard, EmployeeDashboard
│   │   ├── App.jsx                  # router + role-protected routes
│   │   └── main.jsx
│   ├── .env.example
│   └── package.json
├── database/
│   └── schema.sql                   # SQL dump (CREATE DATABASE + tables)
├── postman/
│   └── Employee-Task-Tracker.postman_collection.json
└── docker-compose.yml
```

---

## Prerequisites

- **Node.js** ≥ 18 and npm
- **MySQL** ≥ 8 running locally (for Option A), **or** Docker (for Option B)

---

## Setup — Option A: Local (recommended)

### 1. Database

Make sure MySQL is running. You can create the schema in either way:

```bash
# Using the SQL dump directly:
mysql -u root -p < database/schema.sql
```

(Or skip this and use `npm run migrate` in the next step, which runs the same file.)

### 2. Backend

```bash
cd backend
cp .env.example .env          # then edit DB_PASSWORD etc. to match your MySQL
npm install

npm run migrate               # creates the database + tables (runs schema.sql)
npm run seed                  # inserts demo users + tasks (hashed passwords)

npm run dev                   # starts the API on http://localhost:5000
```

You should see:

```
✓ Connected to MySQL
✓ API listening on http://localhost:5000
```

### 3. Frontend

In a second terminal:

```bash
cd frontend
cp .env.example .env          # default VITE_API_URL=http://localhost:5000 is fine
npm install
npm run dev                   # starts the app on http://localhost:5173
```

Open **http://localhost:5173** and log in with a demo account below.

---

## Setup — Option B: Docker

Brings up MySQL **and** the backend (the schema auto-loads on first boot):

```bash
docker compose up --build
# once running, seed demo data:
docker compose exec backend npm run seed
```

The API is then on `http://localhost:5000`. Run the frontend locally as in Option A step 3 (point `VITE_API_URL` at `http://localhost:5000`).

---

## Demo Accounts

All demo accounts use the password **`password123`**.

| Email             | Role     |
| ----------------- | -------- |
| `admin@demo.com`  | admin    |
| `aisha@demo.com`  | employee |
| `ben@demo.com`    | employee |
| `chen@demo.com`   | employee |

The login screen also has one-click buttons to fill these in.

---

## API Reference

Base URL: `http://localhost:5000`

All protected endpoints expect an `Authorization: Bearer <token>` header. The token is returned by `/auth/login` and `/auth/register`.

### Auth

| Method | Endpoint          | Access | Description                          |
| ------ | ----------------- | ------ | ------------------------------------ |
| POST   | `/auth/register`  | Public | Register a user, returns user + JWT  |
| POST   | `/auth/login`     | Public | Login, returns user + JWT            |
| GET    | `/auth/me`        | Auth   | Current user (from token)            |

**POST `/auth/register`**
```json
{ "name": "Jane", "email": "jane@demo.com", "password": "secret123", "role": "employee" }
```

**POST `/auth/login`**
```json
{ "email": "admin@demo.com", "password": "password123" }
```
Response:
```json
{ "user": { "id": 1, "name": "Admin User", "email": "admin@demo.com", "role": "admin" }, "token": "eyJ..." }
```

### Users

| Method | Endpoint              | Access            | Description                                |
| ------ | --------------------- | ----------------- | ------------------------------------------ |
| GET    | `/users`              | Admin only        | List all users (`?role=employee` optional) |
| GET    | `/users/:id/tasks`    | Admin or self     | Tasks for a specific employee (paginated)  |

### Tasks

| Method | Endpoint       | Access                    | Description                                  |
| ------ | -------------- | ------------------------- | -------------------------------------------- |
| POST   | `/tasks`       | Admin only                | Create a task                                |
| GET    | `/tasks`       | Auth (scoped by role)     | Admins: all tasks; employees: own tasks      |
| GET    | `/tasks/:id`   | Auth (own task or admin)  | Task details (with assignee)                 |
| PUT    | `/tasks/:id`   | Admin (any field) / employee (own status) | Update a task              |

**Query params for `GET /tasks` and `GET /users/:id/tasks`:**

| Param       | Example        | Notes                                          |
| ----------- | -------------- | ---------------------------------------------- |
| `status`    | `in_progress`  | filter by status                               |
| `dueBefore` | `2026-07-01`   | tasks due on/before this date                  |
| `dueAfter`  | `2026-06-01`   | tasks due on/after this date                   |
| `page`      | `1`            | 1-based page number (default 1)                |
| `limit`     | `10`           | page size (default 10, max 100)                |
| `sortBy`    | `due_date`     | `created_at` \| `due_date` \| `status` \| `title` |
| `order`     | `asc`          | `asc` \| `desc`                                |

Paginated responses look like:
```json
{ "data": [ /* tasks */ ], "total": 23, "page": 1, "limit": 10 }
```

**POST `/tasks`**
```json
{ "title": "Prepare deck", "description": "Q3 review", "assigned_to": 2, "status": "pending", "due_date": "2026-06-30" }
```

**PUT `/tasks/:id`** (employee updating status)
```json
{ "status": "completed" }
```

### Activity Logs (bonus)

| Method | Endpoint           | Access     | Description                  |
| ------ | ------------------ | ---------- | ---------------------------- |
| GET    | `/activity-logs`   | Admin only | Recent actions (`?limit=50`) |

### Error shape

Every error returns a consistent shape:
```json
{ "error": { "message": "Validation failed", "details": ["email must be a valid email"] } }
```

---

## Database Schema

Three tables — `users`, `tasks`, and `activity_logs` (bonus). Full DDL is in
[`database/schema.sql`](database/schema.sql).

- `tasks.assigned_to` → FK to `users.id` (`ON DELETE SET NULL`)
- `activity_logs.user_id` → FK to `users.id`
- Indexes on `tasks.status`, `tasks.due_date`, and `tasks.assigned_to` for filtering/sorting

The **SQL JOIN** requirement is satisfied in `task.model.js`, where task reads
`LEFT JOIN users` to return `assignee_name` / `assignee_email` alongside each task.

---

## Postman Collection

Import [`postman/Employee-Task-Tracker.postman_collection.json`](postman/Employee-Task-Tracker.postman_collection.json) into Postman.

- Set the `baseUrl` collection variable if needed (defaults to `http://localhost:5000`).
- Run **Auth → Login (admin)** first — it automatically stores the JWT in the
  `token` variable, which every other request uses.

---

## Notes & Design Decisions

- **Layered architecture** keeps SQL in models, business rules + authorization in
  services, and HTTP concerns in controllers — so each layer is independently testable.
- **Authorization is enforced server-side**, not just in the UI: employees are
  scoped to their own tasks at the service layer even if they craft a request
  directly, and may only change a task's `status`. The React `ProtectedRoute` is a
  UX convenience on top of that.
- **`dateStrings: true`** on the MySQL pool returns `DATE` values as plain
  `YYYY-MM-DD` strings, avoiding timezone drift between the DB and the UI.
- **`LIMIT`/`OFFSET`** are validated as integers and clamped (max 100) before being
  interpolated, since some MySQL versions reject placeholders in `LIMIT`. The
  `sortBy` column is checked against a whitelist to prevent SQL injection.
- **JWT** carries `{ id, role, name }` so role checks don't require a DB round-trip
  on every request.
```
