"use strict";

const ROLES = {
  ADMIN: "admin",
  CLASS: "class", // Changed from "teacher" to "class"
};

const ROLE_LIST = Object.values(ROLES);

module.exports = { ROLES, ROLE_LIST };
