"use strict";

const express = require("express");
const router = express.Router();
const shiftController = require("../controllers/shift.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { adminOnly } = require("../middlewares/rbac.middleware");

router.use(authenticate);
router.use(adminOnly); // Admin only — sensitive operation

router.post("/preview", shiftController.preview);
router.post("/execute", shiftController.execute);

module.exports = router;
