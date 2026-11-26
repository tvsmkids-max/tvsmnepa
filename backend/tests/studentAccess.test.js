"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { stub, fresh } = require("./helpers");

const created = [];
stub("repositories/student.repository.js", {
  findByScholarNumber: async () => null,
  findOne: async () => null,
  create: async (d) => {
    created.push(d);
    return { _id: "s1", ...d };
  },
});
stub("repositories/class.repository.js", {
  findById: async (id) => ({ _id: id, section: "A" }),
});
stub("models/Settings.model.js", {
  getSettings: async () => ({ activeSession: "sess1" }),
});
stub("middlewares/audit.middleware.js", { createAuditLog: async () => {} });
const svc = fresh("services/student.service.js");

const data = (cls) => ({
  name: "A",
  scholarNumber: "1",
  class: cls,
  session: "sess1",
});

test("class login cannot add a student to another class", async () => {
  const user = { _id: "u", role: "class", linkedClass: "classA" };
  await assert.rejects(() => svc.create(data("classB"), user, {}), {
    statusCode: 403,
  });
  assert.strictEqual(created.length, 0);
});

test("class login without a linked class is refused", async () => {
  const user = { _id: "u", role: "class", linkedClass: null };
  await assert.rejects(() => svc.create(data("classA"), user, {}), {
    statusCode: 403,
  });
});

test("class login adding to own class is forced to that class", async () => {
  const user = { _id: "u", role: "class", linkedClass: "classA" };
  await svc.create(data("classA"), user, {});
  assert.strictEqual(String(created[0].class), "classA");
});

test("admin can add to any class", async () => {
  const user = { _id: "a", role: "admin" };
  await svc.create(data("classB"), user, {});
  assert.strictEqual(String(created[created.length - 1].class), "classB");
});
