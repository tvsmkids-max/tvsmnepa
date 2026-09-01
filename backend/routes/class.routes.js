"use strict";

const express = require("express");
const router = express.Router();
const classController = require("../controllers/class.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { adminOnly, adminOrTeacher } = require("../middlewares/rbac.middleware");

router.use(authenticate);

router.get("/", adminOrTeacher, classController.list);
router.get("/:id", adminOrTeacher, classController.getById);
router.post("/", adminOnly, classController.create);
router.put("/:id", adminOnly, classController.update);
router.delete("/:id", adminOnly, classController.remove);
router.patch("/:id/archive", adminOnly, classController.archive);
router.patch("/:id/reset-password", adminOnly, classController.resetPassword);

module.exports = router;
