# Connecting Another MERN Website to TVSMNEPA (Read-Only Attendance API)

This guide explains how to connect your other MERN website to `tvsmnepa` so authorized users on the other website can **view** school attendance data without ever being able to modify or delete records.

---

## Step 1: Generate a Secret Read-Only API Key

You have **two ways** to configure an API key on `tvsmnepa`:

### Option A — From the Admin Panel (Recommended, No Redeploy Needed)
1. Log in to `tvsmnepa` as **Admin**.
2. Go to **Settings** → scroll down to **External Read-Only API Keys**.
3. Click **Generate Key**, enter a label (e.g. `Main MERN Portal`), and copy the `tvsm_ro_...` key shown once.

### Option B — Static Key via `backend/.env`
Set `EXTERNAL_READONLY_API_KEY` (at least 16+ random characters) in `tvsmnepa`'s `backend/.env` (or Render environment variables):
```env
EXTERNAL_READONLY_API_KEY=tvsm_ro_your_64_character_random_secret_key
```

---

## Step 2: Available Read-Only Endpoints on `tvsmnepa`

Base URL: `https://<your-tvsmnepa-backend>/api/v1/external`  
Required Header: `X-API-Key: <your_secret_key>`  
Allowed HTTP Method: **`GET` only** (`POST`, `PUT`, `PATCH`, `DELETE` return `405 Method Not Allowed`).

| Endpoint | Query Parameters | Description |
| --- | --- | --- |
| `GET /status` | — | Verifies API key, returns school name, active session, class & student counts |
| `GET /sessions` | — | Lists all academic sessions |
| `GET /classes` | `sessionId`, `group` (`PRE PRIMARY`, `PRIMARY`, `MIDDLE`, `SENIOR`, `ALL`) | Lists active classes sorted Nursery → 12th with student counts |
| `GET /overview` | `date=YYYY-MM-DD`, `sessionId`, `group` | Full daily school summary, holiday status, and class-wise attendance breakdown |
| `GET /classes/:classId/attendance` | `date=YYYY-MM-DD` | Complete student roster for a class with `Present` / `Absent` / `Unmarked` status |
| `GET /attendance` | `date`, `from`, `to`, `classId`, `status`, `scholarNumber`, `search`, `page`, `limit` | Paginated individual attendance records |
| `GET /students/:scholarNumber/attendance` | `from`, `to` OR `month`, `year` | Student profile + attendance percentage + daily attendance history |
| `GET /monthly-summary` | `year=YYYY`, `month=MM`, `sessionId` | Monthly overall & class-wise attendance report |

---

## Step 3: Add a Secure Proxy Route in Your Other MERN Backend (Express)

Keep `TVSM_API_KEY` **only** in your other MERN website's **Express backend `.env`** (never in React frontend `.env`):

```env
TVSM_EXTERNAL_API_URL=https://your-tvsmnepa-backend.onrender.com/api/v1/external
TVSM_EXTERNAL_API_KEY=tvsm_ro_paste_your_generated_key_here
```

Create `routes/schoolAttendanceProxy.js` in your **other MERN Express backend**:

```javascript
const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/auth"); // <-- Your MERN website's JWT/session auth middleware

// Only logged-in/authorized users of your MERN website can access these routes
router.use(requireAuth);

async function forwardToTvsm(path, query = {}) {
  const baseUrl = process.env.TVSM_EXTERNAL_API_URL.replace(/\/+$/, "");
  const url = new URL(`${baseUrl}${path}`);

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "X-API-Key": process.env.TVSM_EXTERNAL_API_KEY,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15000),
  });

  const payload = await res.json();
  return { status: res.status, payload };
}

router.get("/overview", async (req, res) => {
  try {
    const { status, payload } = await forwardToTvsm("/overview", {
      date: req.query.date,
      group: req.query.group,
    });
    res.status(status).json(payload);
  } catch (err) {
    res.status(502).json({ success: false, message: "Attendance service unavailable" });
  }
});

router.get("/classes/:classId/attendance", async (req, res) => {
  try {
    const { status, payload } = await forwardToTvsm(
      `/classes/${encodeURIComponent(req.params.classId)}/attendance`,
      { date: req.query.date },
    );
    res.status(status).json(payload);
  } catch (err) {
    res.status(502).json({ success: false, message: "Attendance service unavailable" });
  }
});

router.get("/students/:scholarNumber/attendance", async (req, res) => {
  try {
    const { status, payload } = await forwardToTvsm(
      `/students/${encodeURIComponent(req.params.scholarNumber)}/attendance`,
      {
        from: req.query.from,
        to: req.query.to,
        month: req.query.month,
        year: req.query.year,
      },
    );
    res.status(status).json(payload);
  } catch (err) {
    res.status(502).json({ success: false, message: "Attendance service unavailable" });
  }
});

router.get("/monthly-summary", async (req, res) => {
  try {
    const { status, payload } = await forwardToTvsm("/monthly-summary", {
      year: req.query.year,
      month: req.query.month,
    });
    res.status(status).json(payload);
  } catch (err) {
    res.status(502).json({ success: false, message: "Attendance service unavailable" });
  }
});

module.exports = router;
```

