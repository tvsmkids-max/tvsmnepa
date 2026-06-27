"use strict";

const classRepository = require("../repositories/class.repository");
const studentRepository = require("../repositories/student.repository");
const Settings = require("../models/Settings.model");
const { createAuditLog } = require("../middlewares/audit.middleware");

const throwError = (message, statusCode = 400) => {
  throw Object.assign(new Error(message), { statusCode });
};

class ClassService {
  async list(query, user) {
    const { page, limit, sort, ...filterParams } = query;

    const filter = { ...filterParams };
    if (filter.isArchived === undefined) filter.isArchived = false;

    // ─── For TEACHERS: Get their assigned classes ───
    if (user && user.role === "teacher") {
      const Teacher = require("../models/Teacher.model");
      const teacher = await Teacher.findOne({ user: user._id }).lean();

      if (
        !teacher ||
        !teacher.assignedClasses ||
        teacher.assignedClasses.length === 0
      ) {
        return {
          data: [],
          pagination: { page: 1, limit: 0, total: 0, totalPages: 0 },
        };
      }

      filter._id = { $in: teacher.assignedClasses };
    } else {
      // ─── For ADMIN ───
      // If 'all' flag is true, skip session filter (used in promotions)
      if (!filter.session && !filter.all) {
        const settings = await Settings.getSettings();
        if (settings?.activeSession) {
          filter.session = settings.activeSession;
        }
      }
      // Remove 'all' from filter — it's not a DB field
      delete filter.all;
    }

    const result = await classRepository.findAll(filter, {
      page,
      limit,
      sort,
      populate: [
        { path: "classTeacher", select: "name employeeId email mobile" },
        { path: "assignedTeachers", select: "name employeeId" },
        { path: "session", select: "name" },
      ],
    });

    // Add student count efficiently with aggregation
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

  async getById(id) {
    const cls = await classRepository.findById(id, [
      { path: "classTeacher", select: "name employeeId email mobile" },
      { path: "assignedTeachers", select: "name employeeId email" },
      { path: "session", select: "name startDate endDate" },
      { path: "createdBy", select: "name" },
    ]);

    if (!cls) throwError("Class not found", 404);

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

    if (data.assignedTeachers?.length > 0) {
      const Teacher = require("../models/Teacher.model");
      await Teacher.updateMany(
        { _id: { $in: data.assignedTeachers } },
        { $addToSet: { assignedClasses: cls._id } },
      );
    }

    await createAuditLog({
      user,
      action: "CREATE",
      module: "Class",
      description: `Created class ${cls.name} - ${cls.section}`,
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

    const Teacher = require("../models/Teacher.model");
    await Teacher.updateMany(
      { assignedClasses: id },
      { $pull: { assignedClasses: id } },
    );

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

  async archive(id, isArchived, user, req) {
    const cls = await classRepository.findById(id);
    if (!cls) throwError("Class not found", 404);

    const updated = await classRepository.updateById(id, { isArchived });

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
