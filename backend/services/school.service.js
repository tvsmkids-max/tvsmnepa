"use strict";

const School = require("../models/School.model");
const { SCHOOL_STATUS } = require("../models/School.model");
const { checkImageDataUrl } = require("../utils/imageData");
const escapeRegex = require("../utils/escapeRegex");

const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
const TEXT = ["name", "address", "recognition", "udiseCode", "affiliationCode", "footer", "phone", "email"];
const CODE_RE = /^[A-Z0-9]{2,12}$/;

const brief = (s) => ({
  _id: s._id,
  code: s.code,
  name: s.name,
  status: s.status,
  logo: s.logo || null,
  udiseCode: s.udiseCode,
  createdAt: s.createdAt,
});

class SchoolService {
  async list({ q } = {}) {
    const filter = q ? { $or: [{ name: new RegExp(escapeRegex(String(q)), "i") }, { code: new RegExp(escapeRegex(String(q).toUpperCase())) }] } : {};
    const rows = await School.find(filter).sort({ name: 1 }).lean();
    return rows.map(brief);
  }

  async get(id) {
    const s = await School.findById(id).lean();
    if (!s) throw fail("School not found", 404);
    return s;
  }

  _apply(doc, body) {
    for (const f of TEXT) if (body[f] !== undefined) doc[f] = String(body[f]);
    if (body.nameLines !== undefined) {
      if (!Array.isArray(body.nameLines) || body.nameLines.length > 2) throw fail("Name lines: at most 2 lines");
      doc.nameLines = body.nameLines.map((l) => String(l).trim().slice(0, 80)).filter(Boolean);
    }
    if (body.logo !== undefined) doc.logo = checkImageDataUrl(body.logo, "Logo");
    if (body.principalSignature !== undefined) doc.principalSignature = checkImageDataUrl(body.principalSignature, "Signature");
    if (doc.email && !/^\S+@\S+\.\S+$/.test(doc.email)) throw fail("Enter a valid email");
  }

  async create(ownerId, body) {
    const code = String(body.code || "").trim().toUpperCase();
    if (!CODE_RE.test(code)) throw fail("School code must be 2–12 letters or digits");
    if (!String(body.name || "").trim()) throw fail("School name is required");
    if (await School.exists({ code })) throw fail("This school code is already used", 409);
    const doc = new School({ code, name: String(body.name).trim(), createdBy: ownerId, updatedBy: ownerId });
    this._apply(doc, body);
    await doc.save();
    return doc.toObject();
  }

  // The login code is never changed after creation (users will rely on it).
  async update(ownerId, id, body) {
    const doc = await School.findById(id);
    if (!doc) throw fail("School not found", 404);
    this._apply(doc, body);
    if (!doc.name.trim()) throw fail("School name is required");
    doc.updatedBy = ownerId;
    await doc.save();
    return doc.toObject();
  }

  async setStatus(ownerId, id, status) {
    if (!Object.values(SCHOOL_STATUS).includes(status)) throw fail("Invalid status");
    const doc = await School.findByIdAndUpdate(id, { $set: { status, updatedBy: ownerId } }, { new: true });
    if (!doc) throw fail("School not found", 404);
    return doc.toObject();
  }
}

module.exports = new SchoolService();
