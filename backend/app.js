"use strict";

require("express-async-errors");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const cookieParser = require("cookie-parser");
const path = require("path");

const env = require("./config/env");
const corsOptions = require("./config/cors");
const logger = require("./utils/logger");
const {
  errorHandler,
  notFoundHandler,
} = require("./middlewares/errorHandler.middleware");
const { auditMiddleware } = require("./middlewares/audit.middleware");
const routes = require("./routes/index");

const app = express();

// ─── Security Headers ─────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  }),
);

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// ═══════════════════════════════════════════════════════════════════════════
//   RATE LIMITERS — Tuned for production school usage (25+ concurrent users)
// ═══════════════════════════════════════════════════════════════════════════

// Global API limit — allows heavy normal usage
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3000, // 1000 requests per 15 min per IP (plenty for 25 teachers)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again in a few minutes.",
    statusCode: 429,
  },
  skip: (req) => req.path === "/api/v1/health",
});

// Login limit — protects against brute force but allows normal logins
// Per IP: handles ~25 teachers + admins refreshing/relogging
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 100 login attempts per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Too many login attempts from your network. Please wait 15 minutes and try again.",
    statusCode: 429,
  },
  // Don't count successful logins toward the limit
  skipSuccessfulRequests: true,
});

// Auth refresh limit — generous, supports auto-refresh every 7 days
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500, // 200 refresh tokens per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many token refresh attempts.",
    statusCode: 429,
  },
});

// Attendance marking — high limit since it's the main daily action
const attendanceLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 500, // 200 attendance saves per 5 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many attendance updates. Please wait a moment.",
    statusCode: 429,
  },
});

// Apply limiters
app.use("/api/", globalLimiter);
app.use("/api/v1/auth/login", loginLimiter);
app.use("/api/v1/auth/refresh", refreshLimiter);
app.use("/api/v1/attendance/mark", attendanceLimiter);

// ─── Body Parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// ─── Data Sanitization ────────────────────────────────────────────────────────
app.use(
  mongoSanitize({
    replaceWith: "_",
    onSanitize: ({ req, key }) => {
      logger.warn(`Sanitized dangerous key: ${key} from ${req.ip}`);
    },
  }),
);

// ─── Compression ──────────────────────────────────────────────────────────────
app.use(
  compression({
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) return false;
      return compression.filter(req, res);
    },
    threshold: 1024,
  }),
);

// ─── HTTP Logging ─────────────────────────────────────────────────────────────
if (env.NODE_ENV !== "test") {
  app.use(
    morgan("combined", {
      stream: logger.stream,
      skip: (req) => req.path === "/api/v1/health",
    }),
  );
}

// ─── Static Files ─────────────────────────────────────────────────────────────
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    maxAge: "1d",
    etag: true,
  }),
);

// ─── Audit Middleware ─────────────────────────────────────────────────────────
app.use(auditMiddleware);

// ─── Trust Proxy ──────────────────────────────────────────────────────────────
app.set("trust proxy", 1);

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/v1", routes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use(notFoundHandler);

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
