# StudyTrack — 4-Month Study Planner & Progress Tracker

A full-stack study companion: **React (Vite)** front end + **Node.js/Express** back end.
Built to plan and track ~4 months (16 weeks) of studying, with 20+ extra features layered
on top of the core planner/tracker.

## What's included

**Core (4-month plan + progress):**
1. Auto-generated 16-week study plan that rotates subject focus through 4 phases
   (Foundation → Deep Practice → Mock & Review → Final Revision)
2. Progress dashboard (total hours, weekly hours, tasks done, streak)
3. Per-subject topic-completion tracking

**20+ additional features:**
4. Subject/course manager (CRUD, color-coded)
5. Task/to-do manager (priority, due date, status)
6. Pomodoro timer (25/5 min) that auto-logs sessions
7. Manual study-session logger
8. Study streak tracker (GitHub-style heatmap)
9. Analytics page: hours/week line chart, hours/subject bar chart, topic-completion pie chart
10. Notes per subject with tags
11. Flashcards with spaced-repetition self-quiz
12. Weekly/monthly goals with progress bars
13. Achievements/badges (streak & hour milestones, auto-awarded)
14. Resource library (links/videos/books per subject)
15. Global search across notes, tasks, resources
16. Dark/light theme toggle
17. CSV export of your full study-session log
18. Exam/target-date countdown banner
19. Overdue & due-today task reminders on the dashboard
20. Responsive layout with a collapsible mobile sidebar
21. Account settings (exam date, weekly hour goal, theme, password change)
22. JWT authentication (register/login), so data is private per user

## Project structure

```
studytracker/
├── backend/     Express API (JSON-file storage, no external DB needed)
└── frontend/    React app (Vite)
```

## Running it locally

You need [Node.js](https://nodejs.org) 18+ installed.

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env       # optionally edit JWT_SECRET
npm start                  # or: npm run dev (auto-restart with nodemon)
```
Runs on **http://localhost:5000**. Data is stored in `backend/data/db.json`
(created automatically on first run — nothing else to configure).

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```
Runs on **http://localhost:5173** and proxies `/api` calls to the backend.
Open that URL, register an account, and you're in.

### Production build

```bash
cd frontend
npm run build      # outputs static files to frontend/dist
```
Serve `frontend/dist` with any static host, and run `backend` as a normal
Node process (e.g. behind PM2 or a process manager), pointing the frontend's
API calls at your backend's URL.

## Notes on the storage layer

To keep setup to two `npm install` commands, the backend uses a single JSON
file (`backend/data/db.json`) instead of a database server. This is fine for
personal/single-user use. If you want multi-device sync or many concurrent
users, swap `backend/utils/db.js` for a real database (e.g. PostgreSQL +
Prisma, or MongoDB) — every route already goes through that one file, so it's
a single place to change.

## Customizing the plan length

The plan defaults to 16 weeks (~4 months). To change it, edit
`TOTAL_WEEKS` in `backend/routes/plan.js`.
