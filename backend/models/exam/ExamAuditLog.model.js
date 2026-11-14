"use strict";

const mongoose = require("mongoose");

// Dedicated, append-only audit trail for the Examination module.
// Deliberately NO TTL index: unlike ActivityLog (7-day expiry) these records
// must survive for the life of the examination data.
const examAuditLogSchema = new mongoose.Schema(
  {
    exam: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", index: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", default: null },
    action: { type: String, required: true },
    actor: {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      name: { type: String, default: "" },
      role: { type: String, default: "" },
    },
    reason: { type: String, default: "" },
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },
    ip: { type: String, default: "" },
    at: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false },
);

// Append-only: block updates/deletes through the model API.
const blocked = function (next) {
  next(new Error("Examination audit records are append-only"));
};
["updateOne", "updateMany", "findOneAndUpdate", "findOneAndDelete",
 "deleteOne", "deleteMany", "findOneAndReplace", "replaceOne"].forEach((op) =>
  examAuditLogSchema.pre(op, blocked),
);

module.exports = mongoose.model("ExamAuditLog", examAuditLogSchema);
