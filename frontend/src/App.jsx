import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";

import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Navbar from "./components/Navbar.jsx";

// Public pages
import Landing     from "./pages/Landing.jsx";
import Login       from "./pages/Login.jsx";
import Register    from "./pages/Register.jsx";

// App pages
import Dashboard      from "./pages/Dashboard.jsx";
import Analytics      from "./pages/Analytics.jsx";
import FocusStats     from "./pages/FocusStats.jsx";
import Pomodoro       from "./pages/Pomodoro.jsx";
import StudyTimer     from "./pages/StudyTimer.jsx";
import SessionHistory from "./pages/SessionHistory.jsx";
import Subjects       from "./pages/Subjects.jsx";
import SubjectInsights from "./pages/SubjectInsights.jsx";
import Tasks          from "./pages/Tasks.jsx";
import Notes          from "./pages/Notes.jsx";
import Flashcards     from "./pages/Flashcards.jsx";
import Resources      from "./pages/Resources.jsx";
import LearningRoom   from "./pages/LearningRoom.jsx";
import Goals          from "./pages/Goals.jsx";
import Planner        from "./pages/Planner.jsx";
import Achievements   from "./pages/Achievements.jsx";
import Leaderboard    from "./pages/Leaderboard.jsx";
import SearchPage     from "./pages/Search.jsx";
import Settings       from "./pages/Settings.jsx";

/* ── App shell: sidebar + navbar + content ──────────────────────────────── */
function AppShell({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Navbar />
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}

/* ── Wrap a page with auth guard + shell ────────────────────────────────── */
function Protected({ children }) {
  return (
    <ProtectedRoute>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}

/* ── Root redirect: landing for guests, dashboard for logged-in users ────── */
function RootRedirect() {
  const { user } = useAuth();
  return user ? <Navigate to="/dashboard" replace /> : <Landing />;
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/"         element={<RootRedirect />} />
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Overview */}
      <Route path="/dashboard"   element={<Protected><Dashboard /></Protected>} />
      <Route path="/analytics"   element={<Protected><Analytics /></Protected>} />
      <Route path="/focus-stats" element={<Protected><FocusStats /></Protected>} />

      {/* Study tools */}
      <Route path="/pomodoro"    element={<Protected><Pomodoro /></Protected>} />
      <Route path="/study-timer" element={<Protected><StudyTimer /></Protected>} />
      <Route path="/sessions"    element={<Protected><SessionHistory /></Protected>} />

      {/* Content */}
      <Route path="/subjects"          element={<Protected><Subjects /></Protected>} />
      <Route path="/subject-insights"  element={<Protected><SubjectInsights /></Protected>} />
      <Route path="/tasks"             element={<Protected><Tasks /></Protected>} />
      <Route path="/notes"             element={<Protected><Notes /></Protected>} />
      <Route path="/flashcards"        element={<Protected><Flashcards /></Protected>} />
      <Route path="/resources"         element={<Protected><Resources /></Protected>} />
      <Route path="/learning-room"     element={<Protected><LearningRoom /></Protected>} />

      {/* Progress */}
      <Route path="/goals"        element={<Protected><Goals /></Protected>} />
      <Route path="/planner"      element={<Protected><Planner /></Protected>} />
      <Route path="/achievements" element={<Protected><Achievements /></Protected>} />
      <Route path="/leaderboard"  element={<Protected><Leaderboard /></Protected>} />

      {/* Tools */}
      <Route path="/search"   element={<Protected><SearchPage /></Protected>} />
      <Route path="/settings" element={<Protected><Settings /></Protected>} />

      {/* Catch-all → dashboard (if logged in) or landing */}
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}
