"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { stub, fresh } = require("./helpers");

let students = 0, exams = 0;
const deletedClasses = [], deletedUsers = [];
stub("repositories/class.repository.js", {
  findById: async (id) => ({ _id: id, name: "5", section: "A" }),
  deleteById: async (id) => { deletedClasses.push(id); },
});
stub("repositories/student.repository.js", { count: async () => students });
stub("models/Settings.model.js", {});
stub("models/User.model.js", { deleteOne: async (f) => { deletedUsers.push(f); } });
stub("models/exam/ExamClassConfig.model.js", { countDocuments: async () => exams });
stub("utils/passwordHelper.js", { hashPassword: async (p) => p });
stub("middlewares/audit.middleware.js", { createAuditLog: async () => {} });
const svc = fresh("services/class.service.js");

test("class with students cannot be deleted", async () => {
  students = 3; exams = 0; deletedClasses.length = 0;
  await assert.rejects(() => svc.delete("c1", {}, {}), { statusCode: 409 });
  assert.strictEqual(deletedClasses.length, 0);
});

test("class used in an exam cannot be deleted", async () => {
  students = 0; exams = 1; deletedClasses.length = 0;
  await assert.rejects(() => svc.delete("c1", {}, {}), { statusCode: 409 });
  assert.strictEqual(deletedClasses.length, 0);
});

test("empty unused class is deleted together with its login only", async () => {
  students = 0; exams = 0; deletedClasses.length = 0; deletedUsers.length = 0;
  await svc.delete("c1", {}, {});
  assert.deepStrictEqual(deletedClasses, ["c1"]);
  assert.deepStrictEqual(deletedUsers, [{ linkedClass: "c1", role: "class" }]);
});
