"use strict";

const http = require("http");
const app = require("./app");
const env = require("./config/env");
const { connectDB } = require("./config/db");
const logger = require("./utils/logger");
const { initScheduler } = require("./utils/scheduler");

const server = http.createServer(app);

const SHUTDOWN_TIMEOUT = 10000;

const startServer = async () => {
  try {
    await connectDB();

    server.listen(env.PORT, async () => {
      logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      logger.info("  SCHOOL ATTENDANCE MANAGEMENT SYSTEM");
      logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      logger.info(`  Environment : ${env.NODE_ENV}`);
      logger.info(`  Port        : ${env.PORT}`);
      logger.info(`  API Base    : http://localhost:${env.PORT}/api/v1`);
      logger.info(`  Health      : http://localhost:${env.PORT}/api/v1/health`);
      logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      // Initialize cron scheduler after server starts
      try {
        await initScheduler();
      } catch (error) {
        logger.error(`Scheduler init failed: ${error.message}`);
      }
    });

    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        logger.error(`Port ${env.PORT} is already in use`);
      } else {
        logger.error(`Server error: ${error.message}`);
      }
      process.exit(1);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

const gracefulShutdown = (signal) => {
  logger.info(`\n${signal} received. Starting graceful shutdown...`);

  const timeout = setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT);

  server.close(async () => {
    clearTimeout(timeout);
    const { disconnectDB } = require("./config/db");
    await disconnectDB();
    logger.info("Server shut down gracefully");
    process.exit(0);
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("unhandledRejection", (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

process.on("uncaughtException", (error) => {
  logger.error(`Uncaught Exception: ${error.message}`, { stack: error.stack });
  process.exit(1);
});

startServer();
