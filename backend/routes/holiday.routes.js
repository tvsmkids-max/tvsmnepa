"use strict";

const express = require("express");
const router = express.Router();
const holidayController = require("../controllers/holiday.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { adminOnly, adminOrTeacher } = require("../middlewares/rbac.middleware");

router.use(authenticate);

router.get("/", adminOrTeacher, holidayController.list);
router.get("/check/:date", adminOrTeacher, holidayController.checkDate);
router.get("/:id", adminOrTeacher, holidayController.getById);
router.post("/", adminOnly, holidayController.create);
router.put("/:id", adminOnly, holidayController.update);
router.delete("/:id", adminOnly, holidayController.remove);

module.exports = router;
