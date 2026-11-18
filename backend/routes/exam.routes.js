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
router.get("/mine/report-cards", authorize(ROLES.CLASS), examController.myReportCards);
router.put("/mine/report-cards/remarks", authorize(ROLES.CLASS), examController.saveMyRemarks);
router.get("/mine/:id", authorize(ROLES.CLASS), examController.getMine);
router.get("/mine/:id/results", authorize(ROLES.CLASS), examController.myResults);
router.get("/mine/:id/marks", authorize(ROLES.CLASS), examController.marksOverview);
router.post("/mine/:id/marks/submit", authorize(ROLES.CLASS), examController.submitMarks);
router.get(
  "/mine/:id/marks/:subjectKey",
  authorize(ROLES.CLASS),
  examController.marksSheet,
);
router.put(
  "/mine/:id/marks/:subjectKey",
  authorize(ROLES.CLASS),
  examController.saveMarks,
);
router.get(
  "/mine/:id/roll-numbers",
  authorize(ROLES.CLASS),
  examController.getMyRollNumbers,
);

// Everything below is Admin-only, enforced on the server.
router.use(adminOnly);

// Report cards (registered before "/:id" so "report-cards" is not read as an ID).
router.get("/report-cards", examController.reportCardData);
router.put("/report-cards/fields", examController.saveReportCardFields);
router.post("/report-cards/ranks/approve", examController.approveRanks);
router.post("/report-cards/ranks/revoke", examController.revokeRanks);

router.get("/", examController.list);
router.post("/", examController.create);
router.get("/:id", examController.getById);
router.put("/:id", examController.update);
router.delete("/:id", examController.remove);
router.patch("/:id/status", examController.changeStatus);
router.get("/:id/audit", examController.listAudit);

router.get("/:id/results", examController.listResults);
router.get("/:id/results/validate", examController.validateResults);
router.post("/:id/results/calculate", examController.calculateResults);
router.get("/:id/results/publish-summary", examController.publishSummary);
router.post("/:id/results/publish", examController.publishResults);
router.post("/:id/results/withdraw", examController.withdrawResults);
router.get("/:id/marks/monitor", examController.monitorMarks);
router.get("/:id/marks/:classId/:subjectKey", examController.adminMarksSheet);
router.put("/:id/marks/:classId/:subjectKey", examController.correctMarks);
router.post("/:id/marks/:classId/reopen", examController.reopenMarks);
router.post("/:id/marks/:classId/lock", examController.lockMarks);
router.post("/:id/marks/:classId/unlock", examController.unlockMarks);

router.post("/:id/admit-cards", examController.buildAdmitCards);

router.get("/:id/roll-numbers", examController.getRollNumbers);
router.post(
  "/:id/roll-numbers/:classId/generate",
  examController.generateRollNumbers,
);
router.put(
  "/:id/roll-numbers/:classId/:studentId",
  examController.updateRollNumber,
);

router.get("/:id/timetable", examController.getTimetable);
router.put("/:id/timetable/:classId", examController.saveClassTimetable);

router.get("/:id/classes", examController.listClassConfigs);
router.put("/:id/classes", examController.upsertClassConfigs);
router.delete("/:id/classes/:classId", examController.removeClassConfig);

module.exports = router;
