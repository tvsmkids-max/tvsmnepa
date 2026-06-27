"use strict";

const authService = require("../services/auth.service");
const { sendResponse } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { validateBody } = require("../middlewares/validate.middleware");
const {
  loginSchema,
  changePasswordSchema,
  refreshTokenSchema,
} = require("../validators/auth.validator");

const login = [
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const { user, tokens } = await authService.login({ email, password, req });

    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return sendResponse(res).success({
      message: "Login successful",
      data: {
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  }),
];

const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;

  await authService.logout({
    userId: req.user._id,
    refreshToken,
    req,
    user: req.user,
  });

  res.clearCookie("refreshToken");

  return sendResponse(res).success({ message: "Logged out successfully" });
});

const refreshToken = [
  asyncHandler(async (req, res) => {
    const token = req.body.refreshToken || req.cookies?.refreshToken;

    if (!token) {
      return sendResponse(res).unauthorized({
        message: "Refresh token required",
      });
    }

    const { accessToken } = await authService.refreshAccessToken(token);

    return sendResponse(res).success({
      message: "Token refreshed successfully",
      data: { accessToken },
    });
  }),
];

const changePassword = [
  validateBody(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    await authService.changePassword({
      userId: req.user._id,
      currentPassword,
      newPassword,
      req,
      user: req.user,
    });

    return sendResponse(res).success({
      message: "Password changed successfully",
    });
  }),
];

const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user._id);
  return sendResponse(res).success({
    message: "User profile fetched",
    data: user,
  });
});

module.exports = { login, logout, refreshToken, changePassword, getMe };
