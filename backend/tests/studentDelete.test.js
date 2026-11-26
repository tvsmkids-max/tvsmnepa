"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { stub, fresh } = require("./helpers");

const calls = [];
const model = (name) => ({
  deleteMany: async (filter) => {
    calls.push({ name, filter });
    return { deletedCount: 2 };
  },
});
stub("models/Attendance.model.js", model("Attendance"));
stub("models/exam/ExamMarks.model.js", model("ExamMarks"));
stub("models/exam/ExamResult.model.js", model("ExamResult"));
stub("models/exam/ExamRollNumber.model.js", model("ExamRollNumber"));
stub("models/exam/ExamReportCardMeta.model.js", model("ExamReportCardMeta"));
const deleted = [];
stub("repositories/student.repository.js", {
  findById: async (id) => ({ _id: id, name: "N", scholarNumber: "1" }),
  deleteById: async (id) => {
    deleted.push(id);
  },
  findByIds: async () => [],
});
stub("repositories/class.repository.js", {});
stub("models/Settings.model.js", { getSettings: async () => ({}) });
stub("middlewares/audit.middleware.js", { createAuditLog: async () => {} });
const svc = fresh("services/student.service.js");

test("single delete removes only that student's records, never an open filter", async () => {
  calls.length = 0;
  await svc.delete("stu1", { _id: "a", role: "admin" }, {});
  assert.deepStrictEqual(deleted, ["stu1"]);
  assert.strictEqual(calls.length, 5);
  for (const c of calls) {
    assert.deepStrictEqual(Object.keys(c.filter), ["student"]);
    assert.deepStrictEqual(c.filter.student.$in.map(String), ["stu1"]);
  }
});
