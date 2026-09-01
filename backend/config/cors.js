"use strict";

const env = require("./env");
const logger = require("../utils/logger");

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

    // In development, allow localhost and local network IPs
    if (
      env.IS_DEVELOPMENT &&
      (origin.includes("localhost") || 
       origin.includes("127.0.0.1") ||
       origin.includes("10.189.16.3"))
    ) {
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
