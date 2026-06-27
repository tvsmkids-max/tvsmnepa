"use strict";

const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analytics.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { adminOrTeacher } = require("../middlewares/rbac.middleware");

router.use(authenticate);
router.use(adminOrTeacher);

router.get("/quick-stats", analyticsController.getQuickStats);
router.get("/trend", analyticsController.getTrend);
router.get("/class-comparison", analyticsController.getClassComparison);
router.get("/distribution", analyticsController.getDistribution);
router.get("/top-defaulters", analyticsController.getTopDefaulters);
router.get("/insights", analyticsController.getInsights);

module.exports = router;
