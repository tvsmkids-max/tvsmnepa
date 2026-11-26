"use strict";

// SAFETY: these tests never open a database connection. Any attempt to connect
// fails loudly, so they cannot read or change real school data.
const mongoose = require("mongoose");
mongoose.connect = () => {
  throw new Error("Tests must not connect to a database");
};
process.env.MONGODB_URI = "";

const path = require("path");

// Replace a module with a stub before the code under test loads it.
const stub = (relFromBackend, exportsObj) => {
  const abs = require.resolve(path.join(__dirname, "..", relFromBackend));
  require.cache[abs] = {
    id: abs,
    filename: abs,
    loaded: true,
    exports: exportsObj,
  };
  return abs;
};

const fresh = (relFromBackend) => {
  const abs = require.resolve(path.join(__dirname, "..", relFromBackend));
  delete require.cache[abs];
  return require(abs);
};

module.exports = { stub, fresh };
