"use strict";

const express = require("express");
const router = express.Router();
const promotionController = require("../controllers/promotion.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { adminOnly } = require("../middlewares/rbac.middleware");

router.use(authenticate);
router.use(adminOnly);

router.post("/preview", promotionController.preview);
router.post("/execute", promotionController.execute);

module.exports = router;
