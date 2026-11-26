"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { stub, fresh } = require("./helpers");

// Chainable query stub: .select().lean() and .lean() both resolve to `rows`.
const q = (rows) => {
  const o = { select: () => o, lean: async () => rows, then: (res) => res(rows) };
  return o;
};

let sourceStudents = [];
let alreadyInTarget = [];
let existingInTargetClass = [];
let inserted = [];
let insertBehaviour = null;
const finds = [];

stub("models/Student.model.js", {
  find: (filter) => {
    finds.push(filter);
    if (filter._id) return q(sourceStudents);                       // selected students in source
    if (filter.scholarNumber) return q(alreadyInTarget);            // already promoted check
    return q(existingInTargetClass);                                // rolls already in target class
  },
  insertMany: async (docs) => {
    if (insertBehaviour) return insertBehaviour(docs);
    inserted = docs;
    return docs;
  },
});
stub("models/Class.model.js", {
  findById: (id) => q({ _id: id, name: id === "tgt" ? "3" : "2", section: "A" }),
});
stub("models/AcademicSession.model.js", {
  findById: (id) => q({ _id: id, name: id }),
});
stub("middlewares/audit.middleware.js", { createAuditLog: async () => {} });
stub("utils/logger.js", { error: () => {}, info: () => {}, warn: () => {} });
const svc = fresh("services/promotion.service.js");

const stu = (id, sn) => ({ _id: id, scholarNumber: sn, name: id, rollNumber: "1", gender: "Male" });
const run = () =>
  svc.execute({
    sourceClassId: "src", sourceSessionId: "s1", targetClassId: "tgt", targetSessionId: "s2",
    studentIds: ["a", "b"], user: { _id: "u", role: "admin" }, req: {},
  });
const reset = () => { sourceStudents = []; alreadyInTarget = []; existingInTargetClass = []; inserted = []; insertBehaviour = null; finds.length = 0; };

test("source and target session must differ", async () => {
  reset();
  await assert.rejects(
    () => svc.execute({ sourceClassId: "src", sourceSessionId: "s1", targetClassId: "tgt", targetSessionId: "s1", studentIds: ["a"], user: {}, req: {} }),
    { statusCode: 400 },
  );
});

test("promotion creates new records and never touches the source students", async () => {
  reset();
  sourceStudents = [stu("a", "101"), stu("b", "102")];
  const r = await run();
  assert.strictEqual(r.promoted, 2);
  assert.strictEqual(inserted.length, 2);
  assert.ok(inserted.every((d) => d.session === "s2" && d.class === "tgt" && d._id === undefined));
  assert.deepStrictEqual(inserted.map((d) => d.scholarNumber), ["101", "102"]);
});

test("students already promoted are skipped, not duplicated", async () => {
  reset();
  sourceStudents = [stu("a", "101"), stu("b", "102")];
  alreadyInTarget = [{ scholarNumber: "101" }];
  const r = await run();
  assert.strictEqual(r.promoted, 1);
  assert.strictEqual(r.skipped, 1);
  assert.deepStrictEqual(inserted.map((d) => d.scholarNumber), ["102"]);
});

test("promoting only already-promoted students is refused", async () => {
  reset();
  sourceStudents = [stu("a", "101")];
  alreadyInTarget = [{ scholarNumber: "101" }];
  await assert.rejects(() => run(), { statusCode: 400 });
  assert.strictEqual(inserted.length, 0);
});

test("new roll numbers continue after the highest existing roll in the target class", async () => {
  reset();
  sourceStudents = [stu("a", "101"), stu("b", "102")];
  existingInTargetClass = [{ rollNumber: "5" }, { rollNumber: "9" }];
  await run();
  assert.deepStrictEqual(inserted.map((d) => d.rollNumber), ["10", "11"]);
});

test("only Active students of the source class and session are selected", async () => {
  reset();
  sourceStudents = [stu("a", "101")];
  await run();
  const f = finds.find((x) => x._id);
  assert.strictEqual(f.class, "src");
  assert.strictEqual(f.session, "s1");
  assert.strictEqual(f.status, "Active");
});

test("a failed insert without partial results is reported as failed, not silent", async () => {
  reset();
  sourceStudents = [stu("a", "101"), stu("b", "102")];
  insertBehaviour = async () => { throw new Error("db down"); };
  const r = await run();
  assert.strictEqual(r.promoted, 0);
  assert.strictEqual(r.failed, 2);
});

test("a partial insert failure reports how many were created and how many failed", async () => {
  reset();
  sourceStudents = [stu("a", "101"), stu("b", "102")];
  insertBehaviour = async () => { throw Object.assign(new Error("dup"), { insertedDocs: [{}] }); };
  const r = await run();
  assert.strictEqual(r.promoted, 1);
  assert.strictEqual(r.failed, 1);
});
