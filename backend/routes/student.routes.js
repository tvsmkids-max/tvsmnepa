"use strict";

const express = require("express");
const router = express.Router();
const studentController = require("../controllers/student.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { adminOnly, adminOrTeacher } = require("../middlewares/rbac.middleware");

router.use(authenticate);

router.get("/search", adminOrTeacher, studentController.search);
router.get("/", adminOrTeacher, studentController.list);
router.get("/:id", adminOrTeacher, studentController.getById);
router.post("/", adminOrTeacher, studentController.create);
router.put("/:id", adminOrTeacher, studentController.update);
router.patch("/:id/status", adminOnly, studentController.updateStatus);
router.delete("/:id", adminOnly, studentController.remove);

module.exports = router;
