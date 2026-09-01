"use strict";

const classRepository = require("../repositories/class.repository");
const studentRepository = require("../repositories/student.repository");
const Settings = require("../models/Settings.model");
const User = require("../models/User.model");
const { hashPassword } = require("../utils/passwordHelper");
const { createAuditLog } = require("../middlewares/audit.middleware");

const DEFAULT_CLASS_PIN = "88898";

const throwError = (message, statusCode = 400) => {
  throw Object.assign(new Error(message), { statusCode });
};

const linkedClassId = (user) => {
  if (!user?.linkedClass) return null;
  return user.linkedClass._id || user.linkedClass;
};

class ClassService {
  async list(query, user) {
    const { page, limit, sort, ...filterParams } = query;
    const filter = { ...filterParams };
    if (filter.isArchived === undefined) filter.isArchived = false;

    // ─── RBAC: NEVER fail open ───
    if (!user || !user.role) {
      return {
        data: [],
        pagination: { page: 1, limit: 0, total: 0, totalPages: 0 },
      };
    }

    if (user.role === "class") {
      // Class users should not use Classes admin UI; API still returns only own class
      const linkedId = linkedClassId(user);
      if (!linkedId) {
        return {
          data: [],
          pagination: { page: 1, limit: 0, total: 0, totalPages: 0 },
        };
      }
      filter._id = linkedId;
    } else if (user.role === "admin") {
      if (!filter.session && !filter.all) {
        const settings = await Settings.getSettings();
        if (settings?.activeSession) {
          filter.session = settings.activeSession;
        }
      }
      delete filter.all;
    } else {
      return {
        data: [],
        pagination: { page: 1, limit: 0, total: 0, totalPages: 0 },
      };
    }

    const result = await classRepository.findAll(filter, {
      page,
      limit,
      sort,
      populate: [{ path: "session", select: "name" }],
    });

    if (result.data.length > 0) {
      const Student = require("../models/Student.model");
      const classIds = result.data.map((c) => c._id);

      const counts = await Student.aggregate([
        {
          $match: {
            class: { $in: classIds },
            status: "Active",
            isActive: true,
          },
        },
        { $group: { _id: "$class", count: { $sum: 1 } } },
      ]);

      const countMap = {};
      counts.forEach((c) => {
        countMap[c._id.toString()] = c.count;
      });

      result.data = result.data.map((cls) => ({
        ...cls,
        studentCount: countMap[cls._id.toString()] || 0,
      }));
    }

    return result;
  }

  async getById(id, user) {
    const cls = await classRepository.findById(id, [
      { path: "session", select: "name startDate endDate" },
      { path: "createdBy", select: "name" },
    ]);

    if (!cls) throwError("Class not found", 404);

    if (user?.role === "class") {
      const linkedId = linkedClassId(user)?.toString();
      if (!linkedId || cls._id.toString() !== linkedId) {
        throwError("Access denied", 403);
      }
    }

    const studentCount = await studentRepository.count({
      class: cls._id,
      status: "Active",
    });

    return { ...cls, studentCount };
  }

  async create(data, user, req) {
    const exists = await classRepository.exists({
      name: data.name,
      section: data.section,
      session: data.session,
    });

    if (exists) {
      throwError(
        `Class "${data.name} - ${data.section}" already exists in this session`,
        409,
      );
    }

    const cls = await classRepository.create({
      ...data,
      createdBy: user._id,
    });

    const hashedPin = await hashPassword(DEFAULT_CLASS_PIN);
    await User.create({
      name: `${cls.name}-${cls.section}`,
      password: hashedPin,
      role: "class",
      linkedClass: cls._id,
      isActive: true,
    });

    await createAuditLog({
      user,
      action: "CREATE",
      module: "Class",
      description: `Created class ${cls.name} - ${cls.section} (Login PIN account created)`,
      resourceId: cls._id,
      resourceType: "Class",
      after: cls,
      req,
    });

    return cls;
  }

  async update(id, data, user, req) {
    const existing = await classRepository.findById(id);
    if (!existing) throwError("Class not found", 404);

    if (
      (data.name && data.name !== existing.name) ||
      (data.section && data.section !== existing.section)
    ) {
      const dupExists = await classRepository.exists({
        name: data.name || existing.name,
        section: data.section || existing.section,
        session: existing.session,
        _id: { $ne: id },
      });
      if (dupExists)
        throwError("Another class with same name & section exists", 409);
    }

    const updated = await classRepository.updateById(id, data);

    if (data.name || data.section) {
      const newName = `${data.name || existing.name}-${data.section || existing.section}`;
      await User.updateOne(
        { linkedClass: id, role: "class" },
        { $set: { name: newName } },
      );
    }

    await createAuditLog({
      user,
      action: "UPDATE",
      module: "Class",
      description: `Updated class ${updated.name} - ${updated.section}`,
      resourceId: id,
      resourceType: "Class",
      before: existing,
      after: updated,
      req,
    });

    return updated;
  }

  async delete(id, user, req) {
    const cls = await classRepository.findById(id);
    if (!cls) throwError("Class not found", 404);

    const studentCount = await studentRepository.count({ class: id });
    if (studentCount > 0) {
      throwError(
        `Cannot delete class. It has ${studentCount} student(s). Archive instead.`,
        409,
      );
    }

    await classRepository.deleteById(id);
    await User.deleteOne({ linkedClass: id, role: "class" });

    await createAuditLog({
      user,
      action: "DELETE",
      module: "Class",
      description: `Deleted class ${cls.name} - ${cls.section}`,
      resourceId: id,
      resourceType: "Class",
      before: cls,
      req,
    });

    return true;
  }

  async resetClassPassword(classId, newPin, adminUser, req) {
    const cls = await classRepository.findById(classId);
    if (!cls) throwError("Class not found", 404);

    if (!/^\d{5}$/.test(String(newPin || ""))) {
      throwError("Class PIN must be exactly 5 digits (0-9).", 400);
    }

    const classUser = await User.findOne({
      linkedClass: classId,
      role: "class",
    });
    if (!classUser) throwError("No login account found for this class", 404);

    classUser.password = await hashPassword(String(newPin));
    classUser.passwordChangedAt = new Date();
    await classUser.save();

    await createAuditLog({
      user: adminUser,
      action: "UPDATE",
      module: "Class",
      description: `PIN reset for class ${cls.name}-${cls.section}`,
      resourceId: classId,
      resourceType: "Class",
      req,
    });

    return true;
  }

  async archive(id, isArchived, user, req) {
    const cls = await classRepository.findById(id);
    if (!cls) throwError("Class not found", 404);

    const updated = await classRepository.updateById(id, { isArchived });

    await User.updateOne(
      { linkedClass: id, role: "class" },
      { $set: { isActive: !isArchived } },
    );

    await createAuditLog({
      user,
      action: "UPDATE",
      module: "Class",
      description: `${isArchived ? "Archived" : "Unarchived"} class ${cls.name} - ${cls.section}`,
      resourceId: id,
      resourceType: "Class",
      req,
    });

    return updated;
  }
}

module.exports = new ClassService();
