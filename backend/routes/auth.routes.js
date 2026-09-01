"use strict";

const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { authenticate } = require("../middlewares/auth.middleware");

// Public routes (no auth required)
router.get("/login-options", authController.getLoginOptions); // Powers the dropdown
router.post("/login", authController.login);
router.post("/refresh", authController.refreshToken);

// Protected routes (auth required)
router.post("/logout", authenticate, authController.logout);
router.post("/change-password", authenticate, authController.changePassword);
router.get("/me", authenticate, authController.getMe);

module.exports = router;
