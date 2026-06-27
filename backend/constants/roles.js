"use strict";

const ROLES = Object.freeze({
  ADMIN: "admin",
  TEACHER: "teacher",
});

const ROLE_LIST = Object.values(ROLES);

module.exports = { ROLES, ROLE_LIST };
