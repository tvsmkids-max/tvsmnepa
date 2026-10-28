"use strict";

const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { adminOnly } = require("../middlewares/rbac.middleware");

router.use(authenticate, adminOnly);
router.get("/", userController.list);
router.patch("/:id/status", userController.setStatus);
router.patch("/:id/reset-credential", userController.resetCredential);
router.patch("/:id/unlock", userController.unlock);

module.exports = router;
