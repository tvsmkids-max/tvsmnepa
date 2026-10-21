"use strict";

const env = require("./env");
const logger = require("../utils/logger");
const isPrivateDevelopmentOrigin = (origin) => {
  try {
    const { protocol, hostname, port } = new URL(origin);

    if (!["http:", "https:"].includes(protocol)) return false;
    if (hostname === "localhost" || hostname === "127.0.0.1") return true;

    // Permit the common private IPv4 ranges only while developing locally.
    // This keeps phones on the same Wi-Fi working when DHCP changes this PC's IP.
    const octets = hostname.split(".").map(Number);
    if (
      octets.length !== 4 ||
      octets.some(
        (octet) => !Number.isInteger(octet) || octet < 0 || octet > 255,
      )
    ) {
      return false;
    }

    const [first, second] = octets;
    return (
      port === "5173" &&
      (first === 10 ||
        (first === 192 && second === 168) ||
        (first === 172 && second >= 16 && second <= 31))
    );
  } catch {
    return false;
  }
};

const corsOptions = {
  origin: (origin, callback) => {
    // Allow no-origin requests (mobile apps, Postman, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    // Check allowed origins
    if (env.ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }

    // In development, allow the Vite dev server from this private network.
    if (env.IS_DEVELOPMENT && isPrivateDevelopmentOrigin(origin)) {
      return callback(null, true);
    }

    logger.warn(`CORS blocked: ${origin}`);
    return callback(new Error(`Origin ${origin} not allowed`), false);
  },

  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],

  exposedHeaders: ["X-Total-Count", "Content-Disposition"],
  credentials: true,
  maxAge: 86400,
  optionsSuccessStatus: 200,
};

module.exports = corsOptions;
