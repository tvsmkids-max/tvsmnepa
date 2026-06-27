"use strict";

const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { authenticate } = require("../middlewares/auth.middleware");

router.post("/login", authController.login);
router.post("/logout", authenticate, authController.logout);
router.post("/refresh", authController.refreshToken);
router.post("/change-password", authenticate, authController.changePassword);
router.get("/me", authenticate, authController.getMe);

module.exports = router;