Register it in your other MERN backend's `server.js` / `app.js`:
```javascript
app.use("/api/school-attendance", require("./routes/schoolAttendanceProxy"));
```

---

## Step 4: React Viewer Component for Your Other MERN Frontend

```jsx
import { useEffect, useState } from "react";

export default function SchoolAttendanceViewer() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [overview, setOverview] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classRoster, setClassRoster] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
  });

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setSelectedClass(null);
    setClassRoster(null);

    fetch(`/api/school-attendance/overview?date=${date}`, {
      headers: authHeaders(),
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Failed to load attendance");
        if (active) setOverview(json.data);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [date]);

  const loadClassStudents = async (classId) => {
    setSelectedClass(classId);
    setClassRoster(null);
    const res = await fetch(
      `/api/school-attendance/classes/${classId}/attendance?date=${date}`,
      { headers: authHeaders() },
    );
    const json = await res.json();
    if (res.ok) setClassRoster(json.data);
  };

  if (loading) return <p>Loading attendance data...</p>;
  if (error) return <p style={{ color: "crimson" }}>{error}</p>;
  if (!overview) return null;

  const { summary, classes } = overview;

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0 }}>{overview.schoolName} — Attendance</h2>
          <small>
            Session: {overview.session?.name} | Date: {overview.date} ({overview.dayName})
          </small>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, margin: "20px 0" }}>
        <div style={{ padding: 14, border: "1px solid #ddd", borderRadius: 8 }}>
          <div>Total Students</div>
          <strong>{summary.totalStudents}</strong>
        </div>
        <div style={{ padding: 14, border: "1px solid #ddd", borderRadius: 8 }}>
          <div>Present</div>
          <strong style={{ color: "green" }}>{summary.present}</strong>
        </div>
        <div style={{ padding: 14, border: "1px solid #ddd", borderRadius: 8 }}>
          <div>Absent</div>
          <strong style={{ color: "crimson" }}>{summary.absent}</strong>
        </div>
        <div style={{ padding: 14, border: "1px solid #ddd", borderRadius: 8 }}>
          <div>Attendance %</div>
          <strong>{summary.attendancePercentage}%</strong>
        </div>
      </div>

      {/* Class Breakdown Table */}
      <table border="1" cellPadding="10" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Class</th>
            <th>Teacher</th>
            <th>Total</th>
            <th>Present</th>
            <th>Absent</th>
            <th>Unmarked</th>
            <th>%</th>
            <th>Students</th>
          </tr>
        </thead>
        <tbody>
          {classes.map((cls) => (
            <tr key={cls.classId}>
              <td>{cls.fullName}</td>
              <td>{cls.classTeacher || "—"}</td>
              <td>{cls.totalStudents}</td>
              <td>{cls.present}</td>
              <td>{cls.absent}</td>
              <td>{cls.unmarked}</td>
              <td>{cls.percentage}%</td>
              <td>
                <button onClick={() => loadClassStudents(cls.classId)}>
                  View Roster
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Selected Class Student Roster */}
      {selectedClass && classRoster && (
        <div style={{ marginTop: 24 }}>
          <h3>{classRoster.class.fullName} — Student Attendance ({classRoster.date})</h3>
          <table border="1" cellPadding="8" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>Scholar No</th>
                <th>Student Name</th>
                <th>Father&apos;s Name</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {classRoster.students.map((st) => (
                <tr key={st.studentId}>
                  <td>{st.scholarNumber}</td>
                  <td>{st.name}</td>
                  <td>{st.fatherName}</td>
                  <td>{st.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```
