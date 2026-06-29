"use strict";

const express = require("express");
const router = express.Router();
const principalController = require("../controllers/principal.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { adminOrPrincipal } = require("../middlewares/rbac.middleware");

router.use(authenticate);

// Principal dashboard (admin can also access for testing)
router.get("/dashboard", adminOrPrincipal, principalController.getDashboard);

module.exports = router;
