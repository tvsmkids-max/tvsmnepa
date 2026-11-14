"use strict";

const express = require("express");
const router = express.Router();
const examController = require("../controllers/exam/exam.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { adminOnly, authorize } = require("../middlewares/rbac.middleware");
const { ROLES } = require("../constants/roles");

router.use(authenticate);

// Class teacher (class login): read-only, own class only. The class is taken
// from the account's linked class on the server, never from the request.
// Registered BEFORE the admin routes so "/mine" is not read as an exam ID.
router.get("/mine", authorize(ROLES.CLASS), examController.listMine);
router.get("/mine/:id", authorize(ROLES.CLASS), examController.getMine);

// Everything below is Admin-only, enforced on the server.
router.use(adminOnly);

router.get("/", examController.list);
router.post("/", examController.create);
router.get("/:id", examController.getById);
router.put("/:id", examController.update);
router.delete("/:id", examController.remove);
router.patch("/:id/status", examController.changeStatus);
router.get("/:id/audit", examController.listAudit);

router.get("/:id/classes", examController.listClassConfigs);
router.put("/:id/classes", examController.upsertClassConfigs);
router.delete("/:id/classes/:classId", examController.removeClassConfig);

module.exports = router;
